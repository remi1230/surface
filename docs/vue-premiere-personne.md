# Vue à la première personne — parcourir le maillage

Note de conception, puis compte rendu de ce qui a été construit.
Objectif : évaluer ce qu'il est possible de faire, ce que ça apporte, et comment
l'insérer dans la boucle existante sans casser le mode 100 % GPU.

> **État au 26/07/2026** — les phases 0 à 3 de la feuille de route (§10) sont
> implémentées et vérifiées dans un navigateur : sonde GPU, marche libre à
> vitesse métrique, saut, autopilote, bouclage/rebond aux bords, rig prêt pour la
> VR. Mesures et écarts au plan : §12. Deux défauts remontés à l'usage et leurs
> corrections (saccades, retournement de la vue) : §13. Le mode vidéo plein écran
> avec boucle parfaite sur rail : §14. Restent ouvertes les phases 4 à 6
> (avatar-shader, trace, mini-carte, HUD de courbure, WebXR) et les pistes B/C.

---

## 1. Le verrou technique, et où est réellement la clé

L'intuition de départ — « on n'a pas les points, donc utilisons `eqPos` pour
calculer le point suivant » — est la bonne stratégie (réutiliser le GLSL déjà
écrit plutôt que de dupliquer les équations en JS), mais appliquée au mauvais
étage du pipeline.

`eqPos(u, v)` (`GPUShaderMesh.js:1045`) ne renvoie que la position paramétrique
**pure**. Son propre commentaire le dit : « sans blender, symétrie ni
déformation ». Concrètement, la chaîne réelle d'un sommet est
(`createVertexShader`, `GPUShaderMesh.js:895-957`) :

```
(i, j) → (u, v)
  ├─ 1. _effectivePositionGLSL()   ← équations OU code brut de l'éditeur de maillage
  ├─ 2. blender (rotations en u et en O)          } computePosition()
  ├─ 3. applySymmetry()             ← copies symétrisées, uSymOrder, uSymCenter
  ├─ 4. normale par différences finies (3 appels à computePosition)
  ├─ 5. rotation utilisateur de la normale (Alpha / Beta)
  ├─ 6. applyNormDeformation()      ← ondes des sliders Norm/n
  ├─ 7. computeDeformation() × scaleNorm  ← déformation le long de la normale
  └─ 8. × world  (mesh.scaling / rotation / position de meshTransformations)
```

`eqPos` s'arrête **avant l'étape 2**. Marcher sur `eqPos`, c'est marcher sur un
fantôme de la surface : décollé du maillage visible dès qu'un blender, une
symétrie ou une déformation est active — exactement ce qu'on veut éviter, puisque
l'objectif énoncé est de parcourir « le mesh sous sa forme finale ».

**La clé est déjà dans le dépôt.** `extractPositionsForExport()`
(`GPUShaderMesh.js:1975-2100`) recompile le vertex shader complet dans un
contexte WebGL2 secondaire (`GPUShaderMeshComputer.gl`, ligne 28) et récupère
`vPosition` + `vNormal` par **transform feedback**. C'est exactement l'oracle
dont a besoin le personnage : la vérité géométrique, étapes 1 à 7 comprises, avec
une seule source de vérité (le shader lui-même). Aujourd'hui c'est un one-shot
sur tout le maillage pour l'export STL/OBJ.

**La proposition centrale : en faire une sonde par frame sur ~16 sommets au lieu
de 17 000.**

---

## 2. Architecture : la sonde GPU

```
probePoints(list) → Float32Array positions + normales
```

Un seul ajout à `ShaderMeshBase`, qui réutilise `_setTFUniforms()`
(`GPUShaderMesh.js:2136`) tel quel :

1. Programme de transform feedback **mis en cache, clé = la source du vertex
   shader**. Invalidation automatique et gratuite : `create()`,
   `updateDeformationExpression()`, `updateNormDeformGLSL()`, la compilation de
   l'éditeur de géométrie produisent une source différente, donc une nouvelle
   entrée. Aucun hook à maintenir.
2. Par frame : upload des uniformes qui bougent (`t`, `A`–`M`, blender, norm…),
   `drawArrays(POINTS, 0, n)` avec `n ≈ 16`, `getBufferSubData`.
3. Le contexte est **séparé de celui de Babylon** : la lecture synchrone ne bloque
   pas le pipeline de rendu principal. C'est le gros avantage de la structure
   existante.

Coût attendu : ~16 sommets × 3 évaluations de `computePosition` = négligeable en
calcul ; le seul vrai coût est l'aller-retour driver du `getBufferSubData`
(estimation 0,1–0,5 ms). **À mesurer avant tout le reste.** Si ça dépasse ~1 ms,
la parade standard est `fenceSync` + `clientWaitSync(0)` et lecture de la frame
N-1 : 16 ms de retard caméra, imperceptible pour un personnage qui marche.

### Ce qu'on sonde exactement

Les sommets sont indexés par `aIndex = (i, j)` et l'attribut `position` porte
l'identifiant de copie symétrisée `(sx, sy, sz)`. Le shader fait
`u = uMinU + i·uStepU`, donc on peut passer un `i` **fractionnaire** pour
échantillonner entre les sommets.

Attention cependant : `computePosition` dérive `d`, `k`, `p`, `w`, `n` de
`mod(i, 2.0)`. Avec un `i` fractionnaire, `mod(i,2.0) == 0.0` n'est
quasiment jamais vrai — la branche « impaire » est prise en permanence, et pour
les équations qui exploitent ces variables de parité, le point sondé ne
correspondra pas à la géométrie affichée. (Peu fréquent : 3 occurrences dans
`forms.js`, mais l'éditeur de géométrie permet tout.)

**Donc on ne sonde jamais en fractionnaire.** On sonde des **sommets entiers** et
on interpole entre eux — vrai pour *toutes* les équations, y compris le code GLSL
brut de l'éditeur de maillage. En pratique une plaque **4×4** autour du joueur,
interpolée par un patch **bicubique Catmull-Rom** : il passe exactement par les
sommets réels et sa dérivée est continue d'une cellule à l'autre. Un patch
bilinéaire suffirait pour la position, mais pas pour le repère — c'est la cause
des saccades, voir §13.

---

## 3. Se déplacer : trois niveaux, du plus sûr au plus riche

L'état du personnage vit en **espace paramétrique `(u, v)`**, pas en indices
`(i, j)` — sinon un changement de résolution (`u`/`j` au clavier) téléporte le
joueur. On dérive `(fi, fj) = ((u−uMinU)/uStepU, (v−uMinV)/uStepV)` à chaque
frame.

### Niveau 1 — verrouillé sur la grille (« le point suivant »)
Exactement l'idée initiale. Les flèches déplacent `(i, j)` d'un cran, on
interpole le déplacement dans le temps pour que ce soit fluide. Robuste
absolument partout, y compris sur les équations à parité. C'est le mode de
repli sûr.

### Niveau 2 — libre, par interpolation bilinéaire
`(u, v)` continu, position = interpolation bilinéaire des 4 coins sondés (ou
barycentrique sur le bon des deux triangles, pour coller au pixel près à la
géométrie rendue). C'est le mode par défaut visé.

**Le point crucial : la vitesse doit être métrique, pas paramétrique.** Ces
surfaces ont des paramétrisations violemment non uniformes (pôles d'une sphère,
zones étirées d'une bouteille de Klein). Un pas constant en `u` donne une vitesse
qui varie d'un facteur 100 selon l'endroit. On calcule donc les tangentes
`∂P/∂u`, `∂P/∂v` depuis les coins sondés, puis :

```
pas en u = (vitesse voulue en unités monde) / |∂P/∂u|
```

C'est-à-dire qu'on marche à vitesse constante *sur la surface*. Sans ça, le
déplacement est inutilisable. Il faut aussi borner le dénominateur : aux pôles
`|∂P/∂v| → 0` et la métrique dégénère.

### Niveau 3 — géodésique
Les flèches ne suivent plus les lignes de paramètre : « tout droit » veut dire
transport parallèle de la direction sur la surface. Deux fois rien à implémenter
en plus une fois qu'on a la métrique (on a déjà les tangentes ; il faut les
symboles de Christoffel, obtenables par différences finies sur la plaque 4×4).

C'est là que la fonctionnalité arrête d'être un gadget — voir §7.

---

## 4. Le saut et la gravité

Question moins anodine qu'elle en a l'air : sur une bouteille de Klein, « le
bas », c'est quoi ?

**Gravité alignée sur la normale (défaut recommandé).** Le personnage est
aimanté à la surface, style *Super Mario Galaxy*. Le saut n'agit que sur une
variable scalaire `hauteurAuDessusDeLaSurface` ; le mouvement tangentiel continue
par inertie. On retombe toujours, ça marche à l'envers, dans les surplombs, dans
les zones auto-intersectantes. Coût : zéro sonde en plus. Ce n'est pas un arc
balistique exact, mais visuellement ça lit comme un saut.

**Gravité monde (`−Y`), en option.** Pertinente quand la forme se comporte comme
un terrain. Le saut devient un vrai arc balistique, et l'atterrissage demande une
intersection rayon/triangles — faisable sur la plaque 4×4 déjà sondée tant qu'on
retombe près du point de décollage. Un long saut qui atterrit ailleurs
nécessiterait d'élargir la sonde. À garder pour une phase ultérieure.

---

## 5. La caméra, et pourquoi la VR devient presque gratuite

**Ne pas déplacer la caméra. Déplacer un rig.**

```
TransformNode "walkRig"        ← position = point sondé + h·normale, orientation = repère tangent
   └─ UniversalCamera "walkCam"  ← pose locale (souris, ou casque en VR)
```

Une caméra bougée directement est un cul-de-sac pour la VR : en WebXR, la pose de
la caméra **appartient au casque**, on n'y écrit pas. Le seul point d'insertion,
c'est le nœud parent. Si le rig existe dès le premier jour, passer en VR revient
à brancher `scene.createDefaultXRExperienceAsync()` sur ce même nœud. Si on
bricole la caméra directement, il faudra tout refaire.

L'infrastructure de bascule existe déjà et est propre : `glo.cameraMode`,
`glo.orbitCamera` / `glo.travCamera`, `startTravelling()` / `stopTravelling()`
(`bab.js:98-138`). On ajoute `'walk'` au même endroit, avec le même
`detachControl` / `activeCamera`.

Détails caméra qui comptent :
- `minZ` doit descendre à ~0,01·échelle (le travelling le fait déjà,
  `bab.js:72`) — sinon la surface est clippée dès qu'on s'en approche.
- **Lissage temporel du repère obligatoire.** La surface se déforme dans le temps
  sous les pieds du joueur : si l'orientation est recalculée brutalement à chaque
  frame, la caméra vibre. Position suivie exactement, orientation filtrée
  passe-bas avec un réglage « stabilisation ». Aux pôles, on lisse le vecteur
  *up* dans le temps plutôt que de le recalculer.
- La normale de la caméra vaut mieux être celle de la **cellule** (produit
  vectoriel des diagonales des 4 coins) que celle du shader
  (`eps = 0.001`, `_setTFUniforms`) : plus stable, et elle correspond à la facette
  qu'on voit.

### Confort VR — à concevoir maintenant, pas après
Marcher sur une surface qui se déforme, avec une orientation qui peut basculer à
l'envers, c'est une machine à nausée. Les garde-fous ne sont pas optionnels :
figer ou ralentir le temps pendant la marche, vignettage au déplacement,
locomotion par téléportation en alternative au déplacement continu, rotation par
crans, horizon accroché au plan tangent lissé. Aucun de ces points ne se rajoute
proprement après coup.

---

## 6. Intégration dans la boucle existante

Rien de tout ça ne touche le chemin de rendu. Points d'accroche :

| Où | Quoi |
|---|---|
| `bab.js:213` `registerBeforeRender` | `if (glo.cameraMode === 'walk') { updateWalk(); return; }` — même forme que le branchement travelling existant |
| `bab.js` `Player.prototype` | `_initWalkRig()` à côté de `_initTravellingCamera()` |
| `glo.js` | `glo.walk = { u, v, dir, height, vSpeed, copy, keys, … }` |
| `events.js:374` registre | une entrée pour basculer en mode marche |
| `js/walk.js` (nouveau) | logique de déplacement + sonde ; un `<script>` de plus dans `index.html` |
| `GPUShaderMesh.js` | `probePoints()` + cache de programme, à côté de `extractPositionsForExport()` |

Deux points d'attention sur l'existant :

**Le clavier est en `keydown` seul** (`events.js:422`), et le handler `return` dès
qu'il matche. Pour un déplacement il faut un état de touches maintenues : un
`keyup` + un `Set` alimenté uniquement en mode marche. Les flèches sont
aujourd'hui consommées par `ArcRotateCameraKeyboardMoveInput` — pas de conflit
puisqu'on fait `detachControl` sur la caméra orbite, comme le travelling.

**`glo.ribbon` est détruit et recréé à chaque rebuild** (`ribbonDispose()`,
`ribbon.js:50`). Donc : pas de rig parenté au mesh, et l'état de marche vit dans
`glo` — c'est exactement le précédent déjà établi pour `_positionEditorCode`
(commentaire `GPUShaderMesh.js:271`, « lu depuis le global pour survivre aux
reconstructions »). Après chaque rebuild : re-sonder, re-déposer le joueur.

---

## 7. Détails pratiques

**Forme finale, transformations comprises.** La sonde renvoie `vPosition` en
espace objet (`_setTFUniforms` force `world` et `worldViewProjection` à
l'identité). `meshTransformations` (scaling / rotation / position) vit au niveau du
nœud Babylon (`transformMesh`, `ribbon.js:550`). Il faut donc appliquer
`glo.ribbon.getWorldMatrix()` au point sondé. Pour la normale : plutôt que de
sortir la transposée de l'inverse, on transforme les **deux tangentes** et on
refait le produit vectoriel — juste sous n'importe quelle transformation affine,
scaling non uniforme compris.

**Coloration.** Elle vient gratuitement : le fragment shader est intact, et
l'observer de `create()` (`GPUShaderMesh.js:1262-1267`) pousse déjà
`cameraPosition` depuis `scene.activeCamera` à chaque frame. Le shader couleur et
l'éclairage réagissent donc à la caméra de marche sans une ligne de code.
`backFaceCulling = false` + `DoubleSide` (lignes 1273-1274) fait qu'on voit la
surface même par-dessous : c'est ce qu'on veut en vue subjective.

**Échelle du personnage.** Question pratique déterminante : les formes vont de
±π à ±60 unités. La même hauteur d'œil donne « explorer un paysage » ou « ramper
sur une bille ». Défaut proposé : diagonale de la bounding box / 100, exposée
comme un slider logarithmique. À recalculer quand le scaling du mesh change.

**Lampe frontale.** `lampPosition` est un uniforme déjà en place, poussé par
`updateLighting()`. Une option « lampe = caméra » est une ligne et change tout
pour la lisibilité en vue subjective, surtout à l'intérieur d'une forme fermée.

**Bords du domaine.** `u ∈ [min_u, max_u]`. Trois politiques : mur invisible,
bouclage, ou chute. Le bouclage est **détectable automatiquement** : sonder
`P(min_u, v)` et `P(max_u, v)` sur quelques `v` au moment du rebuild et comparer.
4 sondes, une fois — et un tore devient un monde infini au lieu d'un enclos.
Ça vaut largement son coût.

**Copies symétrisées.** Le maillage contient `symCount` copies, chacune avec son
attribut `position`. Le joueur marche sur une copie donnée (index dans l'état), et
la sonde doit passer le même attribut. Plus tard : autoriser le franchissement
d'une copie à l'autre à la couture — traverser la couture d'une forme
symétrisée serait une sensation qu'aucune vue orbitale ne donne.

**Auto-intersections.** Ces surfaces se traversent constamment. En marche
intrinsèque, on passe *à travers* les autres nappes. Ce n'est pas un bug à
corriger : voir la surface passer à travers soi est précisément ce qui fait
comprendre une bouteille de Klein.

**Pôles et dégénérescences.** `normalize(cross(tU, tV))` peut être NaN ; le shader
gère déjà le cas (ligne 923), la sonde côté CPU doit le gérer aussi.

---

## 8. Pertinence : exploration, compréhension, appropriation

C'est la partie qui décide si ça mérite d'être construit. Je pense que oui, et
pour une raison précise.

**Géométrie intrinsèque contre géométrie extrinsèque.** La vue orbitale montre la
surface comme un *objet* : une silhouette, vue du dehors. La marche la donne
comme un *monde*, et rend accessible ce qui est invisible de l'extérieur :

- la **distorsion de la paramétrisation** — une zone qui paraît minuscule vue de
  loin prend un temps fou à traverser, et on le *sent* ;
- la **courbure** — on marche tout droit et on revient à son point de départ, ou
  pas ;
- la **connexité réelle** — deux régions visuellement voisines peuvent être à des
  kilomètres l'une de l'autre sur la surface.

C'est la différence entre regarder une carte et marcher le terrain. Pour un
explorateur de surfaces paramétriques, c'est de l'**information nouvelle**, pas
seulement une caméra de plus.

**L'échelle révèle de la structure.** Une amplitude de déformation qui ressemble à
du bruit vue de loin devient un relief de collines à l'échelle du marcheur. On
découvre des choses qu'on ne peut littéralement pas voir en orbite.

**Le temps devient un phénomène.** La déformation animée, ressentie depuis la
surface, est qualitativement autre : des vagues qui passent sous les pieds.

**Appropriation.** Le mot est bien choisi : la présence crée la propriété. En VR
l'effet est massif.

**Et un usage sous-estimé : c'est un outil de diagnostic.** Marcher révèle les
pathologies de paramétrisation — là où les triangles s'étirent, là où le maillage
dégénère, là où les normales s'inversent. D'où l'idée qui, à mon avis, fait
basculer la fonctionnalité du spectaculaire vers l'utile :

### Le HUD de géométrie intrinsèque
Depuis la plaque 4×4 déjà sondée, on obtient les deux formes fondamentales,
donc : courbure de Gauss et courbure moyenne sous les pieds, distorsion locale
d'aire, orientation de la normale. Affichés en surimpression, avec un mode marche
géodésique face à un mode marche paramétrique. **L'écart entre les deux est la
charge pédagogique de toute la géométrie différentielle**, et suivre une
géodésique sur une forme pour voir où elle atterrit est quelque chose qu'aucune
caméra orbitale n'enseignera jamais.

### La trace
Un fil d'Ariane : la ligne de là où on est passé, stockée en `(u, v)` et
re-évaluée sur GPU chaque frame — donc collée à la surface même en déformation.
Peu coûteux, et énorme pour l'appropriation : on *voit* sa géodésique
s'enrouler autour de la forme.

### La mini-carte, ou : régler le problème de la désorientation
Le défaut structurel de la vue subjective sur une variété tordue, c'est qu'on ne
sait plus du tout où on est. Le remède : une incrustation, dans un coin, de la
**vue orbitale avec un marqueur du personnage**. Babylon le fait nativement
(`camera.viewport` + `scene.activeCameras`). Le coût est réel — le vertex shader
tourne deux fois — mais à 132² c'est absorbable, et le gain en compréhension est
sans commune mesure.

### L'avatar est un shader
Pour marquer le personnage dans la vue orbitale (et projeter une ombre / un cerne
au sol en vue subjective), on rend une petite géométrie avec le **même vertex
shader**, décalée le long de la normale. L'avatar est alors épinglé à la surface
100 % sur GPU, parfaitement synchrone avec la déformation animée, sans que le CPU
ait à savoir où il est. Beau découplage : **avatar exact et gratuit sur GPU,
caméra éventuellement en retard d'une frame, imperceptible.**

---

## 9. Trois pistes différentes, à très bon rapport valeur / effort

Elles ne remplacent pas la marche, elles la complètent — et deux d'entre elles ne
demandent **aucune sonde**.

**A. Le travelling de surface (à faire en premier).** Étendre la caméra de
travelling existante pour qu'elle suive un chemin `(u(t), v(t))` *sur* la surface,
à `surface + h·normale`, regardant vers la tangente. Aucune gestion d'entrées,
aucune physique, aucune collision : ça valide toute la machinerie de sonde à
elle seule. Et comme l'application enregistre déjà en WebM, c'est immédiatement
une fonctionnalité vidéo. Livrable de phase 0 idéal.

**B. Le mode intérieur / spéléologie.** Beaucoup de ces formes sont fermées et
creuses. Une caméra libre à l'intérieur, avec lampe frontale et `minZ` bas, c'est
une expérience entièrement différente pour un coût dérisoire : `UniversalCamera`
+ deux uniformes. Zéro sonde. Probablement le meilleur rapport
valeur/effort du lot.

**C. Le mode maquette.** Se tenir *à côté* de la forme à taille humaine, sur un
sol virtuel, et en faire le tour à pied. Rien à sonder non plus. Ça répond à une
autre question que la marche sur la surface — la silhouette d'ensemble, la
*taille* — et en VR c'est saisissant.

---

## 10. Feuille de route proposée

| Phase | Contenu | Risque |
|---|---|---|
| **0** | Mesurer `probePoints()` : un point, chronométrer le `getBufferSubData`. **Tout le reste en dépend.** | — |
| **1** | Travelling de surface (piste A). Valide la sonde sans entrées ni physique. | faible |
| **2** | Rig + caméra de marche + mode `'walk'` + touches maintenues. Niveau 1 (verrouillé sur la grille), saut intrinsèque. | faible |
| **3** | Déplacement libre bilinéaire, vitesse métrique, lissage du repère, détection de bouclage du domaine, échelle du personnage. | moyen |
| **4** | Avatar-shader, trace, mini-carte orbitale, lampe frontale. | faible |
| **5** | Marche géodésique + HUD de courbure. | moyen |
| **6** | WebXR sur le rig, garde-fous de confort, plafond de résolution en VR. | moyen |
| **bonus** | Modes intérieur et maquette (pistes B et C) — insérables n'importe quand, indépendants. | faible |

Phases 0 à 3 faites (la 1 est arrivée sous forme d'autopilote de la phase 2
plutôt qu'en préalable : une fois le marcheur écrit, le travelling n'est qu'un
marcheur dont les entrées sont scriptées, donc quelques lignes au lieu d'un
module). Phases 4 à 6 ouvertes.

## 11. Ce qui a été construit

| Fichier | Rôle |
|---|---|
| `js/GPUShaderMesh.js` | `probePoints()` + cache de programme et de buffers, à côté de `extractPositionsForExport()` ; `cameraPosition` passe en position monde |
| `js/walk.js` (nouveau) | échantillonnage de surface, relevé initial, marche, saut, autopilote, entrées, HUD |
| `js/glo.js` | `glo.walk`, l'état qui survit aux `ribbonDispose()` |
| `js/bab.js` | `initWalkRig()`, `cameraWorldPosition()`, branchement `'walk'` dans la boucle |
| `js/events.js` | `w` / `Shift+W`, et priorité clavier à la marche |

Commandes : `w` marche, `Shift+W` autopilote, flèches, espace pour sauter, souris
pour regarder, `X` change de face, `PgUp`/`PgDn` la vitesse, `Échap` sort.

## 12. Mesures, et les trois écarts au plan

Vérifié dans Chromium (rendu logiciel SwiftShader, donc pire cas).

**La sonde est exacte.** 564 sommets répartis sur toute la grille, comparés à la
sortie de `extractPositionsForExport()` : écart maximal **0**, au bit près, horloge
en marche comme figée. La sonde voit bien la déformation (le point bouge de 0,030
quand on la coupe) et la symétrie (5,42 d'écart entre deux copies).

**Le coût est par appel, pas par point.** 4 points : 0,68 ms. 144 points :
0,73 ms. Tout le coût est l'aller-retour de `getBufferSubData` ; les sommets sont
gratuits. Conséquence directe pour la suite : **il ne faut pas être avare**. Le HUD
de courbure, le look-ahead, la plaque élargie pour lisser la normale — tout cela
tient dans le même appel sans rien coûter. En revanche, il ne faut jamais faire
deux appels dans une frame. 0,68 ms sur un rasteriseur logiciel, c'est 4 % du
budget d'une frame à 60 fps ; ce sera moins sur GPU réel, mais la piste
`fenceSync` reste ouverte si ça se voit.

**Le personnage colle à la surface à 0,8 % près.** Écart entre la position du rig
et la surface évaluée dans le même tick, en marche, sur une surface animée
(`.35cos(3u+2t)cos(3v)`) : 0,8 % de la hauteur d'œil. Le résidu est le retard du
filtre de normale — voulu. Attention au piège de mesure : comparer le rig d'une
frame à la surface évaluée 100 ms plus tard donne 81 % d'écart, qui ne sont que
le déplacement de la surface dans l'intervalle, pas une erreur.

Trois choses ne se sont pas passées comme prévu :

1. **La détection de bouclage est plus fine que je ne l'avais décrite.** Elle teste
   la géométrie finale, pas l'équation : un tore est bien détecté fermé en u et v,
   mais dès qu'on active un blender en u, il cesse de l'être — les deux bords ne
   coïncident plus une fois tournés. C'est le bon comportement, et ça n'aurait pas
   marché en raisonnant sur l'équation.
2. **Un bord non fermé laissait le personnage coincé face au vide.** Le plan disait
   « mur invisible » ; en pratique c'est inutilisable, on reste bloqué à pousser
   contre la limite. Remplacé par un rebond : la direction est réfléchie par
   rapport à la ligne de paramètre bloquée, et on repart vers l'intérieur.
3. **`cameraPosition` était faux pour toute caméra parentée.** `camera.position`
   est local ; le rig étant un parent, l'uniforme lu par les shaders couleur serait
   resté à (0,0,0), cassant l'éclairage et le spéculaire en vue subjective. Corrigé
   pour tous les modes via `cameraWorldPosition()`.

Non régressé (vérifié) : travelling `c`, espace qui met en pause hors marche,
export STL/OBJ cohabitant avec la sonde persistante, invalidation du cache de
programme à la recompilation.

## 13. Deux défauts remontés à l'usage, et ce qu'ils ont révélé

### Saccades sur toute forme sauf le plan

Reproduit et quantifié : sur une sphère, l'accélération maximale par frame vaut
0,0192 / 0,0050 / 0,0028 pour 32 / 128 / 256 pas — soit exactement le
∝ 1/résolution décrit. Deux causes qui s'additionnaient :

1. **Le patch bilinéaire n'est que C0.** Sa dérivée saute à chaque frontière de
   cellule, donc le repère tangent — et la caméra avec lui — se décale d'un cran
   à chaque cellule franchie, d'une amplitude proportionnelle à la taille de la
   cellule. Le plan y échappait parce qu'un patch bilinéaire y est exact.
2. **Le lissage de la normale était calculé puis jeté.** `walkUpdate` remplissait
   `smoothNormal`, mais la pose du rig repartait de la normale brute recalculée
   depuis les tangentes monde ; le filtre ne servait que de repli. Le garde-fou
   annoncé comme « prérequis » au §5 n'était donc jamais en service.

Corrigé en passant à un **patch bicubique Catmull-Rom sur 4×4 sommets**, C1 par
construction et passant toujours exactement par les sommets réels, et en
utilisant réellement la normale lissée pour la pose. C'est ici que la mesure du
§12 a payé : 16 sondes coûtent le même prix que 4. Résultat :

| pas | avant | après |
|---|---|---|
| 32 | 0,01919 | 0,00021 |
| 128 | 0,00499 | 0,00021 |
| 256 | 0,00284 | 0,00022 |

Et surtout, **la dépendance à la résolution a disparu**. Le résidu est la réponse
du filtre, pas du facettage. Entre deux sommets le personnage suit désormais une
courbe lisse plutôt que la facette plate ; l'écart est plus petit que celui de la
facette à la vraie surface, et invisible à hauteur d'œil.

### Retournement vertical de la vue en visée plongeante

Trois mécanismes pouvaient le produire, tous supprimés :

1. **`upVector` fixe sur la caméra.** La matrice de vue était construite par
   `LookAtLH(position, cible, up)` avec `up` figé sur le +Y local du rig. En
   piquant vers la surface, la direction de visée s'aligne sur cet axe et la base
   bascule. Corrigé par `updateUpVectorFromRotation = true`, qui dérive le haut
   de la rotation de la caméra. Vérifié sur toute la plage : `|up · forward| = 0`
   exactement, zéro inversion sur 347 frames.
2. **Angles d'Euler pour le rig.** La décomposition d'Euler de Babylon perd le
   roulis quand l'axe avant s'aligne sur le Y monde — ce qu'un marcheur sur une
   surface horizontale atteint simplement en se tournant. Le rig est passé au
   quaternion, construit directement depuis la base.
3. **Signe de la normale non continu.** `cross(Tu, Tv)` s'inverse là où la
   paramétrisation s'inverse : à une couture, sur une cellule dégénérée, et une
   fois par tour sur un ruban de Möbius. Sans amortissement, la vue se retourne
   d'un coup. La normale suit maintenant le côté de la frame précédente, ce qui
   fait rouler le personnage progressivement — et reste la réponse honnête sur une
   surface non orientable : après un tour complet, on est bel et bien dessous.

**Honnêteté sur ce point** : je n'ai pas réussi à reproduire le retournement
exact — ni par balayage de pitch, ni par rotation complète, ni sur plan, caténoïde,
sphère ou Möbius. J'ai corrigé les trois mécanismes capables de le produire et
vérifié la stabilité sur toute la plage, mais l'observation reste à confirmer côté
utilisateur.

Effet de bord corrigé au passage : le choix du côté à l'entrée comparait la
normale au vecteur vers le centroïde — dégénéré sur toute forme plate, puisque le
centroïde d'un plan est *dans* le plan, donc le côté était tiré à pile ou face.
On atterrit maintenant du côté qu'on regardait depuis la caméra orbitale.

Autre conséquence du passage en espace monde : la vitesse de marche est désormais
métrique dans les unités affichées, donc un scaling non uniforme du mesh est pris
en compte exactement, ce qui n'était pas le cas avant.

## 14. Mode vidéo plein écran

`Shift+F` en marche lance une prise. La vue passe en plein écran, tous les
calques s'effacent, et **l'image entière** est capturée — contrairement à la
prise orbitale qui recadre le carré centré de `videoBoxRange`. Le WebM se
télécharge à la fin.

Le pipeline vidéo existant n'a pas été dupliqué : `createMeshRecorder` accepte
désormais `{ bounds, hardwareScaling, filePrefix }`, ses valeurs par défaut
reproduisant exactement le comportement antérieur (vérifié : la prise orbitale
double toujours la résolution, ancre toujours la GUI, et produit toujours un
`mesh-*.webm`).

**Une différence assumée** : la prise plein écran garde `hardwareScaling` à 1 là
où la prise orbitale le met à 1/2. Doubler la résolution se justifie quand on
jette l'essentiel de l'image au recadrage ; en plein écran chaque pixel est déjà
conservé, et doubler quadruplerait le coût fragment pour rien.

### La boucle parfaite, version marche

L'équivalent du mode boucle par rotation. Une géodésique ne revient presque
jamais à son point de départ, donc elle ne peut pas boucler. La prise met donc le
personnage sur un **rail** : une ligne de paramètre parcourue à vitesse monde
constante, arrêtée après exactement une période. Sur une direction fermée on
retombe au point de départ, même position et même cap — la dernière image
raccorde la première.

Deux détails qui font que ça marche vraiment :

- le dernier pas est tronqué pour atterrir *exactement* sur la cible, comme le
  fait `rotateCamera` pour la rotation : la boucle ferme sur le paramètre, pas sur
  le nombre d'images, donc une image perdue ne rallonge pas le tour ;
- la prise s'arrête *avant* de rendre la pose finale, qui est identique à la
  première : l'enregistrer produirait une image en double, visible comme un
  hoquet à la relecture.

Mesuré sur un tore : dérive entre la première et la dernière image enregistrée =
0,4206, pour un pas inter-image de 0,4108. La dérive vaut donc une inter-image —
c'est exactement ce qu'exige une boucle sans couture. Durée visée ~24 s
(`WALK.CINEMA_LAP_SECONDS`), la vitesse étant déduite de la longueur du chemin
réellement mesurée par la sonde.

### Ce que la boucle ne promet pas

Le rail ferme le *chemin*, pas la *forme*. Si la surface se déforme dans le
temps, elle a avancé à la fin du tour et le clip saute quand même à la reprise —
même limite que le mode boucle orbital existant. Le badge le dit pendant la
prise ; `glo.walkCinema.freezeTime = true` gèle l'horloge pour obtenir une boucle
réellement sans couture, au prix de l'animation.

**La détection de dépendance au temps est mesurée, pas analysée.** Chercher un
`t` dans les équations ne peut pas marcher ici : la multiplication implicite fait
que `2t` n'a pas de séparateur devant, `cut` s'expanse en `cos(u)*t`, et
l'éditeur de géométrie autorise du GLSL arbitraire. Pire, `sqrt(v)` s'expanse en
`sin(qrt)*(v)` — qui contient réellement `t`, donc une équation d'apparence
statique peut dépendre du temps pour de bon. On décale donc l'horloge d'une
seconde et on re-sonde : si les points bougent, la surface dépend du temps. Deux
appels de sonde, une fois par prise, et aucune notation ne peut tromper le test.
7 cas sur 7 corrects, dont trois que la version par regex ratait.

### Deux défauts trouvés par la capture, pas par les tests

1. `switchGrid(false)` accède directement à `glo.axisX`, qui n'existe pas tant que
   la grille n'a jamais été construite. L'exception laissait l'interface à moitié
   démontée, GUI cachée sans possibilité de la récupérer. L'appel est désormais
   conditionné à `glo.gridVisible`, et toute l'entrée est atomique : le moindre
   throw déclenche le démontage normal.
2. Le badge REC était attaché à `document.body` — invisible en plein écran, où
   seul l'élément fullscreen et ses descendants sont rendus. Les calques sont
   maintenant enfants de `#univers_div`.

Vérifié que le badge ne finit pas dans la vidéo : en reproduisant le `drawImage`
du recorder au bon moment (dans `onAfterRenderObservable`, pendant que le buffer
de dessin est encore valide), le pixel sous le badge vaut exactement la couleur
de fond.

## 15. Limites à assumer

- Les équations qui exploitent les variables de parité (`d`, `k`, `p`, `w`, `n`)
  n'ont pas de surface bien définie *entre* les sommets. On reste donc sur les
  coins entiers + interpolation : c'est correct partout, mais ça veut dire que le
  « lisse » vient du quad, pas de l'équation.
- Un changement d'équation ou de domaine `u`/`v` relocalise réellement le joueur.
  Un changement de résolution seul, non (état stocké en `(u, v)`).
- Le coût VR est à surveiller : stéréo × 72–120 Hz × un vertex shader qui appelle
  `computePosition` trois fois par sommet, avec déformation par-dessus. Il faudra
  probablement un plafond de résolution dédié.
- La stabilité de la caméra sur une surface à déformation haute fréquence est le
  vrai risque d'expérience utilisateur, pas la performance. Le filtre de repère
  n'est pas une finition, c'est un prérequis.
- Le saut utilise une intégration d'Euler semi-implicite : à bas framerate,
  l'apogée est sous-estimée (mesuré 0,43 hauteur d'œil au lieu de 0,55 à ~10 fps).
  Stable, atterrit toujours, mais pas exact.
- Le personnage ne marche que sur la copie symétrisée nº 0. Passer d'une copie à
  l'autre à la couture reste à faire (`probePoints` accepte déjà l'identifiant de
  copie, c'est la logique de franchissement qui manque).
- Changer d'équation ou de domaine pendant qu'on marche relocalise réellement le
  personnage ; il est simplement redéposé au même (u, v). Un changement de
  résolution seul, non.

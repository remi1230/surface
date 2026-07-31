# Un jeu de tir sur la surface — note de conception

Suite de `vue-premiere-personne.md`. Objectif : évaluer l'idée d'un jeu où les
personnages sont des triangles qui tirent des balles, et où **tout ce qui bouge
se déplace comme l'avatar** — même intégrateur, même gravité, même sonde.

> **État au 28/07/2026** — **feuille de route terminée** (phases 1 à 6), chaque
> phase mesurée (§13, §14, §15). Le verrou du §3 est levé : un seul appel de
> sonde par frame, 200 agents au prix d'un. Les balles volent sur des
> géodésiques, les collisions, les ennemis et les manches sont là. La marche
> reste bit-identique à l'avant-refactor, jeu éteint. Ce qui reste ouvert est
> listé au §16 ; un défaut de visibilité remonté à l'usage et sa correction sont
> au §17.

---

## 1. Le principe, et pourquoi il tient

L'idée directrice : il n'y a pas « le joueur » d'un côté et « les objets » de
l'autre. Il y a **un seul type d'entité** — un point qui vit en `(u, v)`, porte
un cap tangent, une hauteur au-dessus de la surface et une vitesse verticale —
et le joueur est simplement celui auquel on a accroché une caméra.

C'est juste, et pas seulement par élégance. `walkUpdate()` (`js/walk.js:580`)
*est déjà* cet intégrateur. Il est écrit comme un singleton sur `glo.walk`, mais
son corps ne contient rien de spécifique à un joueur :

| Étage | Lignes | Spécifique au joueur ? |
|---|---|---|
| Évaluation de la surface (patch 4×4 bicubique) | `walk.js:199` | non |
| Repère monde + continuité du côté de la normale | `walk.js:590-623` | non |
| Pas métrique : déplacement monde → `(du, dv)` | `walk.js:704-731` | non |
| Bords du domaine : bouclage, couture torsadée, rebond | `walk.js:733-776` | non |
| Saut et gravité le long de la normale | `walk.js:778-790` | non |
| Lecture du clavier | `walk.js:643-658` | **oui** |
| Pose du rig et de la caméra | `walk.js:792-828` | **oui** |

Deux blocs sur sept. Le reste est déjà un moteur physique générique pour entité
sur variété paramétrique — il ne le sait pas encore, voilà tout.

Le gain n'est pas la factorisation, il est **sémantique** : une balle tirée tout
droit suit une géodésique, parce que le cap est stocké comme direction monde
reprojetée dans le plan tangent à chaque frame (`walkTangentialize`,
`walk.js:542`) — du transport parallèle discret, gratuit, sans symboles de
Christoffel. Sur une sphère, un tir à plat fait le tour et revient vous frapper
dans le dos. Aucun autre jeu n'a ça, et ici ça ne coûte pas une ligne : c'est
une conséquence de la géométrie, pas une fonctionnalité à écrire.

---

## 2. Ce qui est déjà là

- **La sonde** `probePoints()` (`GPUShaderMesh.js:2274`) : le vertex shader réel
  du maillage, échantillonné par transform feedback à des indices arbitraires.
  Vérifié exact au bit près (`vue-premiere-personne.md` §12). Ses buffers
  **grandissent tout seuls** avec la demande (`GPUShaderMesh.js:2340`) : rien à
  faire pour passer de 16 à 800 points.
- **La gravité normale** (`walk.js:778-790`) : orientée vers la surface, pas vers
  `−Y`. C'est exactement ce qu'il faut ici — sur une bouteille de Klein « le bas »
  n'a pas de sens global, et une balle doit retomber sur le sol qu'elle survole,
  quel que soit son côté.
- **Le pas métrique** (`walk.js:704-731`) : première forme fondamentale `E, F, G`,
  inversion du système. C'est ce qui fait qu'une vitesse est en unités monde et
  non en radians de paramètre. Sans lui, une balle traverserait un pôle en une
  frame et mettrait dix secondes à franchir l'équateur.
- **Les coutures** (`walk.js:733-776`) : bouclage détecté sur la géométrie réelle,
  et coutures torsadées (Möbius, Klein en huit) traitées — franchir la couture
  boucle un paramètre *et* miroite l'autre.
- **Le rig** (`initWalkRig`, `bab.js`) et la bascule de mode
  (`glo.cameraMode === 'walk'`, `bab.js:228-230`).
- **La mini-carte et l'avatar** (`walk.js:980-1174`) : render target 384², une
  frame sur quatre, +20 % de temps frame. Un jeu multi-entités en a besoin, et
  c'est déjà écrit.

Manquent : la multiplicité, les balles, les collisions, l'IA, le rendu des
entités, les règles.

---

## 3. Le verrou : le coût de la sonde est **par appel**, pas par point

C'est la mesure la plus importante du projet, et elle vient de la session
précédente (`vue-premiere-personne.md` §12) :

| Points sondés | Temps |
|---|---|
| 4 | 0,68 ms |
| 144 | 0,73 ms |

Tout le coût est l'aller-retour `getBufferSubData`. Les sommets sont
essentiellement gratuits.

**Conséquence directe, et elle dicte toute l'architecture** : si chaque entité
appelle `walkEvalSurface()` pour son compte, on fait un appel de sonde par
entité. 70 entités × 0,68 ms = **48 ms par frame**. Le jeu est mort avant
d'exister.

Il faut donc **un seul appel de sonde par frame, pour tout le monde**. Ce qui
impose de couper `walkEvalSurface()` (`walk.js:199`) en deux, parce qu'elle fait
aujourd'hui les deux choses dans la même fonction (elle remplit `_walkPatchIdx`
puis appelle `probePoints` ligne 249) :

```
agentsStep(dt)
 ├─ 1. gather   : pour chaque agent, écrire son bloc d'indices
 │                dans un grand Float32Array partagé   → aucun appel GPU
 ├─ 2. probe    : UN SEUL probePoints(tout, total)     → un appel GPU
 └─ 3. resolve  : pour chaque agent, lire sa tranche, construire le patch,
                  intégrer la physique, écrire la pose  → aucun appel GPU
```

Budget réaliste :

| Entité | Points | Pourquoi |
|---|---|---|
| Joueur | 16 (bicubique) | la caméra exige la continuité C1 du repère (§13 de la note FPV) |
| Ennemi | 16 ou 4 | 16 s'il porte une caméra ou une visée fine, 4 sinon |
| Balle | 4 (bilinéaire) | une balle n'a pas de caméra : une saccade de repère y est invisible |

200 entités à 4 points = 816 points, **un appel**. Par extrapolation de la
mesure ci-dessus : ~0,75 ms, sur rasteriseur logiciel. C'est tenable.

Le choix bicubique/bilinéaire devient donc un **axe de LOD** qui tombe tout seul
de l'architecture existante — et c'est le bon axe, parce que la raison d'être du
bicubique (`vue-premiere-personne.md` §13) est purement le confort caméra.

**Ce refactor doit être fait en premier, avant toute mécanique de jeu.** Écrire
les balles d'abord, c'est écrire soixante-dix appels de sonde qu'il faudra
défaire ensuite.

---

## 4. L'agent de surface

```js
{
  u, v,                 // position paramétrique — jamais des indices de grille
  heading,              // Vector3 monde, retangentialisé chaque frame
  height, vSpeed,       // le long de la normale
  flip,                 // côté de la surface
  patch:  'bicubic' | 'bilinear',
  ground: 'stick' | 'bounce' | 'despawn',
  speed, radius, kind, team, owner, ttl, alive,
  node                  // index d'instance fine pour le rendu
}
```

`glo.walk` devient l'agent nº 0 avec `patch: 'bicubic'`, `ground: 'stick'`.
Toute la logique caméra, rail, cinéma et mini-carte reste où elle est : elle lit
l'agent nº 0 après l'intégration, exactement comme `walkUpdate` pose le rig
aujourd'hui aux lignes 792-828.

Découpage de fichiers proposé, dans la continuité de l'existant :

| Fichier | Rôle |
|---|---|
| `js/agents.js` (nouveau) | l'agent, le batch gather/probe/resolve, l'intégrateur partagé |
| `js/game.js` (nouveau) | les règles : spawn, tir, vie, score, manches |
| `js/walk.js` | devient la couche joueur : entrées, rig, caméra, rail, carte |

---

## 5. Les balles : trois écarts au marcheur

L'idée « une balle est un marcheur rapide » est juste à trois détails près, et
les trois sont des pièges réels.

### 5.1 Le plafond de déplacement bloque net

`MAX_CELLS_PER_FRAME = 0.5` (`walk.js:40`, appliqué lignes 723-727) interdit de
franchir plus d'une demi-cellule par frame, parce que le patch n'est
échantillonné qu'autour d'une cellule. Le commentaire dit « à des vitesses
saines ça ne se déclenche jamais » — une balle n'est justement pas à une vitesse
saine. Elle tapera le plafond à chaque frame et **avancera au pas**, ce qui est
le genre de bug qui ressemble à un problème de physique alors que c'est un
clamp.

Trois sorties, à combiner :

- **Plafond par agent.** Le patch 4×4 est en réalité valide sur ±1,5 cellule
  autour du centre : on peut monter à ~1 cellule sans mentir sur la géométrie.
- **Sous-pas.** Découper le déplacement de la frame en `k` pas, en réutilisant
  *le même* patch tant qu'on reste dans son domaine de validité. Zéro appel de
  sonde supplémentaire — c'est exactement ce que le coût par appel autorise.
- **Assumer la corde.** Pour une balle en bilinéaire, ne pas interpoler la
  trajectoire du tout : avancer en `(u, v)` avec la métrique du début de frame et
  re-sonder la frame suivante. Le chemin devient une polyligne qui coupe les
  virages. À 60 Hz sur un objet de la taille d'un pixel, c'est invisible.

**À mesurer avant de trancher** : l'erreur de corde en fraction du rayon de la
balle, sur une sphère à 132 pas, à la vitesse de tir visée. C'est le seul chiffre
qui décide entre « assumer » et « sous-pas ».

### 5.2 Le contact avec le sol n'est pas un atterrissage

`walk.js:786-790` fait, quand la hauteur repasse sous zéro :
`height = 0; vSpeed = 0`. Pour un marcheur c'est un atterrissage. Pour une balle
c'est un impact, et il faut un **événement**, pas un clamp.

D'où le champ `ground` de l'agent, et un `switch` de trois lignes dans
l'intégrateur : `stick` (marcheur), `despawn` + événement d'impact (balle),
`bounce` avec restitution (grenade, objet ramassable qui roule).

Piège associé, propre aux surfaces animées : la hauteur peut devenir négative
**parce que la surface est montée**, pas parce que l'objet est tombé. Une vague
qui passe avale la balle. C'est physiquement correct et visuellement plaisant,
mais l'événement d'impact doit accepter les deux causes sans chercher à les
distinguer.

### 5.3 Le canon n'a pas de tangage

Le corps du marcheur est plat dans le plan tangent : le tangage vit sur la
caméra (`walk.js:825`), pas sur le cap. Une balle qui hérite naïvement du
`heading` partira donc toujours à l'horizontale, quel que soit l'endroit où le
joueur vise.

Il faut composer explicitement au moment du tir :

```
vitesse tangentielle = vitesse · cos(pitch)      → alimente heading
vSpeed initiale      = vitesse · sin(pitch)      → alimente la balistique
hauteur initiale     = eyeHeight  (on tire de l'œil, pas des pieds)
```

Ce n'est pas automatique et ça ne se verra pas tout de suite : viser à
l'horizontale marchera, viser vers le haut ne fera rien.

### 5.4 Ce qu'une balle n'a pas besoin de payer

Le filtre passe-bas sur la normale (`SMOOTH_TAU`, `walk.js:32`, appliqué
lignes 616-623) existe pour le confort de la caméra. Une balle doit suivre la
géométrie brute : pas de filtre, c'est à la fois moins cher et plus juste.

---

## 6. Les collisions

**Surtout pas en `(u, v)`.** C'est le contre-sens que la note précédente combat
depuis son §3 : l'espace paramétrique est métriquement distordu. Deux agents
séparés du même `Δu` sont à des distances monde qui varient d'un facteur cent
selon qu'on est à l'équateur ou près d'un pôle. Une portée exprimée en paramètre
serait un rayon de tir qui change de taille selon l'endroit de la carte.

**En espace monde.** La phase `resolve` calcule déjà la position monde de chaque
agent à chaque frame — elle est là, gratuite. Test `O(n²)` sur les distances au
carré : 200 agents = 20 000 comparaisons, un bruit de fond. Aucune structure
d'accélération n'est justifiée avant plusieurs centaines d'entités.

**La question qui fâche : les nappes.** Ces surfaces s'auto-intersectent
constamment. Deux agents à des `(u, v)` sans rapport peuvent occuper le même
point du monde. Une balle touchera donc quelqu'un « à travers » une autre nappe.

Il n'y a pas de bonne réponse universelle, il y a un réglage :

- sur une bouteille de Klein, c'est **la** sensation à vendre — on tire à travers
  soi-même ;
- sur une forme de type terrain, c'est une nuisance pure.

Donc un booléen par forme (`hitAcrossSheets`), et quand il est faux, exiger en
plus que `(Δu, Δv)` soit petit *dans la métrique locale* — ce qui se lit
directement de `E, F, G` déjà calculés ligne 710-713. Coût : trois produits
scalaires.

---

## 7. Les ennemis

« Aller vers le joueur » n'est pas « soustraire les positions » : la différence
de deux points de l'espace ambiant n'est pas une direction sur la surface.

La réponse suffisante tient en deux lignes, et elle est déjà écrite : vecteur
monde vers la cible → `walkTangentialize()` (`walk.js:542`) → cap. C'est glouton,
donc pas un vrai plus court chemin sur la variété : sur une forme où la
géodésique contourne, l'ennemi se coincera contre la géométrie. Pour un jeu de
tir c'est très acceptable, et un vrai pathfinding géodésique n'a aucune raison
d'être fait avant d'avoir constaté qu'il manque.

L'état « je patrouille » existe aussi déjà : l'autopilote (`walk.js:645-648`),
deux sinus déphasés sur le cap. Il suffit de le prendre.

---

## 8. Le rendu : le triangle

**Instances fines.** Babylon 7.30 (`index.html:14`) fournit
`thinInstanceSetBuffer` : un seul draw call pour toutes les balles, un autre pour
tous les ennemis, avec une matrice et une couleur par instance. Un triangle fait
trois sommets et le `ShaderMaterial` tient en quelques lignes — ce qui colle à la
fois au cahier des charges (« un très simple shader ») et à la maison, où tout
est déjà `ShaderMaterial`.

**Le problème d'occultation, à traiter tôt.** Le maillage est rendu double face
et s'auto-intersecte. Les entités passeront donc leur temps à disparaître
derrière des nappes, y compris des nappes situées « derrière » elles du point de
vue du joueur. C'est un problème de jouabilité, pas de finition : on ne peut pas
viser ce qu'on ne voit pas clignoter. Parade peu coûteuse : une seconde passe du
même triangle avec `depthFunction = ALWAYS` et une alpha faible, qui laisse une
silhouette visible à travers la géométrie.

**Piège connu, déjà payé une fois.** `ribbonDispose()` (`ribbon.js:50`) détruit
tous les meshes de la scène sauf une liste blanche. La session précédente s'y est
fait prendre avec l'avatar et les panneaux de la mini-carte
(`vue-premiere-personne.md` §14). Les meshes d'entités doivent être ajoutés à
cette liste, sinon ils s'évaporent au premier changement d'équation. Le bug
d'itération signalé au même endroit (`forEach` qui mute le tableau et en saute un
sur deux) est toujours là : il rendra le symptôme incohérent, comme la première
fois.

---

## 9. Ce que la surface fait au gameplay

C'est la partie qui décide si le jeu vaut mieux qu'un jeu de tir de plus.

**La balistique devient de la géométrie.** Une balle tirée tout droit suit une
géodésique. Sur une sphère elle revient par derrière. Sur un tore, selon le cap,
elle boucle en quelques secondes ou dérive indéfiniment sans jamais repasser au
même endroit — c'est la différence entre une pente rationnelle et irrationnelle,
et elle devient une propriété *tactique*.

**Les coutures sont des mécaniques.** `walk.js:747-764` gère déjà les coutures
torsadées. Sur un ruban de Möbius, franchir la couture vous retourne : un
ennemi qui vous fuit revient par en dessous. Le code existe, il ne reste qu'à le
mettre en scène.

**La distorsion est une carte.** Le déterminant `EG − F²` est calculé à chaque
frame ligne 713. Il mesure la dilatation locale d'aire — donc les zones où la
paramétrisation dégénère (pôles, pincements). Les exposer, c'est offrir
gratuitement une carte de terrain, et probablement un mécanisme : des endroits où
l'on se déplace bizarrement.

**Le terrain est éditable en direct.** L'éditeur d'équations est là. Changer la
forme pendant la partie déforme le champ de bataille sous tout le monde
simultanément — et la sonde garantit que tout le monde reste collé à la
géométrie réelle, puisqu'elle interroge le shader lui-même.

**Le contrepoids honnête.** Les auto-intersections rendent la ligne de vue
incompréhensible et la visée frustrante. Je ne construirais pas les niveaux
« sérieux » sur des formes non plongées. Le bon partage : quelques formes propres
(tore, sphère, terrain paramétré) pour jouer, et le reste des cinquante formes en
bac à sable — où l'incompréhensibilité est précisément le sujet.

---

## 10. Feuille de route

| Phase | Contenu | Risque |
|---|---|---|
| **0** | Fusionner la branche FPV dans `master` (§12). | — |
| ~~**1**~~ | ~~Extraire l'intégrateur~~ — fait, vérifié bit-identique (§13). | faible |
| ~~**2**~~ | ~~Le batch gather / probe / resolve~~ — fait, mesuré (§13). | moyen |
| ~~**3**~~ | ~~Les balles~~ — fait, mesuré (§14). | moyen |
| ~~**4**~~ | ~~Collisions monde + équipes + `hitAcrossSheets`~~ — fait, mesuré (§14). | faible |
| ~~**5**~~ | ~~Ennemis~~ — fait, mesuré (§14). | faible |
| ~~**6**~~ | ~~Règles : vie, réapparition, score, HUD~~ — fait, mesuré (§15). | faible |

La phase 2 est la vraie porte, exactement comme la phase 0 de la note précédente
l'était pour le marcheur. **Test de recette** : 100 agents, un seul appel de
sonde, temps frame mesuré et comparé au marcheur seul. Si ça ne tient pas dans
~1 ms, tout ce qui suit change de forme et il vaut mieux le savoir avant d'avoir
écrit le jeu.

Le meilleur test de recette de la phase 3, et il est très précis : **sur une
sphère, un tir à plat doit revenir frapper le tireur dans le dos.** S'il revient,
le transport parallèle, la métrique et le bouclage de domaine sont justes tous
les trois d'un coup.

---

## 11. Ce que je ne ferais pas maintenant

- **Le réseau.** Un jeu de tir multijoueur sur géométrie déformable en temps réel
  est un problème de synchronisation autrement plus dur que le jeu lui-même. La
  surface étant définie par une équation partagée et une horloge, c'est faisable
  — et c'est un projet à part entière.
- **La VR.** Le rig la rend possible (c'est sa raison d'être), mais un jeu de tir
  en VR sur une surface qui se déforme est une machine à nausée avant d'être un
  jeu. Après le gameplay, pas avant.
- **Le pathfinding géodésique.** Voir §7 : à faire quand le cap glouton aura
  visiblement échoué, pas avant.
- **Les particules et les effets.** Ils masqueront les problèmes de lisibilité
  au lieu de les régler.

---

## 12. Deux points hors technique

**La branche FPV n'est pas fusionnée.** `claude/mesh-first-person-view-shouqo`
porte 9 commits et ~4 800 lignes, dont une réécriture large de `glo.js` et
`events.js`. Elle est aujourd'hui strictement en avance sur `master` — la fusion
est un *fast-forward*, sans conflit. Ça ne durera pas : chaque commit de shaders
sur `master` rapproche du conflit dans ces deux fichiers. Construire le jeu sur
une branche non fusionnée, c'est empiler une seconde dette sur la première.

**SURFACE est un instrument mathématique, et ceci en fait un jeu.** C'est une
question de produit, pas d'architecture, et elle mérite d'être posée franchement.
Ma lecture : à construire comme un **mode**, aussi nettement séparé que la marche
l'est déjà — deux fichiers, une touche pour entrer, rien qui déborde sur le
chemin de rendu. Ainsi c'est additif, et l'identité de l'outil ne bouge pas.

Et il y a un argument plus fort que « ça ne gêne pas » : le substrat multi-agents
sert *aussi* le propos mathématique. N agents, c'est N géodésiques simultanées
qu'on regarde diverger sur la forme — c'est-à-dire exactement la fonctionnalité
« trace » restée ouverte au §8 de la note précédente, obtenue en passant. Le jeu
et la pédagogie veulent le même code.

C'est ce qui me fait penser que ça vaut le coup d'être construit.

---

## 13. Phases 1 et 2 : ce qui a été construit, et ce que ça a mesuré

### Ce qui a bougé

| Fichier | Rôle |
|---|---|
| `js/agents.js` (nouveau) | l'agent, le batch `gather` / `probe` / `resolve`, l'intégrateur partagé |
| `js/walk.js` | ne garde que ce qui est propre au joueur : clavier, échelle de locomotion, pose du rig, rail |
| `index.html` | un `<script>` de plus, avant `walk.js` |

`glo.walk` est devenu l'agent nº 0. Il est **augmenté sur place** plutôt que
remplacé : le code de marche, de cinéma et de mini-carte le désigne par son nom
partout. Le rail garde sa position exacte dans l'ordre des opérations via un
*hook* `drive` qui, en rendant `true`, supprime le pilotage et le pas métrique
pour la frame — exactement ce que faisaient les gardes `if (!w.rail)`.

`agents.js` ne lit jamais `WALK` : c'est le substrat, la marche n'en est qu'un
client, et c'est le joueur qui passe ses propres réglages.

### Le test de recette de la phase 1

Rejeu déterministe — pas de temps fixe, horloge gelée, touches scriptées, boucle
de rendu arrêtée — comparant frame à frame la pose du rig, la position
paramétrique, le cap et la normale, contre le code d'avant refactor.

| Forme | Topologie couverte | Écart max |
|---|---|---|
| Torus | fermée en u et v | **0** (400 frames × 17 canaux) |
| Moebius | couture torsadée | **0** (300 × 14) |
| Saddle | ouverte, rebonds aux bords | **0** (300 × 14) |
| Sphere | fermée en u, dégénérescence polaire | **0** (300 × 14) |

Bit à bit, pas « à epsilon près ».

### Le test de recette de la phase 2

Population d'agents inertes en plus du joueur, sur un maillage 512×128, sous
SwiftShader (rastériseur logiciel, donc pire cas).

| Agents | ms / frame | appels de sonde / frame | échantillons / frame |
|---|---|---|---|
| 1 | 1,099 | **1,00** | 16 |
| 25 | 1,178 | **1,00** | 112 |
| 100 | 1,026 | **1,00** | 412 |
| 200 | 0,934 | **1,00** | 812 |
| 500 | 1,480 | **1,00** | 2012 |

**Le coût est plat de 1 à 200 agents** — l'écart entre les lignes est du bruit de
mesure, pas de la charge. C'est la confirmation directe de l'hypothèse du §3 :
le prix est l'appel, pas les points. À 500 agents (2012 échantillons) on
commence tout juste à voir la pente. La porte est franchie très largement ; le
budget d'entités n'est pas la contrainte du projet.

### Trois choses que la mesure a apprises

1. **Le plafond `maxCells` mord bien plus tôt que prévu.** Le commentaire
   d'origine disait « à des vitesses saines ça ne se déclenche jamais ». Faux dès
   qu'on quitte le joueur : sur une sphère, avec 60 agents éparpillés demandant
   tous la même vitesse monde — trois fois la hauteur d'œil, donc une vitesse de
   *marche* — **22 sur 60 sont plafonnés**, le plus lent tournant à 12 % de la
   vitesse demandée. Un tore n'en plafonne aucun. La cause est celle prévue au
   §5.1 (aux pôles `|∂P/∂v| → 0`, un pas monde exige un pas paramétrique énorme),
   mais l'ampleur ne l'était pas. Une balle rapide n'y échappera pas.

2. **Il y avait un second mode d'échec, silencieux.** Quand la première forme
   fondamentale est trop dégénérée pour être inversée, le pas est purement sauté
   — l'agent ne bouge pas du tout. C'est distinct du plafonnement et ça se
   produit exactement sur un pôle. Les deux cas ont maintenant leur drapeau,
   `clamped` et `stalled`.

3. **Une fois ces deux cas écartés, le pas métrique est juste à 0,2 % près.**
   Écart à la vitesse monde demandée : max 0,19 % / moyenne 0,064 % sur le tore
   (60 agents sur 60 libres), max 0,24 % / moyenne 0,061 % sur la sphère (37
   libres). Le « 86 % de dispersion » qu'affichait la première mesure était
   entièrement le plafond et le pôle, pas une erreur de métrique.

### Vérifié au passage

- Le patch bilinéaire vaut le bicubique pour un projectile : écart maximal
  **0,0007 % de la taille du maillage** sur 60 positions d'une sphère. Le
  bicubique reste réservé à ce qui porte une caméra, dont c'est la seule raison
  d'être.
- Les agents collent à la surface : écart maximal **0,1 %** de la taille du
  maillage entre la position d'un agent et une sonde indépendante du même `(u, v)`.
- Les politiques de contact fonctionnent : un agent `despawn` lâché à deux
  hauteurs d'œil meurt au contact après 49 frames avec exactement un appel de
  rappel d'impact et sort de la population ; un agent `stick` se pose et s'y
  tient (`height = 0`, `vSpeed = 0`, vivant).

### Un défaut préexistant repéré, pas encore corrigé

`startWalk` choisit le côté de la surface d'après la caméra orbitale, écrit
`w.flip` et applique le signe à `smoothNormal` — puis appelle `walkUpdate(true)`,
dont la branche `snap` réécrit `smoothNormal` avec la normale brute, non signée.
Le choix de côté est donc perdu à l'entrée. Le correctif tient en une ligne, mais
il **change** le comportement, donc il ne pouvait pas entrer dans un refactor dont
la recette est « bit-identique ». À faire dans un commit à part.

---

## 14. Phases 3 à 5 : les balles, les collisions, les ennemis

`js/game.js` porte tout ce qui est propre au jeu ; `js/agents.js` n'a pas bougé
d'une ligne pour l'accueillir. C'est la validation du §1 : la balle vole avec
l'intégrateur du marcheur, tel quel.

### Le test de recette du §10 passe

> « Sur une sphère, un tir à plat doit revenir frapper le tireur dans le dos. »

Mesuré à 120 Hz, gravité coupée pour isoler la géométrie de la balistique :

| | |
|---|---|
| Retour au point de départ | **0,044 %** de la taille du maillage |
| Cap au retour vs cap au départ | `dot = 0,99985` |
| Un pas inter-frame | 2,498 e-2 — soit **8× plus grand que l'écart de retour** |

Suivi sur six tours, le résidu **décroît** de 1,34 à 0,42 rayon de balle et la
dérive paramétrique hors du grand cercle reste à 1e-6. La longueur du tour se
répète à trois décimales. L'écart résiduel est un déphasage d'échantillonnage,
pas une erreur : un chemin continu échantillonné à intervalles discrets ne peut
pas faire mieux qu'un pas inter-frame — exactement la conclusion du §14 de la
note FPV sur la boucle vidéo.

Le transport parallèle, la métrique et le bouclage du domaine sont donc justes
tous les trois d'un coup, ce qui était l'intérêt de ce test.

### Le reste des mesures

| Sujet | Résultat |
|---|---|
| Balistique | vol de 0,5750 s contre `sqrt(2h/g)` = 0,5774 s, soit −0,41 % ; un rappel d'impact, disparition |
| Vitesse d'une balle | moyenne 2,99698 pour 2,99702 demandé, dispersion 3e-4, jamais plafonnée à `maxCells = 8` |
| 60 balles en vol | **1,00 appel de sonde/frame**, 1,24 ms |
| 44 agents en jeu | **1,00 appel de sonde/frame**, 1,28 ms |
| Tir sur un ennemi à 4 hauteurs de corps | 20 tirs → 20 touches → 20 points de vie, un par touche |
| Tir allié | 0 touche |
| IA | l'ennemi se rapproche de 15,5 à 6,0 hauteurs de corps — exactement son `standoff` — et riposte |

### Le commutateur de nappes, vérifié sur une vraie auto-intersection

Trouver le cas de test a demandé plus de soin que l'écrire. Les deux premières
recherches ont ramené des **coutures**, pas des auto-intersections : sur une
bouteille de Klein, `v = −π` et `v = +π` sont le même point, et un couple
« paramétriquement lointain, spatialement confondu » décrit aussi bien une
identification de bord qu'un croisement de nappes. Il faut dérouler les coutures
*avant* de juger — torsion comprise — pour que la recherche trouve autre chose
que le bord du domaine.

Une fois le vrai cas isolé — deux nappes à **0,96 hauteur de corps** l'une de
l'autre dans l'espace, mais **37,7 hauteurs de corps** l'une de l'autre le long
de la surface, soit 49 % du domaine :

| `hitAcrossSheets` | touches |
|---|---|
| `false` | **0** |
| `true` | **148** |

### Trois défauts trouvés en mesurant

1. **Une balle naissait à l'origine du monde.** `worldPos` n'est rempli que par
   l'intégration, mais le tir marque déjà la frame comme valide — le marqueur
   était donc dessiné au centre du monde pendant une frame. La balle hérite
   maintenant du repère monde du tireur, ce qui est exact puisqu'elle part de là
   où il se tient. Le défaut s'était d'abord manifesté comme une mesure absurde
   (une vitesse de 240 pour 3 demandée) avant d'être compris.

2. **La séparation le long de la surface ignorait la torsion.** Elle déroulait
   `u` et `v` indépendamment sans jamais miroiter — donc elle ne comprenait pas
   une couture torsadée. Deux agents côte à côte de part et d'autre de la couture
   d'un Möbius, réellement distants de 0,127, étaient mesurés **4,7× trop loin**
   et le portillon refusait tous les tirs entre eux. Corrigé avec la même
   identification qu'`agentMapIndex` : mesure 0,1288 pour un écart réel de
   0,1274, et 20 tirs à travers la couture portent. C'était le défaut le plus
   coûteux des trois — franchir cette couture est la seule chose qui rend cette
   surface intéressante à jouer, elle ne pouvait pas rester un mur.

3. **Le côté d'entrée était perdu** (corrigé à part, avant la phase 3) :
   `startWalk` mesurait de quel côté se trouvait la caméra orbitale, puis
   `walkUpdate(true)` écrasait la normale avec le produit vectoriel brut. On
   entrait toujours par-dessus. Reproduit sur trois formes, corrigé, et l'écart
   après correction vaut exactement `2 × eyeHeight` — même point, autre côté.

### Ce qui reste ouvert

- **L'occultation.** Le maillage est double face et s'auto-intersecte : les
  entités disparaissent derrière des nappes en permanence. C'est un problème de
  jouabilité, pas de finition. La parade prévue au §8 — seconde passe en
  `depthFunction = ALWAYS` à alpha faible — n'est pas faite.
- **Le plafond `maxCells`.** À `8` une balle n'est jamais plafonnée sur les
  formes testées, mais le §13 a montré que même un marcheur l'atteint près d'un
  pôle. L'erreur de corde reste non mesurée : elle ne s'est pas manifestée, donc
  la piste RK2 du §5.1 reste au frigo plutôt qu'écartée.
- **Le pathfinding.** Le cap glouton n'a pas encore visiblement échoué. Quand il
  le fera, ce sera sur une forme où la géodésique doit contourner.

---

## 15. Phase 6 : les règles

Le jeu est un **mode dans le mode marche**, pas un mode à part : `G` l'allume,
`G` l'éteint, et éteint la marche est exactement la marche. C'est l'arbitrage
annoncé au §12, et il est vérifié plutôt qu'affirmé — le rejeu déterministe reste
bit-identique sur les quatre topologies, jeu chargé mais éteint.

Une contrainte a dicté la forme du reste : **la mort du joueur ne peut pas le
sortir de la population.** La caméra pend à cet agent ; un agent qui cesse d'être
intégré emporte la vue avec lui. La mort est donc un rappel (`onDeath`) plutôt
que le drapeau `alive` pour qui en possède un. Celui du joueur restaure la vie,
le redépose ailleurs sur la surface en **invalidant sa frame** — un nouvel
endroit, c'est un nouveau plan tangent, le transporter serait faux — et accorde
quelques secondes d'immunité pour qu'une vague ne campe pas le point de
réapparition.

Deux minutes de partie jouées en tête-à-tête, à pas de temps fixe, en visant
l'ennemi le plus proche :

| vague | arrive à | ennemis | score | pv |
|---|---|---|---|---|
| 1 | 0,5 s | 3 | 0 | 8 |
| 2 | 22,4 s | 5 | 3 | 8 |
| 3 | 44,5 s | 7 | 8 | 6 |
| 4 | 69,1 s | 9 | 15 | 2 |
| 5 | 106,8 s | 11 | 24 | 4 |

Fin à la vague 5, score 29, deux morts, joueur toujours vivant, toujours dans la
population, toujours en marche. Mort forcée vérifiée à part : vie restaurée,
réapparition ailleurs, immunité accordée, et la marche continue de tourner
après. Arrêter la partie retire le champ de vie, vide le terrain et cache
l'incrustation.

---

## 16. Ce qui reste ouvert

Rien de bloquant, mais rien de caché non plus.

**L'occultation** — faite, voir §18. Les entités cachées par la forme sont
dessinées en vert à travers elle.

**La selle disperse ses vagues.** Le §17 a remplacé l'apparition « à une fraction
du domaine » par « à une vraie distance », ce qui donne 14,00 exactement sur un
plan et 8 à 15 hauteurs de corps sur tore, sphère, Möbius et Klein. Sur une
selle, la métrique tourne trop vite pour qu'une seule linéarisation la suive :
moyenne 30,9, une vague sur trois à portée. Les ennemis marchent depuis là, donc
c'est jouable, mais ce n'est pas réglé. La correction propre serait d'itérer —
poser, re-sonder, corriger — au prix d'un appel de sonde de plus par vague, ce
qui est parfaitement abordable vu le §13. Simplement pas fait.

**Près d'un pôle, on avance au ralenti.** Le §19 a débloqué les agents assis
exactement sur une singularité, mais le plafond `maxCells` continue d'étrangler
ceux qui en approchent : sur une sphère, 23 agents sur 60 sont plafonnés et le
plus lent tourne à 12 % de la vitesse demandée. Ils arrivent, mais lentement.

**Les collisions ignorent la hauteur.** `gameCollide` compare des positions de
surface : une balle qui passe au-dessus de la tête touche quand même, et un saut
n'esquive rien. Ça n'a pas encore gêné parce que tout reste près de la surface,
mais c'est faux et ça se verra dès qu'on voudra sauter par-dessus un tir.

**L'erreur de corde des balles n'est toujours pas mesurée.** À `maxCells = 8` le
plafond ne s'est jamais déclenché sur les formes testées, donc la piste RK2 du
§5.1 est au frigo plutôt qu'écartée. Elle ressortira sur une forme à forte
distorsion, où le §13 a montré qu'un simple marcheur atteint déjà le plafond.

**Le cap glouton des ennemis n'a pas encore échoué visiblement.** Il le fera sur
une forme où la géodésique doit contourner. Le remplacer avant d'avoir vu
l'échec serait construire pour un problème supposé.

**Les copies symétrisées restent hors-jeu.** Comme le marcheur, les agents ne
vivent que sur la copie nº 0 (`vue-premiere-personne.md` §15). `probePoints`
accepte déjà l'identifiant de copie ; c'est la logique de franchissement qui
manque.

**Rien n'est réglé pour le multijoueur ni la VR**, et c'est délibéré (§11).

---

## 17. Défauts de visibilité remontés à l'usage

> « Le jeu est déjà sympa sur un tore, mais avec les autres formes (même un
> plan), je ne vois ni mes projectiles, ni les ennemis et leurs projectiles,
> juste la barre de jeu. »

Deux causes, indépendantes, et le « même un plan » écarte d'emblée l'occultation
du §16 : un plan n'a pas de nappes.

### 17.1 Le marqueur était couché dans le plan tangent

C'était le choix évident, et il est faux. L'œil est à environ une hauteur de
corps au-dessus de la surface, donc un marqueur couché à distance `d` est vu sous
un angle `atan(h/d)` : son aire projetée décroît en **`h/d³`** au lieu de `1/d²`.
Mesuré sur un plan, `|face · vue|` :

| distance | 1,5 corps | 2,7 corps | 22 corps |
|---|---|---|---|
| couché | 0,67 | 0,36 | **0** |

**Le tore masquait le problème** : sa courbure ramène le sol lointain vers une
vue de face (0,9996 à 17,8 corps). D'où une forme qui marche et toutes les
autres qui ne marchent pas — un signalement trompeur au premier abord, mais qui
pointait exactement la bonne chose.

Le redresser et le faire pivoter autour de la normale a été la deuxième
tentative, mesurée elle aussi : ça règle la faible courbure et ça introduit
l'angle mort inverse — le marqueur passe par la tranche partout où la surface
elle-même fait face au regard, c'est-à-dire sur la majeure partie de la face
lointaine d'un tore (`|face · vue| = 0,027` à 17,8 corps).

Il faut **découpler le plan du marqueur de la surface** pour supprimer les deux
angles morts à la fois : le triangle est maintenant construit perpendiculairement
à la ligne de visée, avec son haut local aussi proche que possible de la normale.
Il continue de se lire comme debout sur le sol, et il ne peut plus présenter sa
tranche.

| | avant | après |
|---|---|---|
| `\|face · vue\|`, toutes formes, toutes distances | 0 à 1 | **1** partout |
| pixels de marqueur, plan | 168 | **4238** |
| pixels de marqueur, tore | 589 | 4187 |

### 17.2 Les vagues apparaissaient à une fraction du domaine

`SPAWN_SPREAD` valait 0,3 du domaine paramétrique — **la même erreur de catégorie
que mesurer les collisions en `(u, v)`**, et exactement celle contre laquelle
tout le reste de ce document met en garde. Une même fraction vaut trois pas sur
une forme et l'au-delà de l'horizon sur une autre.

Les vagues apparaissent maintenant sur un **anneau de rayon réel**, tracé dans le
plan tangent et repoussé à travers la métrique locale. L'inversion que le pas
métrique effectuait déjà est exposée sous le nom `agentWorldToParam` pour ça.

Pour une cible de 14 hauteurs de corps :

| forme | min | moyenne | max | à portée |
|---|---|---|---|---|
| Plan | 14,00 | 14,00 | 14,00 | 3/3 |
| Torus | 10,41 | 11,49 | 13,65 | 3/3 |
| Sphere | 13,10 | 13,22 | 13,48 | 3/3 |
| Moebius | 12,34 | 13,70 | 15,40 | 3/3 |
| Klein Bottle | 8,35 | 10,81 | 13,09 | 3/3 |
| Saddle | 14,00 | 30,88 | 39,32 | 1/3 |

Exact sur un plan, dont la métrique est uniforme. L'écart ailleurs est la
linéarisation de la métrique sur quatorze hauteurs de corps, et il reste dans la
portée des ennemis. La selle est l'exception, traitée au §16.

### 17.3 Changer de forme laissait la vague échouée

Deuxième signalement, même symptôme apparent : le HUD compte des ennemis, l'écran
est vide. Cause entièrement différente, et elle se déclenche quand on **change de
forme en cours de partie**.

**Les mesures d'entrée n'étaient jamais rafraîchies.** Le relevé de `startWalk` —
taille de la boîte englobante, centroïde, fermeture du domaine — décrit la
géométrie présente au moment où l'on est entré en marche. Une reconstruction
remplace le maillage et laisse tout cela périmé : le personnage garde la taille
de corps de la forme précédente, donc sa vitesse de marche, sa gravité, sa
hauteur de saut et sa hauteur d'œil. Mesuré en passant d'un tore à un plan,
`baseEye` restait à **0,2095**, la valeur du tore, au lieu de 0,1333 — 1,6× trop
grand, et deux formes plus éloignées en taille feraient bien pire.

C'est un défaut de la **marche**, pas du jeu ; il existait avant lui. Une
reconstruction est maintenant détectée en comparant l'instance de maillage — un
nouveau maillage est un nouvel objet, donc rien à maintenir, le même argument que
le cache de programme de la sonde — et le relevé est refait.

**Les entités gardaient leur `(u, v)`.** Sur une nouvelle forme, ça ne veut rien
dire : la métrique change en bloc.

| | tore | → plan |
|---|---|---|
| plage de `u` | 6,283 | 37,699 |
| distance des ennemis | 9 à 13 hauteurs de corps | **2 à 3,4** |

La vague s'effondrait sur le joueur, hors cadre ou derrière lui, pendant que le
HUD continuait de la compter. Les survivants sont désormais replacés sur un
anneau correct dès que le repère du joueur revient, avec taille, vitesse,
gravité et rayon de touche repris de la nouvelle mesure — 12,6 à 13,5 hauteurs de
corps après correction. Les balles sont supprimées plutôt que replacées : l'état
d'un projectile est une trajectoire sur une géométrie qui n'existe plus.

**Et l'anneau enjambe désormais l'axe du regard** au lieu d'y commencer, ce qui
garantit qu'une vague de taille impaire en place toujours un bien en vue. Une
vague qui s'annonce devant se lit comme une arrivée ; éparpillée à l'aveugle,
elle commence surtout derrière, et la première chose qu'on apprend est qu'on se
fait tirer dessus.

### 17.4 Ce que je n'ai pas réussi à reproduire

Une partie **démarrée directement** sur un plan affiche correctement ennemis et
projectiles dans tous mes essais — vérifié en projetant les entités en
coordonnées écran et par capture. Si le symptôme persiste dans ce cas précis, il
reste quelque chose que mon harnais ne voit pas, et le plus probable est
prosaïque : `index.html` charge les scripts sans anti-cache, donc un
`js/game.js` gardé en cache reproduit exactement l'ancien comportement — visible
sur un tore, invisible ailleurs.

---

## 18. Voir ce qui est caché, et savoir que ça l'est

Deux informations distinctes que la vue subjective sur une variété mêle en
permanence : *où* est un ennemi, et *peut-on le toucher*. Les entités sont donc
dessinées deux fois — une passe pleine en profondeur normale, une passe
silhouette en `GREATER` — avec deux palettes. Rouge : cible dégagée. Vert :
cible derrière une nappe. Un ennemi à moitié occulté sort à moitié de chaque, ce
qui se lit remarquablement bien sur un tore, où un ennemi qui franchit la
courbure arrive vert par la base et rouge par la pointe.

### Trois choses devaient être vraies, une seule l'était

**Les couches étaient dans les groupes de rendu 1 et 2.** Babylon **efface le
tampon de profondeur entre les groupes** par défaut : ces maillages étaient donc
dessinés comme si rien d'autre n'existait. C'est exactement pour cette raison
qu'ils sont devenus visibles partout au §17 — la passe pleine traversait toute la
forme — et pourquoi la passe silhouette n'avait rien à faire. Les deux couches
partagent maintenant le groupe 0 avec la surface, où Babylon dessine tous les
opaques puis les transparents : la passe pleine se dispute la profondeur avec la
surface, la silhouette passe une fois le tampon complet. Aucun réglage
d'effacement d'autrui n'est touché, et le panneau de mini-carte garde son groupe.

**Les marqueurs avaient les pieds exactement sur la surface.** Coplanaire, c'est
précisément là où un tampon de profondeur n'a rien à dire. Tout marqueur décolle
désormais un peu, marcheurs compris.

**Aucune des deux passes n'écrit la profondeur.** La question posée est « est-ce
que *la surface* le cache », donc les entités ne doivent pas s'occulter entre
elles : un ennemi derrière un autre ennemi est à découvert, le peindre en caché
serait un mensonge. Mesuré avant correction, le second de deux ennemis alignés
ressortait vert uniquement parce que le premier était devant.

### Mesures

| cas | résultat |
|---|---|
| ennemi maintenu 2,5 hauteurs de corps **sous** la surface | 0 rouge / 7326 vert |
| ligne d'ennemis à 5, 9, 14, 20 hauteurs de corps sur un tore | rouge, mixte, vert, vert |
| marche seule, jeu éteint | bit-identique sur les quatre topologies |

La transition avec la distance sur un tore n'est pas un artefact : sur une
surface convexe, un ennemi à quatorze hauteurs de corps est réellement passé
derrière la courbure. Avant le partage du groupe 0 il était dessiné en pleine
lumière au-dessus de l'horizon, ce qui était faux.

### Un levier retiré parce qu'il ne faisait rien

J'avais ajouté un biais de profondeur (`zOffset`) en supposant qu'il trancherait
les égalités en incidence rasante. Balayé de −8 à +20, il ne change
**strictement rien** — Babylon ne l'applique pas à ce matériau. La transition
qu'il devait corriger était de la vraie occlusion, pas du bruit numérique. Levier
supprimé plutôt que laissé en place à ne rien faire.

---

## 19. L'ennemi assis sur un pôle

> « J'ai juste quelques fois un ennemi sur la sphère qui reste inaccessible, à
> l'extérieur comme à l'intérieur. »

Reproduit sans ambiguïté. Un ennemi placé **exactement sur un pôle** :

| placement (sphère) | départ | arrivée | trajet | `stalled` |
|---|---|---|---|---|
| équateur, proche | 4,4 | 4,4 | 0 | 0 % |
| équateur, loin | 24,7 | 7,3 | 22 | 0 % |
| latitude moyenne | 16,3 | 6,0 | 11,3 | 0 % |
| à 1 % du pôle | 20,6 | 6,0 | 16,8 | 0 % |
| **sur le pôle** | 20,8 | **20,8** | **0** | **100 %** |

Vingt secondes à marcher vers un joueur immobile, et il n'a pas bougé d'un
millimètre.

### Le pas métrique renonçait

Au pôle d'une sphère, `∂P/∂u` s'annule — tous les méridiens s'y rejoignent — donc
la première forme fondamentale devient singulière et le système 2×2 était
purement sauté. Mais **la surface n'a pas disparu pour autant** : l'autre tangente
survit, et le déplacement le long d'elle reste parfaitement défini. Le rang tombe
à un ; la géométrie, elle, est toujours là.

Un système singulier est désormais résolu **au sens des moindres carrés sur la
tangente la mieux conditionnée** : le déplacement le plus proche de celui demandé
que la surface puisse effectivement offrir. Un seul pas suffit à quitter le point
singulier, après quoi la métrique complète reprend la main. Seul le cas qui
refusait de bouger est touché.

Après correction, les deux pôles donnent 6,0 hauteurs de corps d'arrivée, un
trajet de 17, et **0 %** de frames bloquées. La mesure de dispersion du §13 passe
de « 22 plafonnés, 1 bloqué » à « 23 plafonnés, **0 bloqué** » : l'agent bloqué
est devenu un agent qui avance.

Inchangés : marche bit-identique sur les quatre topologies, fermeture géodésique,
balistique, et la vitesse métrique des agents non plafonnés (0,24 % d'écart max).

---

## 20. Les balles traversaient les cibles

> « Il y a toujours un ennemi que je n'atteins jamais […] il tire des projectiles
> qui ne me parviennent jamais, de même que les miens ne lui parviennent pas. »

L'indice utile n'était pas dans la phrase mais dans la capture : le maillage était
en **512 × 512**, quatre fois le tore par défaut. Le coupable n'est pas la forme,
c'est **la cadence d'images**.

La collision était un test **ponctuel** sur la position courante de la balle, une
fois par frame. Or une balle n'est pas là où elle est, elle est partout où elle
est passée depuis la frame précédente — et son pas est proportionnel au temps de
frame. Mesuré sur une sphère, 50 tirs sur un ennemi immobile à cinq hauteurs de
corps, rayon de touche 0,67 :

| cadence | pas par frame | touches |
|---|---|---|
| 60 fps | 0,37 | 49 |
| 30 fps | 0,73 | 50 |
| 20 fps | 1,10 | 50 |
| **15 fps** | **1,44** | **0** |
| **10 fps** | **1,44** | **0** |

En dessous de 20 images/s, **tout passe à travers**, dans les deux sens.

### Le balayage seul ne suffisait pas

Le test compare désormais la cible au **segment** parcouru dans la frame, ce qui
demande de mémoriser la position monde précédente — donc un champ de plus sur
l'agent.

Et ça ne corrigeait toujours rien. Le relevé frame par frame a dit pourquoi :

```
 f  height  endDist  swept  segLen  sheetSep
 3   0.733     0.68   0.68    1.44      0.76
 4   0.600     0.76   0.02    1.44      2.21   <- traverse la cible
```

À la frame 4 la balle passe à **0,02 hauteur de corps** de l'ennemi — elle le
traverse — mais le portillon anti-nappes la refuse : il lit la séparation
paramétrique là où la balle **termine** la frame, 1,44 hauteur de corps au-delà
de la cible, contre une tolérance de 2,01.

Le portillon accorde maintenant en plus la **foulée** de la balle. Une vraie
autre nappe se mesure en dizaines de hauteurs de corps (37,7 sur une bouteille de
Klein), donc une foulée de marge ne lui coûte rien : le commutateur donne
toujours 0 touche éteint, 148 allumé.

Après les deux corrections : **50 tirs sur 50 portent à 60, 30, 20, 15 et 10
images par seconde.**

### Leçon générale

Deux tests de proximité coexistaient, l'un en espace monde et l'autre le long de
la surface, et ils n'étaient pas d'accord sur *quand* la balle se trouvait. Rendre
l'un continu sans rendre l'autre continu a produit un système qui trouvait la
touche puis la refusait. Les deux moitiés d'un même verdict doivent parler du
même instant.
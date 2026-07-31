# Phase 1 — le squelette

Quatrième note de la série, première du projet `ruban`. Les trois précédentes
vivent dans le dépôt `surface` : `vue-premiere-personne.md`,
`jeu-de-tir-sur-surface.md`, `ruban-nouveau-projet.md`. Celle-ci rend compte de
la phase 1 de la feuille de route du §4 de la troisième.

> **État au 31/07/2026** — phase 1 terminée et mesurée. Init WebGPU, compilateur
> formule → WGSL avec nombres duaux, passe de surface, rendu, caméra orbitale, et
> la discipline de mesure du §6 en place dès le premier commit. La recette
> annoncée est passée : **le maillage coïncide avec celui de l'application
> actuelle, au bit près sur 11 formes sur 12**. Les chiffres sont au §3, les
> surprises au §4, ce qui reste ouvert au §7.

---

## 1. Ce qui a été construit

| Fichier | Rôle |
|---|---|
| `src/core/formula/parser.ts` | analyseur du langage des formes : scanner + descente récursive, à la place des 109 regex de `glo.regs` |
| `src/core/formula/wgsl.ts` | émission WGSL, deux fois : scalaire et duale |
| `src/core/formula/prelude.wgsl.ts` | l'arithmétique des nombres duaux, avec ses conventions aux points non dérivables |
| `src/core/formula/evalJs.ts` | l'implémentation de référence en JS — l'oracle du §5 de la note de conception |
| `src/core/surface.ts` | la passe de calcul : P, ∂P/∂u, ∂P/∂v, normale, élément d'aire |
| `src/core/gpu.ts` | la couche WebGPU, 90 lignes |
| `src/render/surfacePass.ts` | le rendu, sans tampon de sommets : le vertex shader lit le tampon de stockage |
| `src/game/orbitCamera.ts` | la caméra orbitale, épinglable |
| `src/engine.ts`, `src/testapi.ts` | horloge gelable, boucle arrêtable, rejeu scripté, lecture-retour |
| `test/oracle.html` | **exécute** le projet d'origine pour en tirer la vérité de terrain |
| `test/phase1.mjs` | la campagne de mesure |

Environ 2 400 lignes, dont 700 de harnais et de mesure. Pas de moteur, pas de
dépendance à l'exécution : trois paquets de développement (Vite, TypeScript,
les types WebGPU) et rien dans le bundle.

---

## 2. Comment la recette a été rendue vérifiable

« Le maillage coïncide avec celui de l'application actuelle » n'est une recette
que si l'on sait produire le maillage de l'application actuelle. Trois options
existaient ; deux étaient des pièges.

**Réimplémenter la chaîne d'origine** aurait comparé mon interprétation à
elle-même. **Comparer à des valeurs analytiques** aurait mesuré la géométrie, pas
la compatibilité — or la question posée est bien la compatibilité, y compris avec
les bizarreries.

Ce qui a été fait : `test/oracle.html` **charge les vrais fichiers**
`js/glo.js`, `js/GPUShaderMesh.js`, `js/ui.js` du dépôt d'origine, demande à la
vraie classe `ShaderMesh*` son vertex shader complet par `createVertexShader()`,
pose les uniformes avec sa propre méthode `_setTFUniforms()`, et récupère les
sommets par transform feedback. C'est le chemin exact de
`extractPositionsForExport()` — celui contre lequel la sonde du projet avait été
validée au bit près (`vue-premiere-personne.md` §12). Seul BABYLON est bouchonné,
et uniquement pour des classes de vecteurs et de couleurs : aucune ligne de
logique géométrique n'est simulée.

Conséquence pratique : l'oracle suit le dépôt d'origine. Si une équation y change
demain, la comparaison en tient compte sans qu'on ait rien à recopier.

Le maillage d'origine est interrogé dans son état neutre — ni blender, ni
symétrie, ni déformation le long de la normale. Ce ne sont pas des réglages
oubliés : ce sont des fonctionnalités de l'atelier de maillage, que le §1 de la
note de conception laisse explicitement derrière. Ce qu'on emporte, c'est la
géométrie paramétrique.

---

## 3. Les mesures

Toutes prises dans Chromium headless, adaptateur **SwiftShader** (rendu
logiciel, donc pire cas — le même choix que les campagnes du projet d'origine).
Rejouables par `npm run measure` ; le JSON complet est dans
`mesures/phase-1.json`.

### 3.0 D'abord : la précision des transcendantes de la plateforme

À mesurer **avant** de lire quoi que ce soit d'autre, faute de quoi tout le reste
est mal interprété.

| | écart max sur 512 points de [−π, π] |
|---|---|
| `sin` / `cos`, WebGPU | **1,892 e-4** |
| `sin` / `cos`, WebGL2 | **1,892 e-4** |
| epsilon f32, pour comparaison | 1,192 e-7 |
| résultats identiques entre les deux API | **100 %** |

Les transcendantes de SwiftShader sont à **1,9 e-4**, soit environ 1 600 ulp, et
non à l'ulp. Les deux API partagent la même bibliothèque mathématique, au bit
près sur 512 points sur 512.

C'est la clé de lecture de tout le reste : elle explique à la fois pourquoi le
maillage peut coïncider **exactement** avec celui du projet d'origine, et
pourquoi les deux s'écartent ensemble d'une référence f64 d'environ 1 e-4.

### 3.1 La recette : coïncidence du maillage

12 formes, 145 124 sommets, 435 372 composantes comparées une à une contre le
maillage de l'application actuelle, même formule, même domaine, même résolution.

| Forme | Grille | Sommets | Écart max | Composantes identiques au bit près |
|---|---|---|---|---|
| Sphere | 128×128 | 16 641 | **0** | **100 %** |
| Torus | 128×32 | 4 257 | **0** | **100 %** |
| Plan | 128×128 | 16 641 | **0** | **100 %** |
| Saddle | 16×64 | 1 105 | **0** | **100 %** |
| Moebius | 256×12 | 3 341 | **0** | **100 %** |
| Catenoid | 96×48 | 4 753 | **0** | **100 %** |
| Klein Bottle | 128×128 | 16 641 | **0** | **100 %** |
| Twisted Torus | 128×128 | 16 641 | **0** | **100 %** |
| Waves (t = 0,7) | 128×128 | 16 641 | **0** | **100 %** |
| Cylinder | 88×88 | 7 921 | **0** | **100 %** |
| Pseudosphere | 256×92 | 23 901 | **0** | **100 %** |
| Sphere meridians | 128×128 | 16 641 | 5,96 e-8 | 97,18 % |

Onze formes sur douze sont **bit à bit**, pas « à epsilon près ». La douzième
s'écarte de 5,96 e-8, soit un ulp sur une coordonnée d'ordre 1, et 1,7 e-8 de
l'échelle du maillage : c'est le système sphérique, dont la construction
enchaîne deux rotations supplémentaires, donc un ordre d'opérations flottantes
différent du mien sur 2,8 % des composantes.

Le jeu couvre les trois systèmes de coordonnées, les surfaces fermées, la
couture torsadée du Möbius, la dégénérescence polaire, la dépendance au temps
(Waves à t = 0,7) et un paramètre uniforme (Twisted Torus avec G = 1).

### 3.2 Différentiel GPU contre référence CPU

Le garde-fou du §5 de la note de conception : la même formule évaluée par un
interpréteur JS indépendant de l'émetteur WGSL.

| Forme | écart max GPU / CPU f64 | rapporté à l'échelle |
|---|---|---|
| Plan | 2,43 e-7 | 3,6 e-8 |
| Saddle | 4,25 e-7 | 7,8 e-8 |
| Cylinder | 1,86 e-4 | 2,7 e-5 |
| Pseudosphere | 1,85 e-4 | 2,3 e-5 |
| Catenoid | 4,68 e-4 | 6,0 e-5 |
| Torus | 8,76 e-4 | 8,2 e-5 |
| Klein Bottle | 9,13 e-4 | 9,9 e-5 |
| Waves | 1,40 e-3 | 1,1 e-4 |
| Twisted Torus | 1,33 e-3 | 1,4 e-4 |

**Le tableau se lit en une ligne** : `Plan` et `Saddle` sont les deux seules
formes qui n'appellent aucune transcendante, et ce sont les deux seules à tomber
au niveau du f32 (1 e-7). Toutes les autres se stabilisent à 1 e-4 — exactement
le plancher mesuré au §3.0. Le différentiel ne mesure donc pas une dérive du
pipeline, il mesure `sin` et `cos` de SwiftShader. Sur un GPU réel, où les
transcendantes sont à quelques ulp, ces lignes doivent descendre à 1 e-7 ; c'est
une prédiction, pas une mesure, et elle sera vérifiable dès que le projet
tournera sur une machine avec un vrai adaptateur.

### 3.3 Les tangentes exactes

Trois contrôles indépendants sur les nombres duaux.

**Contre des différences finies centrées d'ordre 4, en f64**, en quatre points
intérieurs par forme : écart relatif compris entre **7,1 e-16 et 2,8 e-6** selon
la forme, le haut de la plage revenant aux formes à fortes dérivées. Deux
méthodes qui n'ont rien en commun tombent d'accord.

**Contre la normale du projet d'origine**, qui vient de différences finies
*avant* avec `eps = 0,001` — c'est l'amélioration annoncée au §3.4 de la note de
conception, et voici son ampleur :

| Forme | écart angulaire moyen | max |
|---|---|---|
| Plan | 0° | 0° |
| Saddle | 0,0067° | 0,027° |
| Moebius | 0,027° | 0,188° |
| Catenoid | 0,035° | 0,185° |
| Sphere | 0,054° | 0,261° |
| Torus | 0,069° | 0,265° |
| Klein Bottle | 0,082° | 0,677° |
| Waves | 0,087° | 0,782° |
| Twisted Torus | 0,092° | **1,257°** |

Le plan est exact des deux côtés — une différence finie y est exacte. Partout
ailleurs la normale d'origine dévie, jusqu'à 1,26° sur le tore torsadé. Ce n'est
pas énorme, et ça n'avait pas besoin de l'être : c'est simplement de l'erreur
qu'on ne paie plus, et qu'on ne payait qu'en échange d'échantillons
supplémentaires.

**Scalaire contre dual** : la position rendue par `surfacePoint(u, v)` et celle
rendue par `surfaceFrame(u, v).pos` sont identiques au bit près sur les 145 124
sommets des 12 formes, écart maximal **exactement 0**. Les deux émissions
partagent l'AST mais pas l'arithmétique ; qu'elles ne se séparent jamais dit que
le relèvement dual ne change pas la valeur.

Ce contrôle a servi tout de suite : il a attrapé un `dDiv` qui calculait sa
valeur comme `a × (1/b)` au lieu de `a / b`, ce qui séparait les deux versions
d'un ulp sur la pseudosphère.

### 3.4 L'élément d'aire

Sur la sphère de rayon 2, d'aire analytique 16π = 50,265482. On intègre
√(EG − F²) par la règle du trapèze, deux fois : sur les aires du GPU (f32,
transcendantes du rastériseur) et sur celles de la référence CPU (f64,
transcendantes justes).

| grille | intégrale CPU f64 | écart | intégrale GPU f32 | écart | GPU − CPU |
|---|---|---|---|---|---|
| 64² | 50,255389 | 2,008 e-4 | 50,246059 | 3,864 e-4 | 1,856 e-4 |
| 128² | 50,262959 | 5,020 e-5 | 50,253448 | 2,394 e-4 | 1,892 e-4 |
| 256² | 50,264852 | 1,255 e-5 | 50,255295 | 2,027 e-4 | 1,901 e-4 |
| 512² | 50,265325 | **3,137 e-6** | 50,255757 | 1,935 e-4 | 1,903 e-4 |

La colonne CPU converge en **O(h²) exactement** — les rapports successifs valent
4,00, 4,00 et 4,00. C'est la signature d'une règle du trapèze appliquée à un
intégrande juste : E, F et G sont exacts, les nombres duaux tiennent leur
promesse.

La colonne GPU, elle, plafonne à 1,9 e-4, et l'écart GPU − CPU se fige à
1,90 e-4 quelle que soit la résolution. C'est, au chiffre près, le plancher du
§3.0.

**Il a fallu le voir pour ne pas se tromper.** La première version de cette
mesure n'avait qu'une colonne, celle du GPU, et affichait une erreur qui refusait
de converger — 3,9 e-4 puis 2,4 e-4 puis 2,0 e-4 puis 1,9 e-4. Lu seul, ce
tableau accuse la règle de quadrature ou les tangentes. Séparer les deux sources
a montré qu'aucune des deux n'était en cause.

Ce n'est pas la recette de la phase 3 — la peinture n'existe pas encore, et le
score s'y mesurera par réduction sur GPU — mais c'est le contrôle qui autorise à
compter dessus.

### 3.5 Le rejeu déterministe

Le §6 de la note de conception, mis en place dès la phase 1 : horloge gelée,
entrées scriptées, boucle de rendu arrêtée, caméra épinglée.

Protocole : charger `Waves`, épingler la caméra, avancer de cinq pas de temps
fixes (0,013 / 0,017 / 0,023 / 0,031 / 0,041), lire les sommets et l'image.
Puis, entre les deux rejeux, **charger une autre forme et bouger la caméra** —
un rejeu doit repartir d'un état posé, pas d'un état hérité. Puis recommencer.

| | résultat |
|---|---|
| positions identiques au bit près | **100 %** |
| écart maximal | **0** |
| écart pixel maximal, image 640×480 | **0** |
| pixels réellement couverts par la surface | 196 947 / 307 200 |

La dernière ligne est là parce qu'une image entièrement au fond se comparerait à
elle-même sans rien prouver.

### 3.6 Le coût

Calcul et rendu mesurés **séparément**, faute de quoi le chiffre ne dit rien :
sous un rastériseur logiciel, la rasterisation d'un demi-million de triangles
écrase tout le reste.

| grille | sommets | passe de surface | par sommet | + rendu 640×480 |
|---|---|---|---|---|
| 128² | 16 641 | 0,475 ms | 28,5 ns | 18,05 ms |
| 256² | 66 049 | 1,740 ms | 26,3 ns | 52,43 ms |
| 512² | 263 169 | 6,540 ms | 24,9 ns | 170,83 ms |

Le coût par sommet est **plat** de 16 000 à 263 000 sommets, ce qui était
attendu — un thread par sommet, aucune dépendance entre eux — mais valait d'être
vérifié plutôt qu'affirmé. La passe de surface évalue la formule en nombres
duaux, donc environ trois fois le travail scalaire, et coûte tout de même
0,475 ms pour un maillage 128² sur un rastériseur logiciel.

Le rendu, lui, est entièrement le rastériseur logiciel et ne prédit rien pour
une vraie machine.

---

## 4. Trois choses que la mesure a apprises

### 4.1 Le projet d'origine a deux conventions de rotation, et il faut les deux

Les rotations explicites de `getPositionGLSL` — theta, beta, alpha — tournent
dans le sens direct. La fonction `rotateAxis()`, utilisée par les rotations
primaires des systèmes sphérique et cylindrique, construit son `mat3` en
colonnes majeures à partir d'une écriture rangée par lignes : elle rend donc la
**transposée** de la matrice de Rodrigues, c'est-à-dire une rotation d'angle
opposé.

Je n'ai pas vu ça en lisant le code — je l'avais lu, et j'avais conclu l'inverse.
C'est la première campagne qui l'a dit : `Sphere meridians` et `Cylinder`
s'écartaient de **2,0 unités** sur une forme de rayon 1, avec 35 % et 67 % de
composantes identiques. Dix formes sur douze étaient déjà bit-identiques, ce qui
rendait le diagnostic immédiat une fois le chiffre affiché.

C'est exactement ce que la recette « le maillage coïncide » sert à attraper, et
c'est un argument pour l'avoir écrite avant le code plutôt qu'après.

### 4.2 Un résultat trop propre est un test à relire

Le §6 de la note de conception le dit, et la phase 1 a fourni son cas.

« Écart maximal 0, 100 % de composantes identiques » sur onze formes est
précisément le genre de résultat dont cette série a appris à se méfier. La
contre-épreuve est venue toute seule : **le même test a échoué sur deux formes**,
avec un écart de 2,0. Un harnais qui compare quelque chose à lui-même ne
distingue pas les cas — celui-ci les distingue, et il a désigné le bon coupable.

Le §3.0 fournit l'explication positive : les deux implémentations partagent la
bibliothèque mathématique de SwiftShader, au bit près sur 512 points sur 512.
L'égalité exacte n'est donc pas un miracle, c'est une conséquence — et elle
prédit correctement que les formes sans transcendantes (Plan, Saddle) sont les
seules à s'accorder aussi avec une référence f64.

### 4.3 Présenter un canvas WebGPU tue le canal GPU dans ce conteneur

Le premier appel de lecture-retour échouait sur `AbortError: A valid external
Instance reference no longer exists`. Isolé pas à pas : device créé, canvas
configuré, texture de profondeur, passe de calcul — tout passe ; la **passe de
rendu vers la texture du canvas** perd le device, et emporte le contexte WebGL2
de la page voisine avec elle. Quatre jeux de drapeaux Chromium essayés, aucun
n'y change quoi que ce soit.

D'où une cible hors écran (`?offscreen=640x480`) pour le harnais. Ce n'est pas
qu'un contournement : une cible de taille fixe, sans compositeur, est de toute
façon ce qu'il faut pour comparer deux rejeux au pixel près, et c'est ce qui rend
la mesure du §3.5 possible.

**Limite assumée** : la présentation sur canvas n'est donc pas exercée par la
campagne. Le chemin de rendu l'est — mêmes pipelines, mêmes shaders, même
tampon de profondeur — mais la présentation elle-même reste à vérifier sur une
machine avec un vrai adaptateur.

---

## 5. Le langage des formes : ce qui change, et ce qui est refusé

Le projet d'origine expanse la notation compacte par 109 expressions régulières
appliquées en séquence. `ruban` a un vrai analyseur. Les douze formes du §3.1 le
valident numériquement : la notation compacte est comprise à l'identique, sinon
les positions ne coïncideraient pas.

Trois écarts sont assumés et écrits en clair dans `parser.ts` :

**Les variables de parité sont refusées, pas ignorées.** `d`, `k`, `p`, `w`, `n`,
`i`, `j` dérivent de `mod(i, 2.0)` : elles n'ont pas de valeur définie *entre*
deux sommets. C'est exactement la limite du §15 de `vue-premiere-personne.md`,
celle qui interdisait au marcheur de sonder en fractionnaire. Le nouveau moteur
évalue `surfacePoint(u, v)` en continu ; une forme qui dépend de l'indice de
sommet n'a pas de surface à parcourir. Refus explicite plutôt que valeur
inventée.

**Le coefficient d'une abréviation s'arrête aussi sur `)` et `,`.** Les seuls cas
où cela change quelque chose sont ceux où la regex d'origine produisait du GLSL
déséquilibré — donc du code qui ne compilait pas.

**Les familles de déformation** (`m()`, `o()`, `b()`, `a()`, `ce`/`se()`,
`tube()`…) ne sont pas reconnues : elles lisent des globales par sommet d'un
pipeline de déformation qui n'existe pas ici.

Les conventions de dérivation aux points non dérivables (`abs`, `sign`, `floor`,
`fract`, `min`, `max`, `step`, `pow` à exposant variable) sont un choix et non
une évidence ; elles sont écrites en tête de `prelude.wgsl.ts`.

---

## 6. Les points dégénérés sont signalés, pas maquillés

Là où la première forme fondamentale dégénère, `|∂P/∂u × ∂P/∂v| = 0` : il n'y a
pas de normale. La passe de surface pose un drapeau plutôt que d'inventer une
valeur crédible.

| Forme | sommets dégénérés | ce que c'est |
|---|---|---|
| Sphere | 258 | les deux pôles, 2 × 129 sommets |
| Sphere meridians | 258 | idem, en coordonnées sphériques |
| Pseudosphere | 93 | l'arête de rebroussement en u = 0, une rangée entière |
| Waves | 1 | l'origine, où `h(u, v)` n'est pas dérivable |

Les quatre comptes sont exactement ceux que la géométrie prédit, ce qui est le
seul contrôle qui vaille pour un drapeau.

Le repli moindres carrés de rang 1 — celui du §19 de `jeu-de-tir-sur-surface.md`,
sans lequel un agent reste coincé au pôle d'une sphère pour toujours — n'a rien à
faire ici : il appartient au pas métrique, donc à la passe d'agents de la
phase 2. La phase 1 se contente de dire où le problème se pose.

Détail de mesure appris au passage : les points d'échantillonnage des différences
finies étaient d'abord pris au centre du domaine. Ça tombait sur (0, 0), où
`h(u, v)` de Waves n'est pas dérivable et où la tangente en u de la pseudosphère
s'annule — le rapport d'erreur relative y explosait sans que rien ne soit faux.
Les fractions sont maintenant asymétriques, et une tangente nulle rend `null`
plutôt qu'un rapport qui ne veut rien dire.

---

## 7. Ce qui reste ouvert

**La présentation sur canvas n'est pas mesurée** (§4.3). À vérifier sur une
machine avec un vrai adaptateur, en même temps que la prédiction du §3.2 sur les
transcendantes.

**Les entrées de la caméra ne sont pas mesurées.** L'état de la caméra l'est —
épinglé, rejoué, image identique au pixel — mais le glisser-déposer et la molette
ne sont exercés que par la main. Pour une caméra orbitale sans inertie, l'écart
entre les deux est mince ; il n'est pas nul.

**Le blender, la symétrie et la déformation le long de la normale ne sont pas
portés**, délibérément (§2). Si une forme du jeu en a besoin un jour, ce sera une
décision, pas un oubli.

**La couche de rendu est minimale** : un pipeline, un éclairage frontal, une
teinte par élément d'aire dont l'échelle n'est pas normalisée. Les marqueurs et
les rubans arrivent avec les phases 2 et 3.

**Le domaine est symétrique** : u ∈ [−udef, +udef], comme le défaut du projet
d'origine. Le mode « curseurs sur un seul signe » n'est pas porté.

---

## 8. Pour la phase 2

L'intégration géodésique en compute, la caméra première personne par
lecture-retour. Preuve annoncée : *le grand cercle se referme sur une sphère, à
comparer aux 0,044 % mesurés dans le projet actuel.*

Trois choses de la phase 1 y servent directement :

- `surfaceFrame(u, v)` rend déjà les tangentes exactes, donc E, F, G exacts :
  le pas métrique n'a plus à les tirer d'un patch interpolé, et le plafond
  `maxCells` n'a plus de raison d'exister ;
- l'oracle CPU (`evalJs.ts`) évalue la même formule hors GPU : l'intégrateur de
  référence du §5 de la note de conception s'y branche sans rien ajouter ;
- le harnais sait déjà geler l'horloge, scripter des pas fixes et comparer bit à
  bit — c'est ce qu'exige la fermeture d'une géodésique.

Un chiffre à prendre tôt, et il est nommé dans la note de conception : **la
latence de la lecture-retour**. Elle n'est pas mesurée ici, parce que la phase 1
n'a pas de joueur dont la pose ferait le tour du GPU.

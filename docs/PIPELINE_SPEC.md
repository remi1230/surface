# Surface — Spécification du pipeline paramétrique (pour analyse externe)

Ce document décrit **exactement** comment Surface transforme une équation
paramétrique `(u, v)` en position 3D `P(u, v)`, de façon à pouvoir reproduire
le calcul hors-ligne (Python/NumPy) et étudier la surface : première forme
fondamentale `(E, F, G)`, courbure de Gauss `K`, auto-intersections, points
singuliers.

Tout ce qui suit reflète le code de `js/GPUShaderMesh.js` (vertex shader),
`js/ui.js` (`replaceCpow`), `js/glo.js` (`regs`, défauts).

---

## 1. Vue d'ensemble du pipeline

```
expression compacte (ex: "vcu")
        │  (1) transformExpressionToGLSL  — purement textuel, voir §5
        ▼
expression GLSL (ex: "(v)*cos(u)")
        │  (2) évaluation numérique avec u, v et les constantes/coefficients
        ▼
coordonnées brutes (px, py, pz) selon le système de coordonnées  — §3
        │  (3) rotations d'équation (alpha/beta/theta)            — §4
        ▼
P_eq(u, v)   ← C'EST LA "SURFACE PURE" à étudier
        │  (4) blender (optionnel)                                — §6
        │  (5) symétrie (copies)                                  — §6
        │  (6) déformation le long de la normale (optionnel)      — §6
        ▼
position finale rendue (NE PAS utiliser pour l'étude différentielle)
```

**Pour l'étude différentielle (E,F,G,K, singularités), s'arrêter à `P_eq(u,v)`
(étape 3).** Les étapes 4–6 sont des effets visuels optionnels ; par défaut
elles sont neutres (identité). Le détail est en §6 pour exhaustivité.

---

## 2. Domaine, échantillonnage, variables disponibles

### Domaine
- `u ∈ [min_u, max_u]`, `v ∈ [min_v, max_v]`.
- Par défaut le domaine est **symétrique** : `min_u = -U0`, `max_u = +U0` avec
  `U0 = glo.params.u` (défaut `π`). Idem `v` avec `glo.params.v` (défaut `π`).
  (Sauf option "un seul signe" où `min = 0`.)
- Grille régulière : `stepsU+1` points en u, `stepsV+1` en v (défaut 132 chacun).
  - `step_u = (max_u - min_u) / stepsU`, et `u_i = min_u + i*step_u`,
    `i = 0..stepsU`. Idem v.

### Variables utilisables dans une expression
| Symbole | Sens |
|---|---|
| `u`, `v` | paramètres de surface |
| `t` | temps d'animation (mettre `t = 0` pour une étude statique) |
| `A,B,C,D,E,F,G,H,I,J,K,L,M` | coefficients réglables (sliders). **Défauts :** `A=B=C=D=E=F=0`, `G=H=I=J=K=L=1`, `M=64` |
| `P,Q,S,T,U` | variables "user" (surtout fragment) — défauts `P=64,Q=64,S=12,T=0,U=2` |
| Constantes | `pi`/`PI = π`, `e`/`ep = 2.718281828…`, `Q = √2 = 1.41421356…`, `Z = φ = 1.61803398…` |

> ⚠️ **Collision de noms** : `E` et `Q` sont à la fois une constante ET un
> coefficient/constante selon le contexte. Dans le **vertex** (calcul de
> position), `E` est le **coefficient** (défaut 0) et `Q`=√2, `Z`=φ.
> Voir §5 pour l'ordre exact des substitutions, qui lève l'ambiguïté.

---

## 3. Systèmes de coordonnées : coordonnées brutes `(px, py, pz)`

L'utilisateur saisit 3 expressions. Leur rôle dépend du `typeCoords`.
On note `fx, fy, fz` les expressions **après** passage en GLSL (§5), évaluées
numériquement. Convention **y-up**.

### 3a. Cartésien (`cartesian`)
Le plus simple :
```
px = fx(u,v)
py = fy(u,v)
pz = fz(u,v)
```
(défauts d'usine : `fx="u"`, `fy="u*sin(v)"`, `fz="u*cos(v)*sin(u)"`).

### 3b. Sphérique (`spheric`)
Les 3 entrées sont `R, RotY, RotZ` (champs X, Y, Z de l'UI) :
```
R    = fx(u,v)        # entrée X = rayon
rotY = fy(u,v)        # entrée Y = angle de rotation autour de Y
rotZ = fz(u,v)        # entrée Z = angle de rotation autour de Z
```
Le point est construit ainsi (ordre : RotationY **puis** RotationZ) :
```
pt = RotationZ(rotZ) · RotationY(rotY) · (uFirstPoint * R)
(px, py, pz) = pt
```
- `uFirstPoint` est un vecteur réglable, **défaut `(1, 0, 0)`**.
- Matrices de rotation : voir §4.

> Note d'implémentation (pour qui lit le code) : le code interne échange
> `alpha`/`beta` entre le constructeur et `getPositionGLSL`, ce qui fait que
> `equa.alpha` (entrée Y) finit comme rotation **Y** et `equa.beta` (entrée Z)
> comme rotation **Z**. Le résultat net est celui ci-dessus (déjà démêlé) ;
> inutile de reproduire le swap.

### 3c. Cylindrique (`cylindrical`)
Entrées `R, RotZ, Hauteur` :
```
R      = f_x(u,v)
alpha  = f_y(u,v)       # rotation Z
height = f_z(u,v)       # hauteur z

pt  = RotationZ(alpha) · (uFirstPoint * R)
px  = pt.x
py  = pt.y
pz  = height
```

---

## 4. Rotations d'équation (alpha/beta/theta) — étape 3

Après les coordonnées brutes `(px,py,pz)`, on applique jusqu'à 3 rotations
issues de champs d'équation **séparés** (souvent vides = identité). Ce sont
`theta` (rot X), `beta` (rot Y), `alpha` (rot Z), évaluées comme des angles
(fonctions de u,v,t…). Elles sont appliquées **dans cet ordre : X puis Y puis Z**.

> En cartésien : `theta, beta, alpha` = entrées "ROT X / ROT Y / ROT Z".
> En sphérique/cylindrique : ce sont des rotations **secondaires** (`alpha2,
> beta2, theta` dans le code) appliquées après §3b/§3c.

### Conventions exactes (copiées du shader)

```
# Rotation X (theta) — modifie y,z
y' =  y*cos(theta) - z*sin(theta)
z' =  y*sin(theta) + z*cos(theta)

# Rotation Y (beta) — modifie x,z   (signe "inversé" classique)
x' =  x*cos(beta) + z*sin(beta)
z' = -x*sin(beta) + z*cos(beta)

# Rotation Z (alpha) — modifie x,y
x' =  x*cos(alpha) - y*sin(alpha)
y' =  x*sin(alpha) + y*cos(alpha)
```

`rotateAxis(axis, angle)` (utilisé en sphérique/cylindrique §3) est la matrice
de **Rodrigues** standard autour d'un axe unitaire :
```
R = I*cos θ + (1-cos θ) (a aᵀ) + sin θ [a]_×
```
avec `a` normalisé. Pour `a=(0,1,0)` (RotationY) et `a=(0,0,1)` (RotationZ)
cela coïncide avec les rotations canoniques.

➡️ **`P_eq(u, v)` = sortie de cette étape.** C'est la surface à analyser.

---

## 5. `transformExpressionToGLSL` — la transformation texte→GLSL

C'est **purement syntaxique** (regex), appliqué AVANT toute évaluation. Pour
reproduire en Python, il faut soit réimplémenter ces règles, soit — **bien plus
simple** — me demander de t'exporter directement l'expression déjà transformée
(voir §7, "ce que je peux te fournir"). Ordre des opérations :

1. **Substitution macro X/Y** : les `X`/`Y` majuscules dans une expression sont
   remplacés par deux "méta-expressions" `textInputEvalX`/`textInputEvalY`
   (souvent vides → pas de substitution). À ignorer si tu reçois l'expression
   finale.
2. **`replaceCpow`** : l'opérateur custom **`***`** (trois étoiles) =
   "puissance signée" `cpow(base, exposant)` où
   `cpow(val, p) = sign(val) * |val|^p`. Gère les opérandes parenthésés des
   deux côtés. **`a***b` → `cpow(a, b)`**.
3. **Règles `glo.regs`** (longue liste de regex). Les plus importantes :
   - Trig compacte : `cu → cos(u)`, `su → sin(u)`, `cv→cos(v)`, `sv→sin(v)`,
     `cx→cos(x)`, `sR→sin(R)`, etc. Forme générale : un `c`/`s` suivi d'un
     groupe puis d'une variable devient `cos(groupe·variable)`.
   - `R` (seul) → `h(x,y,z)` = `length(x,y,z)` = `√(x²+y²+z²)`.
   - `²` → `**2`, `³` → `**3`.
   - **Multiplication implicite** : `2u → 2*u`, `uv → u*v`, `Au → A*u`,
     `)x → )*x`, `2cu → 2*cos(u)`… (une longue série insère les `*` manquants).
   - `a`,`b`,`o`,`m` seuls → appels de fonctions de déformation `a()`,`b()`,…
     (rare dans une équation de position).
4. **Constantes** : `PI`,`pi`→`3.14159265358979` ; `ep`,`e`→`2.71828182845905` ;
   `Q`→`1.41421356237310` (√2) ; `Z`→`1.61803398874989` (φ).
5. **`**` → `pow(base, exp)`** (puissance GLSL standard).
6. **Floats** : tout entier nu reçoit `.0` (`2`→`2.0`) — sans effet numérique.

`hypot`/`h(...)` → `length(vec(...))`. `cpow(v,p)=sign(v)·|v|^p`.

> **Recommandation forte** : ne réimplémente pas §5. Demande l'expression
> **déjà en forme GLSL** (ou même déjà en Python/NumPy). C'est l'étape la plus
> source d'erreurs.

---

## 6. Étapes 4–6 (effets visuels) — par défaut neutres

À ignorer pour l'étude de la surface pure, sauf si explicitement activés.

- **Blender (§ étape 4)** : rotations supplémentaires dont l'angle dépend de `u`
  et de `O = atan2(y, length(x,z))`. Contrôlé par `blendU=(x,y,z)` et
  `blendO=(x,y,z)`, **défaut tout à 0 → identité**.
- **Symétrie (§ étape 5)** : génère `symX·symY·symZ` copies pivotées (ou additif).
  **Défaut 1×1×1 → une seule copie, identité.** Centre `uSymCenter` (défaut 0).
- **Déformation normale (§ étape 6)** : déplace le point le long de la normale,
  `P_final = P + N · d(u,v) · scaleNorm`, avec `d` une expression utilisateur
  (champ "Equation" de déformation). **Désactivée par défaut** (`d=0`).
- Les **normales** elles-mêmes sont calculées par le moteur en **différences
  finies** : `N = normalize(cross(∂P/∂u, ∂P/∂v))` avec un pas `eps=1e-3`
  (`Pu = P(u+eps,v)`, `Pv = P(u,v+eps)`). Tu peux faire mieux analytiquement.

> Note : `uvCoeff` / `uvParamsCoeff` n'affectent **que le fragment shader**
> (couleur/UV), **pas** la position. À ignorer pour la géométrie.

---

## 7. Ce dont l'analyse a besoin — checklist d'export

Pour chaque forme à étudier, fournir :

1. **`typeCoords`** : `cartesian` | `spheric` | `cylindrical` (détermine §3).
2. **Les 3 expressions** `fx, fy, fz` — idéalement **en 2 versions** :
   - la version compacte (telle que tapée),
   - **la version transformée** (GLSL ou Python), pour éviter de réimplémenter §5.
3. **Les rotations d'équation** `alpha/beta/theta` (et `alpha2/beta2` en
   sphérique/cylindrique) si non vides — sinon préciser "toutes nulles".
4. **Domaine** : `min_u, max_u, min_v, max_v` (+ `stepsU, stepsV` si tu veux la
   même grille).
5. **Valeurs des coefficients** utilisés : ceux parmi `A..M, P..U` qui
   apparaissent dans les expressions, avec leur valeur courante.
6. **`uFirstPoint`** (sphérique/cylindrique) si ≠ `(1,0,0)`.
7. **`t`** : valeur figée (0 pour statique) ou plage si étude dynamique.
8. État des effets §6 (blender/symétrie/déformation) : "neutres" dans 99% des cas.

### Pseudo-référence Python (cartésien, statique)
```python
import numpy as np

def P_eq(u, v, A=0,B=0,C=0,D=0,E=0,F=0,G=1,H=1,I=1,J=1,K=1,L=1,M=64, t=0.0):
    # fx, fy, fz : versions DÉJÀ transformées (§5). Forme "Helical" = "vcu","suv","u".
    # ATTENTION au piège : "suv" -> sin(u)*v  (et NON sin(u*v)) !
    # C'est précisément pourquoi il faut demander l'expression transformée, pas la deviner.
    px = v*np.cos(u)
    py = np.sin(u)*v
    pz = u
    # rotations d'équation (ici toutes nulles) — sinon appliquer X→Y→Z (§4)
    return np.array([px, py, pz])

# grille
U0 = np.pi; V0 = np.pi; nU = nV = 132
uu = np.linspace(-U0, U0, nU+1)
vv = np.linspace(-V0, V0, nV+1)
```

### Première forme fondamentale & courbure de Gauss (rappel)
```
P_u = ∂P/∂u,  P_v = ∂P/∂v
E = P_u·P_u,  F = P_u·P_v,  G = P_v·P_v
n = (P_u × P_v) / |P_u × P_v|
L = P_uu·n,   M = P_uv·n,   N = P_vv·n
K = (L·N - M²) / (E·G - F²)
```
Singularités numériques : `|P_u × P_v| ≈ 0` (la métrique dégénère).
Auto-intersections : tester collisions de triangles non adjacents de la grille.

---

## 8. Récapitulatif des défauts (statique, sans effet)

```
t = 0
A=B=C=D=E=F=0   G=H=I=J=K=L=1   M=64
P=64 Q_user=64 S=12 T=0 U=2          # (variables "user", surtout fragment)
constantes: pi=π, e=2.71828182845905, Q=√2=1.41421356, Z=φ=1.61803399
uFirstPoint=(1,0,0)
domaine u,v ∈ [-π, +π], stepsU=stepsV=132
blender=0, symétrie=1×1×1, déformation OFF
```

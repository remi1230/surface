# SURFACE - Visualisateur de Surfaces Paramétriques 3D

**SURFACE** est une application web interactive permettant de visualiser et manipuler des surfaces mathématiques paramétriques en 3D. Elle offre un environnement complet pour explorer des formes géométriques complexes, personnaliser leur apparence via des shaders GLSL, et exporter les créations.

![Babylon.js](https://img.shields.io/badge/Babylon.js-5.x-blue)
![WebGL](https://img.shields.io/badge/WebGL-2.0-green)
![GLSL](https://img.shields.io/badge/GLSL-Shaders-orange)

---

## Table des matières

1. [Présentation](#présentation)
2. [Fonctionnalités](#fonctionnalités)
3. [Technologies utilisées](#technologies-utilisées)
4. [Structure du projet](#structure-du-projet)
5. [Guide d'utilisation](#guide-dutilisation)
6. [Systèmes de coordonnées](#systèmes-de-coordonnées)
7. [Fonctions mathématiques disponibles](#fonctions-mathématiques-disponibles)
8. [Système de shaders](#système-de-shaders)
9. [Raccourcis clavier](#raccourcis-clavier)
10. [Architecture technique](#architecture-technique)
11. [Pipeline de rendu](#pipeline-de-rendu)

---

## Présentation

SURFACE permet de :

- **Définir des surfaces** à l'aide d'équations mathématiques paramétriques `x(u,v)`, `y(u,v)`, `z(u,v)`
- **Visualiser en temps réel** les surfaces 3D avec rendu WebGL haute performance
- **Appliquer différents systèmes de coordonnées** : Cartésien, Sphérique, Cylindrique, Quaternion
- **Personnaliser l'apparence** via des shaders GLSL personnalisés
- **Transformer les surfaces** : symétrie, déformation, fractales
- **Exporter les modèles 3D** aux formats OBJ, JSON, Babylon.js

---

## Fonctionnalités

### Surfaces prédéfinies
Plus de **60 surfaces mathématiques** prêtes à l'emploi :
- Formes classiques : Tore, Sphère, Cylindre, Cône
- Surfaces minimales : Caténoïde, Hélicoïde, Surface d'Enneper
- Formes topologiques : Ruban de Möbius, Bouteille de Klein
- Surfaces artistiques : Cœur, Coquillage, Rose
- Et bien d'autres...

### Équations personnalisées
Saisissez vos propres équations mathématiques pour créer des surfaces uniques.

### Transformations
- **Symétrie rotationnelle** : Dupliquez la surface autour d'un axe
- **Déformation** : Appliquez des déformations mathématiques aux vertices
- **Fractales** : Générez des fractales récursives à partir d'une surface

### Éditeur de shaders
- Éditeur Monaco (VS Code) intégré avec coloration syntaxique GLSL
- Création, modification et sauvegarde de shaders personnalisés
- Validation en temps réel du code GLSL
- Stockage local (localStorage) des shaders

### Export/Import
- Export aux formats OBJ, JSON, Babylon.js
- Sauvegarde et chargement des configurations de shaders

---

## Technologies utilisées

| Technologie | Rôle |
|-------------|------|
| **[Babylon.js](https://www.babylonjs.com/)** | Moteur de rendu 3D WebGL |
| **WebGL 2.0** | API graphique bas niveau |
| **GLSL** | Langage de shaders pour vertex et fragment shaders |
| **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** | Éditeur de code (utilisé dans VS Code) |
| **[Materialize CSS](https://materializecss.com/)** | Framework CSS Material Design |
| **Babylon.GUI** | Interface utilisateur 3D intégrée à la scène |
| **jQuery** | Manipulation du DOM |
| **JavaScript ES6+** | Classes, async/await, modules |
| **localStorage** | Persistance des données côté client |

---

## Structure du projet

```
surface/
├── index.html              # Point d'entrée principal
├── README.md               # Ce fichier
├── css/
│   └── surface.css         # Styles personnalisés (éditeur de shaders, UI)
├── js/                     # Logique applicative
│   ├── glo.js              # Variables globales et surfaces prédéfinies
│   ├── bab.js              # Initialisation Babylon.js et moteur de jeu
│   ├── classes.js          # Classes de systèmes de coordonnées
│   ├── prototypes.js       # Extensions des prototypes Babylon.js
│   ├── shaders.js          # Vertex et fragment shaders GLSL
│   ├── shaders-crud.js     # Opérations CRUD sur les shaders
│   ├── shaders-loader.js   # Chargement/sauvegarde des shaders
│   ├── shaders-frags.js    # Bibliothèque de fragment shaders
│   ├── calcul.js           # Calculs des courbes de surface
│   ├── ribbon.js           # Création de maillages (mesh/ribbon)
│   ├── colors.js           # Gestion des couleurs et matériaux
│   ├── functions.js        # Fonctions mathématiques pour équations
│   ├── transform.js        # Transformations géométriques
│   ├── normal.js           # Déformation des normales
│   ├── ui.js               # Création des contrôles UI
│   ├── gui.js              # Configuration Babylon.GUI
│   ├── grid.js             # Visualisation de la grille
│   ├── modals.js           # Gestion des fenêtres modales
│   ├── events.js           # Événements clavier et interactions
│   └── tests.js            # Validation des équations
├── cdn/                    # Bibliothèques externes
│   ├── css/
│   │   └── materialize/    # Framework Materialize CSS
│   └── js/
│       ├── babylon/        # Moteur Babylon.js + extensions
│       ├── materialize/    # JavaScript Materialize
│       ├── monaco/         # Éditeur Monaco
│       └── jquery.min.js
└── stats/                  # Monitoring de performance
```

---

## Guide d'utilisation

### 1. Sélection d'une surface

Utilisez le panneau latéral gauche pour choisir parmi les surfaces prédéfinies. Cliquez sur le nom d'une surface pour l'afficher instantanément.

### 2. Paramètres U et V

Les surfaces paramétriques sont définies sur un domaine `[u_min, u_max] × [v_min, v_max]`. Ajustez ces valeurs avec les sliders :

- **U min / U max** : Plage du paramètre u
- **V min / V max** : Plage du paramètre v
- **Steps U / Steps V** : Résolution du maillage (nombre de subdivisions)

> Plus le nombre de steps est élevé, plus la surface est détaillée (mais plus lente à calculer).

### 3. Équations personnalisées

Saisissez vos propres équations dans les champs `x(u,v)`, `y(u,v)`, `z(u,v)`. Par exemple, pour un tore :

```
x = (2 + cos(v)) * cos(u)
y = (2 + cos(v)) * sin(u)
z = sin(v)
```

### 4. Variables utilisateur (A à L)

Utilisez les variables `a`, `b`, `c`, ..., `l` dans vos équations. Leurs valeurs sont ajustables via les sliders correspondants.

Exemple :
```
x = (a + cos(v)) * cos(u)    // 'a' contrôle le rayon du tore
```

### 5. Rotation et orientation

- **Alpha, Beta, Theta** : Angles d'Euler pour orienter la surface
- **Axe de rotation** : Choisissez l'axe de rotation (X, Y, Z)

### 6. Couleurs

- **Couleur émissive** : Couleur de la lumière émise par la surface
- **Couleur diffuse** : Couleur de la surface sous éclairage

### 7. Mode fil de fer

Activez le mode wireframe pour voir uniquement les arêtes du maillage.

### 8. Shaders personnalisés

Ouvrez l'éditeur de shaders pour modifier l'apparence de la surface via du code GLSL.

---

## Systèmes de coordonnées

L'application supporte plusieurs systèmes de coordonnées, permettant de définir les surfaces de différentes manières :

### Cartésien (par défaut)
```
Position = (x, y, z)
x = f(u, v)
y = g(u, v)
z = h(u, v)
```

### Sphérique
```
Position dérivée de (r, θ, φ)
r = rayon
θ = azimut (angle horizontal)
φ = élévation (angle vertical)
```
Conversion : `x = r·sin(φ)·cos(θ)`, `y = r·sin(φ)·sin(θ)`, `z = r·cos(φ)`

### Cylindrique
```
Position dérivée de (ρ, θ, z)
ρ = distance à l'axe Z
θ = angle autour de l'axe Z
z = hauteur
```
Conversion : `x = ρ·cos(θ)`, `y = ρ·sin(θ)`, `z = z`

### Quaternion
Système avancé utilisant les quaternions pour les rotations, utile pour éviter le gimbal lock.

### Courbure
Système spécialisé basé sur la courbure locale de la surface.

**Changer de système** : Appuyez sur la touche `S` ou utilisez le sélecteur dans l'interface.

---

## Fonctions mathématiques disponibles

Utilisez ces fonctions dans vos équations :

### Trigonométrie
| Fonction | Description |
|----------|-------------|
| `cos(x)` | Cosinus |
| `sin(x)` | Sinus |
| `tan(x)` | Tangente |
| `acos(x)` | Arc cosinus |
| `asin(x)` | Arc sinus |
| `atan(x)` | Arc tangente |
| `atan2(y, x)` | Arc tangente à deux arguments |
| `cosh(x)` | Cosinus hyperbolique |
| `sinh(x)` | Sinus hyperbolique |
| `tanh(x)` | Tangente hyperbolique |

### Algèbre
| Fonction | Description |
|----------|-------------|
| `pow(x, n)` | Puissance x^n |
| `sqrt(x)` | Racine carrée |
| `abs(x)` | Valeur absolue |
| `sign(x)` | Signe (-1, 0, ou 1) |
| `exp(x)` | Exponentielle e^x |
| `log(x)` | Logarithme naturel |
| `log10(x)` | Logarithme base 10 |

### Utilitaires
| Fonction | Description |
|----------|-------------|
| `min(a, b)` | Minimum |
| `max(a, b)` | Maximum |
| `floor(x)` | Partie entière inférieure |
| `ceil(x)` | Partie entière supérieure |
| `round(x)` | Arrondi |
| `hypot(x, y)` | Hypoténuse √(x² + y²) |

### Fonctions spéciales
| Fonction | Description |
|----------|-------------|
| `factorial(n)` | Factorielle n! |
| `fibonacci(n)` | Nombre de Fibonacci |
| `mx`, `my`, `mz` | Référence aux valeurs précédentes (séquentiel) |

### Constantes
| Constante | Valeur |
|-----------|--------|
| `PI` | 3.14159... |
| `E` | 2.71828... |

---

## Système de shaders

### Architecture des shaders

L'application utilise des shaders GLSL personnalisés pour le rendu :

#### Vertex Shader
Transforme les positions des vertices et calcule les déformations :
```glsl
// Exemple de déformation sinusoïdale
vec3 deformedPosition = position + normal * sin(time + position.x);
```

#### Fragment Shader
Détermine la couleur de chaque pixel :
```glsl
// Exemple de coloration basée sur la normale
vec3 color = normalize(vNormal) * 0.5 + 0.5;
gl_FragColor = vec4(color, 1.0);
```

### Utilisation de l'éditeur

1. Ouvrez l'éditeur de shaders (bouton ou touche dédiée)
2. Modifiez le code GLSL avec la coloration syntaxique
3. Les erreurs de compilation sont affichées en temps réel
4. Sauvegardez vos shaders dans le localStorage

### Variables disponibles dans les shaders

| Variable | Type | Description |
|----------|------|-------------|
| `vPosition` | `vec3` | Position du vertex dans l'espace monde |
| `vNormal` | `vec3` | Normale à la surface |
| `vUV` | `vec2` | Coordonnées UV (u, v) paramétriques |
| `time` | `float` | Temps écoulé (pour animations) |
| `emissiveColor` | `vec3` | Couleur émissive définie par l'utilisateur |
| `diffuseColor` | `vec3` | Couleur diffuse définie par l'utilisateur |

### CRUD des shaders

- **Créer** : Nouveau shader avec nom personnalisé
- **Lire** : Charger un shader existant
- **Modifier** : Éditer et sauvegarder les modifications
- **Supprimer** : Retirer un shader de la liste

Les shaders sont persistés dans le `localStorage` du navigateur.

---

## Raccourcis clavier

### Navigation
| Touche | Action |
|--------|--------|
| `+` / `-` | Zoom avant / arrière |
| `Flèches` | Ajuster les valeurs des sliders |
| `Clic gauche + glisser` | Rotation de la caméra |
| `Clic droit + glisser` | Panoramique |
| `Molette` | Zoom |

### Contrôles généraux
| Touche | Action |
|--------|--------|
| `S` | Changer de système de coordonnées |
| `E` | Exporter le maillage |
| `F` | Fractalisé le maillage |
| `D` | Basculer thème sombre/clair |
| `W` | Mode fil de fer (wireframe) |
| `G` | Afficher/masquer la grille |
| `H` | Aide (raccourcis et documentation) |

### Construction pas à pas
| Touche | Action |
|--------|--------|
| `R` | Réinitialiser la construction |
| `Espace` | Étape suivante |

### Animations
| Touche | Action |
|--------|--------|
| `A` | Démarrer/arrêter l'animation |
| `T` | Activer la déformation temporelle |

---

## Architecture technique

### Classes principales

#### `Game` (bab.js)
Classe principale gérant le moteur Babylon.js :
```javascript
class Game {
    constructor() {
        this.engine = new BABYLON.Engine(canvas);
        this.scene = new BABYLON.Scene(this.engine);
        this.camera = new BABYLON.ArcRotateCamera(...);
    }

    render() {
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }
}
```

#### Classes de coordonnées (classes.js)

Hiérarchie de classes pour les différents systèmes de coordonnées :

```javascript
class CurveBase {
    // Classe abstraite de base
    calculate(u, v) { /* ... */ }
}

class CurvesCartesian extends CurveBase {
    // x = f(u,v), y = g(u,v), z = h(u,v)
}

class CurvesSpherical extends CurveBase {
    // r, θ, φ → conversion en x, y, z
}

class CurvesCylindrical extends CurveBase {
    // ρ, θ, z → conversion en x, y, z
}

class CurvesQuaternion extends CurveBase {
    // Rotation par quaternions
}
```

### Gestion des données de maillage

Structure des données de vertex :
```javascript
{
    positions: Float32Array,  // Coordonnées XYZ [x1,y1,z1, x2,y2,z2, ...]
    normals: Float32Array,    // Normales [nx1,ny1,nz1, ...]
    indices: Uint32Array,     // Indices des triangles
    uvs: Float32Array,        // Coordonnées UV [u1,v1, u2,v2, ...]
    colors: Float32Array      // Couleurs RGBA (optionnel)
}
```

### Patron de conception utilisés

1. **Singleton** : Instance unique du moteur de jeu
2. **Strategy** : Différentes stratégies de calcul selon le système de coordonnées
3. **Observer** : Les contrôles GUI observent et réagissent aux changements
4. **Factory** : Création de maillages selon les paramètres

---

## Pipeline de rendu

```
┌─────────────────────────────────────────────────────────────────┐
│                        ENTRÉE UTILISATEUR                        │
│     (Équations, paramètres U/V, variables A-L, couleurs)        │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDATION DES ÉQUATIONS                      │
│                         (tests.js)                               │
│    - Parse les expressions mathématiques                         │
│    - Vérifie la syntaxe                                         │
│    - Détecte les erreurs                                        │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CALCUL DES COURBES                            │
│               (classes.js + calcul.js)                           │
│    - Itère sur la grille u × v                                  │
│    - Évalue les équations pour chaque (u, v)                    │
│    - Applique la conversion de coordonnées                      │
│    - Calcule les normales                                       │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CRÉATION DU MAILLAGE                           │
│                       (ribbon.js)                                │
│    - Génère les triangles (indices)                             │
│    - Crée le VertexData Babylon.js                              │
│    - Applique les couleurs de vertex                            │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│               APPLICATION DU MATÉRIAU / SHADER                   │
│                       (colors.js)                                │
│    - Crée le ShaderMaterial si shader personnalisé              │
│    - Configure les uniforms (couleurs, temps, etc.)             │
│    - Applique le matériau au maillage                           │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RENDU BABYLON.JS                            │
│                         (bab.js)                                 │
│    ┌─────────────────────────────────────────────────────┐      │
│    │              VERTEX SHADER (GPU)                     │      │
│    │  - Transforme les positions des vertices            │      │
│    │  - Applique les déformations                        │      │
│    │  - Passe les varyings au fragment shader           │      │
│    └─────────────────────────────────────────────────────┘      │
│                              │                                   │
│                              ▼                                   │
│    ┌─────────────────────────────────────────────────────┐      │
│    │            FRAGMENT SHADER (GPU)                     │      │
│    │  - Calcule la couleur de chaque pixel               │      │
│    │  - Applique l'éclairage                             │      │
│    │  - Écrit dans le framebuffer                        │      │
│    └─────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AFFICHAGE CANVAS                          │
│                      (viewport WebGL)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Performance

### Limites recommandées

| Paramètre | Valeur recommandée | Maximum |
|-----------|-------------------|---------|
| Steps U | 100-200 | 512 |
| Steps V | 100-200 | 512 |
| Vertices totaux | ~40 000 | ~262 000 |

### Optimisations

- **Décimation de maillage** : Réduit le nombre de polygones pour les surfaces complexes
- **Culling** : Les faces arrière ne sont pas rendues
- **LOD** : Niveau de détail adaptatif (si activé)
- **Shader compilation caching** : Les shaders compilés sont mis en cache

---

## Navigateurs supportés

- Chrome 80+ (recommandé)
- Firefox 75+
- Safari 14+
- Edge 80+

> **Note** : WebGL 2.0 est requis pour certaines fonctionnalités avancées.

---

## Licence

Ce projet est distribué sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Forker le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commiter vos changements (`git commit -m 'Ajout d'une nouvelle fonctionnalité'`)
4. Pusher vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

---

## Auteur

Développé avec passion pour l'exploration mathématique et la visualisation 3D.

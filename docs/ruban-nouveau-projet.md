# Ruban — note de conception d'un nouveau projet

Troisième note de la série, après `vue-premiere-personne.md` et
`jeu-de-tir-sur-surface.md`. Celles-là décrivaient ce qu'on a construit *dans*
l'application de maillage. Celle-ci décrit un projet **séparé** : un jeu autonome,
sur son propre dépôt, qui reprend le socle géométrique et le porte sur WebGPU.

> **État au 31/07/2026** — conception seule, aucune ligne écrite. Ce document
> existe pour qu'une session future puisse démarrer à froid sans rien savoir de
> la conversation qui l'a produit. Tout ce qui est chiffré ici a été mesuré dans
> le projet actuel ; tout ce qui ne l'est pas est signalé comme tel.
>
> **Mise à jour, même jour** — la phase 1 est écrite et mesurée. Le code vit
> dans `ruban/`, son compte rendu dans `ruban/docs/phase-1-squelette.md`. La
> recette annoncée au §4 est passée : le maillage coïncide avec celui de
> l'application actuelle **au bit près sur 11 formes sur 12**, la douzième à un
> ulp. Deux choses de ce document sont à corriger à sa lecture : le nouveau
> projet n'a pas (encore) son propre dépôt, voir §7 ; et TypeScript a été retenu,
> voir §3.3.

---

## 1. Ce qu'on emporte, et ce qu'on laisse

Le capital accumulé n'est pas le code, c'est une poignée de résultats mesurés.
Ils sont détaillés dans les deux notes précédentes ; voici ceux qui commandent
l'architecture du nouveau projet.

| Résultat | Mesuré | Conséquence ici |
|---|---|---|
| La sonde GPU coûte par **appel**, pas par point : 4 échantillons ≈ 144 | `vue-premiere-personne.md` §12 | C'est la raison d'être de tout l'échafaudage actuel — et c'est ce que WebGPU supprime (§3) |
| Cap monde reprojeté dans le plan tangent = transport parallèle discret | `jeu-de-tir-sur-surface.md` §1 | Les géodésiques sont gratuites, sans symboles de Christoffel. On garde tel quel |
| Fermeture d'une géodésique à 0,044 % de l'échelle du maillage | §13 | Sert de test d'acceptation à la phase 2 |
| Gravité alignée sur la normale, pas sur −Y monde | §1 | Une règle pour le marcheur et le projectile. On garde |
| Collision par segment balayé, 50/50 impacts de 60 à 10 img/s | §14 | On garde. Un test point-à-point rate tout en dessous de 20 img/s |
| Repli moindres carrés de rang 1 aux points dégénérés | §15 | Sans lui, un agent reste coincé au pôle d'une sphère pour toujours |
| Aucune géodésique ne fait le tour d'un Möbius (0 sur 40 401 caps) | cette note, §2 | Une règle du jeu, pas un bug |
| Babylon efface la profondeur **entre groupes de rendu** | §17 | Une des deux raisons de quitter Babylon (§3) |

Ce qu'on laisse : l'interface de maillage, l'éditeur de shaders, l'historique,
les modales, le rig de cinéma. Le nouveau projet est un jeu, pas un atelier.

---

## 2. Le jeu : peindre en allant tout droit

**Le principe.** On prend du terrain en le parcourant. La trajectoire peint une
bande à sa couleur ; repasser sur la peinture d'un adversaire la reprend. Le
score est **l'aire réelle** détenue, pas l'aire paramétrique.

**Pourquoi c'est un jeu et pas une démo.** Parce que la géométrie décide, et
qu'elle décide différemment selon la forme :

- **Sphère** — toute ligne droite se referme en grand cercle. On peint un anneau
  et on retombe sur sa propre trace. Le territoire est une bande, jamais une
  nappe.
- **Tore** — la pente du cap change tout. Rationnelle, elle boucle en une petite
  boucle fermée ; irrationnelle, elle couvre le tore de façon dense. *Choisir son
  cap, c'est arbitrer entre un petit territoire garanti et une couverture large
  mais lente.* Décision réelle, réponse mathématique réelle.
- **Möbius** — on a démontré qu'aucune géodésique n'en fait le tour : le lieu de
  dérive nulle est à `v ≈ −1,6`, hors d'une bande qui s'arrête à `v = ±1`, et il
  est répulsif. Le bord devient l'adversaire principal.
- **Selle** — courbure négative, les géodésiques divergent : la bande s'évase
  toute seule.

La compétence, c'est lire la surface. Le jeu enseigne la géométrie différentielle
en se jouant.

**Les projectiles** sont des bombes de peinture qui suivent une géodésique :
peindre à distance sans s'exposer. Sur une sphère, le tir revient dans le dos.

**La forme dynamique n'est pas un décor.** Quand la surface respire, l'élément
d'aire `√(EG − F²)` change : la même région peinte vaut plus ou moins selon le
moment. Un territoire pris dans un creux se déplie et prend de la valeur. Aucun
autre moteur ne peut offrir ça, parce qu'aucun autre ne connaît la métrique.

**Repli de périmètre.** Si la peinture traîne, le même socle porte une course
géodésique en contre-la-montre — beaucoup plus petite, rien à jeter.

---

## 3. Le socle : WebGPU, sans moteur

### 3.1 Le changement qui justifie le reste

Dans le projet actuel, la sonde existe parce que **le CPU ne peut pas évaluer une
formule qui vit dans un shader**. D'où tout l'échafaudage : patch de 16
échantillons, interpolation bicubique, plafond `maxCells` pour ne pas sortir du
patch sondé, un appel de sonde par frame à orchestrer.

En WebGPU, les agents tournent dans un compute shader et **appellent directement
`surfacePoint(u, v)`**. Il n'y a plus de patch, plus d'interpolation, plus de
plafond de déplacement. Cela supprime d'un coup :

- l'erreur d'interpolation bilinéaire/bicubique ;
- les trois quarts de `agents.js` ;
- le bridage aux pôles resté ouvert (12 % de la vitesse demandée), qui n'existait
  que parce que le patch n'était sondé qu'autour d'une cellule.

La lecture-retour se réduit à **un petit tampon par frame** : la pose du joueur
pour la caméra, et les événements de collision.

### 3.2 Pourquoi pas Babylon

Le jeu utilise environ 2 % du moteur : pas de graphe de scène, pas de PBR, pas
d'ombres, pas de chargement d'assets. Trois pipelines de rendu suffisent
(surface, marqueurs, rubans). En face, on a payé deux vrais bugs pour avoir
combattu ses hypothèses — la profondeur effacée entre groupes de rendu, et les
instances fines qui cassaient au rebuild du maillage — pour 3 Mo de bundle.
Three.js pose le même problème et sa couche WebGPU/TSL bouge encore.

### 3.3 La pile

| Couche | Choix |
|---|---|
| GPU | WebGPU brut, fine couche maison (~800 lignes estimées) |
| Langage | TypeScript + Vite |
| Maths | à la main (vec3/mat4, ~200 lignes) |
| Tests | Playwright + implémentation de référence en JS |

TypeScript est le seul choix à rediscuter : le projet actuel est en JS sans build,
et Vite change la boucle de travail. Je le recommande parce que les dispositions
mémoire des tampons GPU — offsets des champs d'agent, alignements WGSL — sont
exactement ce que le typage attrape et que les commentaires n'attrapent pas.
Rester en JS + JSDoc est un repli acceptable.

> **Retenu en phase 1** : TypeScript + Vite. Le harnais de mesure, lui, est en
> JS pur (`.mjs`) et lancé par Node sans build — il pilote le navigateur, il n'y
> tourne pas. La couche maison fait ~90 lignes pour le device et les tampons,
> loin des ~800 estimées, parce que la phase 1 n'a que deux tampons et deux
> pipelines ; l'estimation se jugera à la phase 4.

### 3.4 Les nombres duaux

Émettre la formule **deux fois** en WGSL : une version normale, une version où
chaque scalaire devient `(valeur, ∂/∂u, ∂/∂v)` et où chaque opération se relève
mécaniquement. On obtient les tangentes **exactes** au lieu de différences finies,
donc `E`, `F`, `G` exacts, la normale exacte et l'élément d'aire exact — en une
passe, sans échantillon supplémentaire.

C'est une amélioration franche sur l'existant, où les tangentes viennent d'un
patch interpolé.

### 3.5 Esquisse d'arborescence

```
core/
  formula.ts     — langage d'expressions des formes → WGSL (normal + dual)
  surface.ts     — passe de calcul : P, ∂P/∂u, ∂P/∂v, normale
  agents.ts      — passe de calcul : intégration géodésique de N agents
  paint.ts       — territoire : texture de stockage sur (u, v)
  probe.ts       — anneau de lecture-retour asynchrone
render/
  surfacePass.ts — le maillage, échantillonne la peinture
  markerPass.ts  — triangles facés
  ribbonPass.ts  — les traces
game/
  rules.ts  input.ts  hud.ts
test/
  harness Playwright, intégrateur de référence JS, trajectoires témoins
```

**Peinture** : texture de stockage sur le domaine `(u, v)`, un identifiant de
propriétaire par texel. Lue par le fragment shader de la surface — aucune
lecture-retour. **Score** : passe de réduction pondérée par `√(EG − F²)`, de sorte
que le territoire se mesure en aire réelle.

**Collisions** : `N²` suffit pour quelques centaines d'agents. Grille uniforme en
`(u, v)` si besoin plus tard.

---

## 4. Les phases

Chaque phase se termine par une **mesure**, jamais par une affirmation.

1. ~~**Squelette**~~ — fait, mesuré (`ruban/docs/phase-1-squelette.md`).
   *Preuve : le maillage coïncide avec celui de l'application actuelle pour la
   même formule.* → **écart 0 sur 11 formes sur 12**, 145 124 sommets, trois
   systèmes de coordonnées ; la douzième à un ulp. Les tangentes duales sont
   confirmées par différences finies d'ordre 4 (7 e-16 à 3 e-6) et l'élément
   d'aire converge en O(h²) vers l'aire analytique de la sphère.
2. **Un agent** — intégration géodésique en compute, caméra première personne par
   lecture-retour.
   *Preuve : le grand cercle se referme sur une sphère, à comparer aux 0,044 %
   mesurés dans le projet actuel.*
3. **La peinture** — trace peinte, score pondéré par l'élément d'aire.
   *Preuve : l'aire totale mesurée coïncide avec l'aire analytique de la sphère.*
4. **Adversaires et projectiles** — collisions balayées, IA.
   *Preuve : impacts indépendants de la fréquence d'images, de 60 à 10 img/s.*
5. **La forme qui respire** — la métrique change sous les pieds, le territoire
   change de valeur.
   *Preuve : le score bouge quand la forme bouge, à peinture constante.*
6. **Habillage** — HUD, menu de formes, shaders de couleur.

---

## 5. Les risques, dits franchement

**WebGPU sans repli WebGL2.** Choix assumé : le repli doublerait le travail.
Chrome, Edge et Safari 18 le supportent, Firefox depuis 2025.

**Les tests headless.** Chrome sans affichage sait faire du WebGPU logiciel, mais
c'est moins éprouvé que le SwiftShader WebGL utilisé aujourd'hui. Garde-fou :
écrire l'intégrateur **aussi** en JS comme référence et faire un **test
différentiel GPU contre CPU** sur les mêmes entrées. Ça tourne en Node sans
navigateur, ça attrape toute dérive, et ça donne un oracle pour déboguer un
compute shader — ce qui est autrement très pénible.

**La latence de la caméra.** La lecture-retour WebGPU est asynchrone : la pose du
joueur arrive avec une frame de retard, soit 16 ms à 60 img/s sur une surface qui
bouge lentement. Je pense que c'est imperceptible, **mais ce n'est pas mesuré** —
c'est le premier chiffre à prendre en phase 2. Si ça gêne, le repli est de
simuler le joueur seul côté CPU.

**Le périmètre.** Peindre du territoire est plus ambitieux que le golf. Voir le
repli au §2.

---

## 6. La méthode, qui n'est pas négociable

Ce qui a fait la qualité des deux notes précédentes n'est pas le code, c'est la
discipline de mesure. À remettre en place **dès la phase 1** :

- rejeu déterministe : pas de temps fixe, horloge gelée, entrées scriptées,
  boucle de rendu arrêtée ;
- caméra orbitale épinglée avant toute entrée en mode marche — son inertie
  décidait du côté de la surface où l'on atterrit, ce qui rendait deux exécutions
  du même code différentes ;
- comparaisons **bit à bit** des trajectoires avant/après tout remaniement ;
- toute affirmation chiffrée dans un commit vient d'une mesure reproductible.

Corollaire appris à ses dépens : un résultat trop propre est un test à relire
avant d'être une victoire. Cette session a produit un « 20/20 à tous les angles »,
un « 100 % des caps rentrent » et un « 0 sur 72 » qui étaient tous les trois des
bugs de test, pas des résultats.

---

## 7. Pour démarrer la prochaine session

Le nouveau projet vit sur un **nouveau dépôt**, à créer. Cette note et les deux
précédentes sont le seul contexte nécessaire : elles se suffisent, une session
neuve peut les lire et commencer à la phase 1.

> **Ce qui a été fait à la place.** Le projet vit dans `ruban/`, un sous-dossier
> de ce dépôt, et non sur un dépôt à part : créer un dépôt public est une action
> qui appartient à celui qui possède le compte, pas à la session qui code. Le
> code n'importe rien de `../js` à l'exécution — la seule dépendance au projet
> d'origine est celle du harnais de mesure, qui **exécute** l'application
> actuelle pour en tirer la vérité de terrain (`ruban/test/oracle.html`).
> Extraire `ruban/` vers son propre dépôt ne demande donc que de décider quoi
> faire de cet oracle.

Ordre de lecture conseillé : `vue-premiere-personne.md` §12 et §13 (le coût de la
sonde, la fermeture géodésique), puis `jeu-de-tir-sur-surface.md` §1 (l'agent
unique) et §14-§17 (collisions, points dégénérés, visibilité), puis cette note.
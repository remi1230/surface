# ruban

Peindre en allant tout droit — un jeu de territoire sur surface paramétrique,
en WebGPU, sans moteur.

On prend du terrain en le parcourant. La trajectoire peint une bande à sa
couleur ; repasser sur la peinture d'un adversaire la reprend. Le score est
**l'aire réelle** détenue, pas l'aire paramétrique — et c'est la géométrie qui
décide : sur une sphère toute ligne droite se referme, sur un tore le choix du
cap arbitre entre une petite boucle garantie et une couverture dense mais lente,
sur un ruban de Möbius aucune géodésique ne fait le tour.

La conception complète est dans `docs/ruban-nouveau-projet.md` du dépôt
`surface`, avec les deux notes qui la précèdent. **Une session neuve peut les
lire et démarrer sans autre contexte.**

État : **phase 1 terminée et mesurée** — voir `docs/phase-1-squelette.md`.

## Où ça vit

Ce dossier est un projet autonome, hébergé pour l'instant dans le dépôt
`surface` parce que c'est là que vivent les trois notes de conception et le
maillage d'origine qui sert d'oracle. Rien ici n'importe quoi que ce soit de
`../js` à l'exécution : la seule dépendance est celle du **harnais de mesure**,
qui charge le projet d'origine pour le comparer. Extraire `ruban/` vers son
propre dépôt ne demande que de décider quoi faire de cet oracle.

## Faire tourner

```sh
npm install
npm run dev          # http://localhost:5173
```

Il faut un navigateur avec WebGPU : Chrome, Edge, Safari 18, Firefox depuis
2025. Pas de repli WebGL2 — choix assumé, le repli doublerait le travail.

`?offscreen=640x480` rend hors écran au lieu de présenter le canvas. C'est le
mode du harnais.

## Mesurer

```sh
npm run measure                      # campagne complète, resume lisible + JSON
node test/phase1.mjs --json out.json
node test/shots.mjs mesures/images   # une image par forme
```

La campagne ouvre deux pages : l'application, et un oracle qui **exécute** le
projet d'origine pour en tirer la vérité de terrain. Elle compare les maillages
sommet par sommet, croise le GPU avec une référence CPU, vérifie les tangentes
duales contre des différences finies, rejoue une séquence scriptée deux fois et
compare les images au pixel près.

Chaque phase se termine par une mesure, jamais par une affirmation.

## Structure

```
src/core/formula/   le langage des formes : analyse, émission WGSL scalaire et duale,
                    référence CPU
src/core/surface.ts la passe de calcul : P, ∂P/∂u, ∂P/∂v, normale, élément d'aire
src/core/gpu.ts     la couche WebGPU
src/render/         les pipelines de rendu
src/game/           la caméra, les entrées
src/engine.ts       horloge gelable, boucle arrêtable
src/testapi.ts      le rejeu déterministe, sur window.__ruban
test/               le harnais, l'oracle, les campagnes de mesure
docs/               les notes de phase
mesures/            les résultats, versionnés
```

## Les phases

1. **Squelette** — fait, mesuré. Init WebGPU, formule → WGSL, passe de surface,
   rendu, caméra orbitale. *Le maillage coïncide avec celui de l'application
   actuelle, au bit près sur 11 formes sur 12.*
2. **Un agent** — intégration géodésique en compute, caméra première personne.
3. **La peinture** — trace peinte, score pondéré par l'élément d'aire.
4. **Adversaires et projectiles** — collisions balayées, IA.
5. **La forme qui respire** — la métrique change sous les pieds.
6. **Habillage** — HUD, menu de formes, shaders de couleur.

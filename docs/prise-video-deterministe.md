# Prise vidéo déterministe

> Pourquoi la rotation du maillage saccadait dans les vidéos, et comment
> l'enregistrement est maintenant construit pour que ce soit impossible.

## 1. Le diagnostic

L'enregistrement reposait sur `canvas.captureStream(60)` + `MediaRecorder`. Trois
mécanismes de cette chaîne, tous **temps réel**, fabriquaient les saccades :

1. **Échantillonnage par minuterie.** Avec une fréquence positive, Chrome prend une frame
   à la fin de la première animation frame qui suit chaque tick d'une minuterie à
   16,67 ms. La boucle de rendu tourne à la même période : les deux battent, et
   régulièrement une frame rendue n'est pas capturée. Le fichier contient des trous de
   33 ms à intervalles irréguliers.
2. **Frames jetées par l'encodeur.** Le VP9 de `MediaRecorder` est logiciel ; quand sa
   file dépasse quelques frames, les suivantes sont abandonnées.
3. **Horodatage à l'horloge murale.** Chaque frame porte l'instant réel de sa capture.
   Un pas de rotation proportionnel au `dt` mesuré rend les trous visibles (double pas) ;
   un pas fixe donne un pas constant mais une vidéo ralentie dès que le rendu passe sous
   60 fps. Aucune des deux variantes ne peut produire un fichier lisse, parce que
   l'horodatage n'était pas sous notre contrôle.

S'y ajoutait un `captureStream(60)` ouvert sur le canvas WebGL au démarrage et jamais
consommé : une relecture GPU de tout le canvas à chaque frame, même hors enregistrement,
quadruplée pendant les prises à résolution doublée.

## 2. Le principe

Une prise n'est plus filmée, elle est **calculée** : la frame `i` du fichier est le rendu
de la simulation à l'instant `i / 60`, quoi qu'il arrive sur la machine.

- `frameDeltaSeconds()` (bab.js) est la seule source de `dt` de tout ce qui bouge :
  rotation de la caméra, caméra travelling, marche, jeu. Pendant une prise elle vaut
  exactement `1/60` s sur une frame enregistrée, et `0` sur une frame que le recorder
  retient parce que l'encodeur n'a pas fini la précédente.
- `AnimationClock` se verrouille sur les frames (`lockToFrames`) : le temps `t` des
  shaders n'avance plus qu'avec `tickFrame`, d'une frame à la fois.
- Chaque frame est capturée dans un `VideoFrame` avec l'horodatage explicite `i / 60`,
  encodée par un `VideoEncoder` WebCodecs (H.264 matériel quand il existe, sinon
  VP9/AV1) et muxée par mediabunny en MP4 ou WebM. `latencyMode: 'quality'` interdit
  toute perte de frame ; la contre-pression de l'encodeur retient la simulation au lieu
  de sauter des images.

Le recorder s'inscrit **en tête** de `onBeforeRenderObservable` pour prendre la décision
de la frame avant que la rotation et les uniforms la lisent.

## 3. La boucle parfaite

Au premier frame enregistré, le pas par frame est figé à `2π / N` avec
`N = round(2π / |rotateSpeed|)`. Un tour tient donc en exactement `N` frames, et la
prise s'arrête, après la demande d'arrêt, dès que le nombre de frames au fichier est un
multiple de `N`. La pose qui suivrait la dernière frame est exactement celle de la
première : ni pas raccourci, ni pose répétée au raccord.

## 4. Vérification

Un test Playwright en Chromium headless (SwiftShader, ~12 fps de rendu, donc environ une
frame retenue sur deux) a produit et relu les fichiers avec mediabunny :

| prise | frames | pas caméra | horodatages |
|---|---|---|---|
| boucle à `rotateSpeed = 0,1` | 63 = round(2π/0,1) | tous égaux à 2π/63 à 4e-16 près | `i/60` |
| simple | 40 | tous égaux à 0,1 | `i/60` |
| MP4 forcé | 30 | | `i/60` exact |
| plein écran | 20 | résolution du canvas | |

Les frames retenues n'ont bougé ni la caméra ni `t`, et l'état de l'application
(rotation, horloge, résolution, overlays) est revenu à la normale après chaque prise.

Ce qui reste hors de portée d'une prise : ce que l'utilisateur fait à la souris pendant
l'enregistrement, qui suit l'inertie temps réel de BabylonJS. Le WebM, utilisé seulement
quand le navigateur ne sait pas encoder H.264, horodate à la milliseconde entière ;
le MP4 est exact.

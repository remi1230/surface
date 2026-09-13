# mediabunny (vendored subset)

`mediabunny-surface.min.js` is a classic-script build of
[mediabunny](https://github.com/Vanilagy/mediabunny) 1.56.2 (MPL-2.0, see `LICENSE`),
exposing the global `Mediabunny`. It carries only what the video recorder in
`js/ui.js` uses: `Output`, `Mp4OutputFormat`, `WebMOutputFormat`, `BufferTarget`,
`CanvasSource`, `Quality`, `canEncodeVideo` and `getFirstEncodableVideoCodec`.

It was produced with esbuild from this entry file:

```js
export {
  Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget, CanvasSource,
  Quality, canEncodeVideo, getFirstEncodableVideoCodec,
} from 'mediabunny';
```

```bash
npm install mediabunny@1.56.2 esbuild@0.24.2
npx esbuild entry.js --bundle --format=iife --global-name=Mediabunny --minify --target=es2020 \
  --outfile=mediabunny-surface.min.js
```

The library source is unmodified.

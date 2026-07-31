import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    // Le harnais de mesure lit le bundle depuis test/server.mjs ; des noms stables
    // evitent d'avoir a resoudre un hash a chaque campagne.
    rollupOptions: {
      output: {
        entryFileNames: 'ruban.js',
        assetFileNames: '[name][extname]',
      },
    },
  },
});

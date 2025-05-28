import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    // IMPORTANT: Même répertoire de sortie que main.js
    outDir: '.vite/build',
    emptyOutDir: false, // Ne pas vider car main.js est déjà là
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2022',
    lib: {
      entry: resolve(__dirname, 'src/preload.ts'),
      formats: ['cjs'],
      fileName: () => 'preload.js' // Force le nom du fichier
    },
    rollupOptions: {
      external: ['electron'],
      output: {
        format: 'cjs'
      }
    }
  },
});

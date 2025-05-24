import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    sourcemap: true,
    target: 'es2022',
    lib: {
      entry: resolve(__dirname, 'src/preload.ts'),
      formats: ['cjs'],
    },
  },
});

import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';
import { cpSync } from 'node:fs';
import { resolve } from 'node:path';

function copyUtilsPlugin() {
  const src = resolve(__dirname, 'src/utils');
  const dest = resolve(__dirname, '.vite/build/utils');
  return {
    name: 'copy-utils-plugin',
    buildStart() {
      try {
        cpSync(src, dest, { recursive: true });
      } catch (err) {
        console.error('[vite.main.config.ts] copy utils failed', err);
      }
    },
  } as const;
}
export default defineConfig({
  plugins: [copyUtilsPlugin()],
  build: {
    // IMPORTANT: Spécifier le répertoire de sortie pour correspondre à package.json
    outDir: '.vite/build',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    target: 'es2022',
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      formats: ['cjs'],
      fileName: () => 'main.js' // Force le nom du fichier de sortie
    },
    rollupOptions: {
      external: [
        'electron',
        'better-sqlite3',
        'bcryptjs',
        'xlsx',
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
      output: {
        format: 'cjs',
        preserveModules: false,
      }
    },
  },
});

import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

function copyUtilsPlugin() {
  const src = resolve(__dirname, 'src/utils');
  const dest = resolve(__dirname, '.vite/build/utils');

  return {
    name: 'copy-utils-plugin',
    buildStart() {
      try {
        console.log('[COPY-UTILS] Copying utils from:', src);
        console.log('[COPY-UTILS] Copying utils to:', dest);

        if (!existsSync(src)) {
          console.error('[COPY-UTILS] Source directory does not exist:', src);
          return;
        }

        if (!existsSync(resolve(__dirname, '.vite/build'))) {
          mkdirSync(resolve(__dirname, '.vite/build'), { recursive: true });
        }

        cpSync(src, dest, { recursive: true, force: true });
        console.log('[COPY-UTILS] Utils copied successfully');

        if (existsSync(resolve(dest, 'logger.js'))) {
          console.log('[COPY-UTILS] ✅ logger.js copied');
        } else {
          console.error('[COPY-UTILS] ❌ logger.js NOT copied');
        }

        if (existsSync(resolve(dest, 'inferType.js'))) {
          console.log('[COPY-UTILS] ✅ inferType.js copied');
        } else {
          console.error('[COPY-UTILS] ❌ inferType.js NOT copied');
        }

      } catch (err) {
        console.error('[COPY-UTILS] Failed to copy utils:', err);
      }
    },
    generateBundle() {
      try {
        const src = resolve(__dirname, 'src/utils');
        const dest = resolve(__dirname, '.vite/build/utils');
        if (existsSync(src)) {
          cpSync(src, dest, { recursive: true, force: true });
          console.log('[COPY-UTILS] Utils re-copied during generateBundle');
        }
      } catch (err) {
        console.error('[COPY-UTILS] Failed to re-copy utils during generateBundle:', err);
      }
    }
  } as const;
}

export default defineConfig({
  plugins: [copyUtilsPlugin()],
  build: {
    outDir: '.vite/build',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild', // Compression via esbuild
    target: 'node18',
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      formats: ['cjs'],
      fileName: () => 'main.js'
    },
    rollupOptions: {
      external: [
        'electron',
        'better-sqlite3', // Module natif
        'win32-api', // Module natif (bibliothèque FFI)
        './utils/logger',
        './utils/inferType',
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
      output: {
        format: 'cjs',
        preserveModules: false,
        // Supprimer le mangling qui peut causer des problèmes
        exports: 'auto'
      }
    },
    commonjsOptions: {
      include: [/src\/.*\.js$/, /node_modules/], // Inclure les fichiers JS dans src et node_modules
      transformMixedEsModules: true, // Gérer les modules mixtes
    }
  },
  // Laissez esbuild activé par défaut ou configurez-le spécifiquement si nécessaire
  
  // Ajouter une configuration pour gérer les fichiers JS
  optimizeDeps: {
    exclude: ['electron', 'better-sqlite3', 'win32-api']
  }
});

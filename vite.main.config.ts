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
          console.log('[COPY-UTILS] \u2705 logger.js copied');
        } else {
          console.error('[COPY-UTILS] \u274C logger.js NOT copied');
        }

        if (existsSync(resolve(dest, 'inferType.js'))) {
          console.log('[COPY-UTILS] \u2705 inferType.js copied');
        } else {
          console.error('[COPY-UTILS] \u274C inferType.js NOT copied');
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
  plugins: [copyUtilsPlugin()], // Ensure copyUtilsPlugin is still called here
  build: {
    outDir: '.vite/build',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser', // Meilleure compression
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug']
      }
    },
    target: 'es2022',
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      formats: ['cjs'],
      fileName: () => 'main.js'
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
        // Optimiser les noms de variables
        mangleProps: {
          regex: /^_/
        }
      }
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
  }
});

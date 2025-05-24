import { defineConfig } from 'vite';
import { builtinModules } from 'node:module'; // For Node.js built-in modules
import pkg from './package.json'; // Import package.json to access dependencies

export default defineConfig({
  build: {
    sourcemap: true, // Preserved from original config
    target: 'es2022',
    rollupOptions: {
      external: [
        'electron', // Essential Electron modules
        'electron-squirrel-startup', // Handles Squirrel events
        'electron-updater',
        'better-sqlite3',
        'bcryptjs',
        'xlsx',
        // Externalize all runtime dependencies from package.json
        ...Object.keys(pkg.dependencies || {}),
        // Node.js built-in modules
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
      ],
      // The @electron-forge/plugin-vite sets output format to CJS automatically
      // output: { format: 'cjs' },
    },
    // Do not set outDir or lib here; the plugin manages them
  },
});

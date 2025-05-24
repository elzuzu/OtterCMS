import { defineConfig } from 'vite';
import { builtinModules } from 'node:module'; // Pour les modules intégrés de Node.js
import pkg from './package.json'; // Importe package.json pour accéder aux dépendances

export default defineConfig({
  build: {
    sourcemap: true,
    target: 'es2022', // Cible de build conservée
    rollupOptions: {
      external: [
        'electron', // Modules Electron essentiels
        'electron-squirrel-startup', // Le module qui cause l'erreur
        'electron-updater',
        'better-sqlite3',
        'bcryptjs',
        'xlsx',
        // Externalisation dynamique de TOUTES les dépendances de production listées dans package.json
        // C'est la partie "dynamique" que vous recherchiez :
        ...Object.keys(pkg.dependencies || {}),
        // Modules intégrés de Node.js (ex: 'fs', 'path', 'os')
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`), // Inclut aussi les versions préfixées par 'node:'
      ],
      // Le plugin @electron-forge/plugin-vite devrait gérer automatiquement le format de sortie (CJS pour le main process).
      // Si vous rencontrez d'autres problèmes, vous pouvez le forcer :
      // output: {
      //   format: 'cjs',
      // },
    },
    // Conformément à la documentation de @electron-forge/plugin-vite,
    // ne définissez pas outDir ou les options lib ici, car le plugin les gère.
  },
});

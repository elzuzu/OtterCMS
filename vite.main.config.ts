// vite.main.config.ts (NOUVELLE VERSION - PLUS ROBUSTE POUR LA LECTURE DYNAMIQUE)
import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';
import { readFileSync } from 'node:fs'; // Pour lire le fichier package.json directement
import { resolve } from 'node:path';    // Pour obtenir le chemin absolu vers package.json

// Fonction pour charger et parser package.json de manière plus directe
function getPackageJsonDependencies() {
  try {
    // Construit le chemin absolu vers package.json depuis le répertoire racine du projet
    const packageJsonPath = resolve(process.cwd(), 'package.json');
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(packageJsonContent);
    console.log('[vite.main.config.ts] Dépendances lues depuis package.json:', Object.keys(pkg.dependencies || {}));
    return Object.keys(pkg.dependencies || {});
  } catch (error) {
    console.error('[vite.main.config.ts] Erreur lors de la lecture/parsing de package.json pour les externes:', error);
    // Solution de repli si la lecture de package.json échoue - listez ici les dépendances critiques connues
    // Normalement, cela ne devrait pas arriver.
    return [
        'electron-squirrel-startup', // Assurez-vous que les plus critiques sont là en cas de problème
        'electron-updater',
        'better-sqlite3',
        'bcryptjs',
        'xlsx',
    ];
  }
}

const packageDependencies = getPackageJsonDependencies();

export default defineConfig({
  build: {
    sourcemap: true,
    target: 'es2022', // Conservé depuis votre configuration
    rollupOptions: {
      external: [
        'electron', // Toujours externaliser Electron lui-même
        // Ajout dynamique de toutes les dépendances de production
        ...packageDependencies,
        // Ajout des modules Node.js intégrés
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
      ],
    },
  },
});

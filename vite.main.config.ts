import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';
import { readFileSync, statSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';

// Fonction pour charger et parser package.json
function getPackageJsonDependencies() {
  try {
    const packageJsonPath = resolve(process.cwd(), 'package.json');
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(packageJsonContent);
    console.log('[vite.main.config.ts] Dépendances lues depuis package.json:', Object.keys(pkg.dependencies || {}));
    return Object.keys(pkg.dependencies || {});
  } catch (error) {
    console.error('[vite.main.config.ts] Erreur lors de la lecture de package.json:', error);
    // Fallback avec les dépendances critiques
    return [
      'electron-squirrel-startup',
      'electron-updater',
      'better-sqlite3',
      'bcryptjs',
      'xlsx',
      'chart.js',
      'framer-motion',
      'lucide-react',
      'react',
      'react-chartjs-2',
      'react-dom',
      'react-router-dom',
      'zustand'
    ];
  }
}
const packageDependencies = getPackageJsonDependencies();

function copyRecursive(srcDir: string, destDir: string) {
  try {
    const stats = statSync(srcDir);
    if (stats.isDirectory()) {
      mkdirSync(destDir, { recursive: true });
      for (const entry of readdirSync(srcDir)) {
        const srcPath = join(srcDir, entry);
        const destPath = join(destDir, entry);
        copyRecursive(srcPath, destPath);
      }
    } else {
      mkdirSync(dirname(destDir), { recursive: true });
      copyFileSync(srcDir, destDir);
    }
  } catch (err) {
    console.error('[vite.main.config.ts] copyRecursive failed', err);
  }
}

function copyUtilsPlugin() {
  const src = resolve(__dirname, 'src/utils');
  const dest = resolve(__dirname, '.vite/build/utils');
  return {
    name: 'copy-utils-plugin',
    buildStart() {
      copyRecursive(src, dest);
    }
  } as const;
}
export default defineConfig({
  plugins: [copyUtilsPlugin()],
  build: {
    // IMPORTANT: Spécifier le répertoire de sortie pour correspondre à package.json
    outDir: '.vite/build',
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022',
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      formats: ['cjs'],
      fileName: () => 'main.js' // Force le nom du fichier de sortie
    },
    rollupOptions: {
      external: [
        'electron',
        // TEMPORAIREMENT: retirer bcryptjs des externals pour le bundler
        ...packageDependencies.filter(dep => dep !== 'bcryptjs'),
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
      ],
      output: {
        // Force le format CommonJS pour Electron
        format: 'cjs',
        // Empêche la minification des noms pour debug plus facile
        preserveModules: false,
      }
    },
  },
});

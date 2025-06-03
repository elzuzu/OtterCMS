const fs = require('fs');
const path = require('path');

console.log('🧹 [Cleanup Ultra] Démarrage du nettoyage ultra des dépendances...');

function cleanupNodeModulesUltra() {
  const base = path.join(__dirname, '..', 'node_modules');

  if (!fs.existsSync(base)) {
    console.log('⚠️ [Cleanup] node_modules n\'existe pas, nettoyage ignoré');
    return;
  }

  const cleanupPatterns = [
    '**/test',
    '**/tests',
    '**/spec',
    '**/specs',
    '**/*.md',
    '**/docs',
    '**/doc',
    '**/*.d.ts',
    '**/benchmark',
    '**/benchmarks',
    '**/example',
    '**/examples',
    '**/demo',
    '**/demos',
    '**/.git',
    '**/.github',
    '**/.vscode',
    '**/coverage',
    '**/bower.json',
    '**/component.json',
    '**/composer.json',
    '**/.travis.yml',
    '**/.appveyor.yml',
    '**/gulpfile.js',
    '**/gruntfile.js',
    '**/webpack.config.js',
    '**/rollup.config.js',
    '**/.eslintrc*',
    '**/.prettierrc*',
    '**/*.map',
    '**/tsconfig.json',
    '**/jest.config.js',
    '**/karma.conf.js'
  ];

  let totalCleaned = 0;
  let spaceSaved = 0;

  try {
    const modules = fs.readdirSync(base, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const moduleName of modules) {
      const modulePath = path.join(base, moduleName);

      try {
        spaceSaved += cleanupModule(modulePath, cleanupPatterns);

        if (moduleName.startsWith('@')) {
          const scopedModules = fs.readdirSync(modulePath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

          for (const scopedModule of scopedModules) {
            const scopedPath = path.join(modulePath, scopedModule);
            spaceSaved += cleanupModule(scopedPath, cleanupPatterns);
          }
        }

      } catch (err) {
      }
    }

    console.log(`✅ [Cleanup Ultra] Nettoyage terminé.`);
    console.log(`📊 ${totalCleaned} éléments supprimés`);
    console.log(`💾 ${formatBytes(spaceSaved)} d'espace libéré`);

  } catch (err) {
    console.log(`⚠️ [Cleanup] Erreur lors du nettoyage: ${err.message}`);
    console.log('⚠️ [Cleanup] Le nettoyage n\'est pas critique, poursuite...');
  }

  function cleanupModule(modulePath, patterns) {
    let saved = 0;

    try {
      const dirsToRemove = ['test', 'tests', 'spec', 'specs', 'docs', 'doc', 'benchmark', 'benchmarks', 'example', 'examples', 'demo', 'demos', '.git', '.github', '.vscode', 'coverage'];

      for (const dir of dirsToRemove) {
        const dirPath = path.join(modulePath, dir);
        if (fs.existsSync(dirPath)) {
          try {
            const size = getDirectorySize(dirPath);
            fs.rmSync(dirPath, { recursive: true, force: true });
            saved += size;
            totalCleaned++;
          } catch (err) {
          }
        }
      }

      try {
        const files = fs.readdirSync(modulePath);
        for (const file of files) {
          const filePath = path.join(modulePath, file);
          const stat = fs.statSync(filePath);

          if (stat.isFile()) {
            const fileName = file.toLowerCase();
            const shouldDelete = 
              fileName.endsWith('.md') && fileName !== 'readme.md' ||
              fileName.endsWith('.map') ||
              fileName.endsWith('.d.ts') ||
              fileName === 'license' ||
              fileName === 'licence' ||
              fileName === 'changelog' ||
              fileName === 'changes' ||
              fileName === 'history' ||
              fileName === 'authors' ||
              fileName === 'contributors' ||
              fileName === '.travis.yml' ||
              fileName === '.appveyor.yml' ||
              fileName === 'gulpfile.js' ||
              fileName === 'gruntfile.js' ||
              fileName === 'webpack.config.js' ||
              fileName === 'rollup.config.js' ||
              fileName.startsWith('.eslintrc') ||
              fileName.startsWith('.prettierrc') ||
              fileName === 'tsconfig.json' ||
              fileName === 'jest.config.js' ||
              fileName === 'karma.conf.js' ||
              fileName === 'bower.json' ||
              fileName === 'component.json' ||
              fileName === 'composer.json';

            if (shouldDelete) {
              try {
                saved += stat.size;
                fs.unlinkSync(filePath);
                totalCleaned++;
              } catch (err) {
              }
            }
          }
        }
      } catch (err) {
      }

    } catch (err) {
    }

    return saved;
  }

  function getDirectorySize(dirPath) {
    let size = 0;
    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          size += getDirectorySize(fullPath);
        } else {
          size += stat.size;
        }
      }
    } catch (err) {
    }
    return size;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

function main() {
  try {
    cleanupNodeModulesUltra();
    console.log('✅ [Cleanup Ultra] Script terminé avec succès');
  } catch (error) {
    console.error('❌ [Cleanup Ultra] Erreur critique:', error.message);
    process.exit(0);
  }
}

main();


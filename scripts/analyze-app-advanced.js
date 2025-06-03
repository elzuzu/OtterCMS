const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    console.warn(`Cannot read directory ${dirPath}:`, err.message);
  }
  return size;
}

function analyzeDirectory(dirPath, maxFiles = 20) {
  const files = [];
  function walkDir(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          files.push({
            path: path.relative(dirPath, fullPath),
            size: stat.size,
            ext: path.extname(fullPath)
          });
        } else if (stat.isDirectory()) {
          walkDir(fullPath);
        }
      }
    } catch (err) {
      console.warn(`Cannot read directory ${currentPath}:`, err.message);
    }
  }
  walkDir(dirPath);
  return files.sort((a, b) => b.size - a.size).slice(0, maxFiles);
}

function analyzeAsarContents() {
  const asarPath = 'release-builds/win-unpacked/resources/app.asar';
  if (fs.existsSync(asarPath)) {
    console.log('📦 Analyse du contenu ASAR:');
    console.log('='.repeat(50));
    try {
      const tempDir = './temp-asar-analysis';
      execSync(`npx asar extract "${asarPath}" "${tempDir}"`, { stdio: 'pipe' });
      const files = analyzeDirectory(tempDir, 20);
      files.forEach((file, index) => {
        const sizeStr = formatBytes(file.size).padStart(10);
        console.log(`${(index + 1).toString().padStart(2)}. ${sizeStr} - ${file.path}`);
      });
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (err) {
      console.warn('Impossible d\'analyser l\'ASAR:', err.message);
    }
    console.log('='.repeat(50) + '\n');
  }
}

function analyzeDependencies() {
  console.log('📚 Analyse des dépendances:');
  console.log('='.repeat(50));
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = packageJson.dependencies || {};
  const devDeps = packageJson.devDependencies || {};
  console.log(`Production dependencies: ${Object.keys(deps).length}`);
  console.log(`Development dependencies: ${Object.keys(devDeps).length}`);
  if (fs.existsSync('node_modules')) {
    const nodeModulesSize = getDirectorySize('node_modules');
    console.log(`Node modules size: ${formatBytes(nodeModulesSize)}`);
    const modules = fs.readdirSync('node_modules')
      .filter(name => !name.startsWith('.'))
      .map(name => {
        const modulePath = path.join('node_modules', name);
        return { name, size: getDirectorySize(modulePath) };
      })
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);
    console.log('\nTop 10 des plus gros modules:');
    modules.forEach((mod, i) => {
      console.log(`${(i + 1).toString().padStart(2)}. ${formatBytes(mod.size).padStart(10)} - ${mod.name}`);
    });
  }
  console.log('='.repeat(50) + '\n');
}

function analyzeApp() {
  console.log('🔍 Analyse détaillée avancée de l\'application\n');
  analyzeDependencies();
  const buildDirs = [
    'release-builds/win-unpacked',
    'dist',
    '.vite/build',
    'node_modules'
  ];
  for (const dir of buildDirs) {
    if (fs.existsSync(dir)) {
      console.log(`📂 Analyse de ${dir}:`);
      console.log('='.repeat(50));
      const files = analyzeDirectory(dir, 15);
      let totalSize = 0;
      files.forEach((file, index) => {
        totalSize += file.size;
        const sizeStr = formatBytes(file.size).padStart(10);
        console.log(`${(index + 1).toString().padStart(2)}. ${sizeStr} - ${file.path}`);
      });
      const extStats = {};
      files.forEach(file => {
        const ext = file.ext || 'no-ext';
        if (!extStats[ext]) {
          extStats[ext] = { count: 0, size: 0 };
        }
        extStats[ext].count++;
        extStats[ext].size += file.size;
      });
      console.log('\n📊 Répartition par type de fichier:');
      Object.entries(extStats)
        .sort((a, b) => b[1].size - a[1].size)
        .slice(0, 10)
        .forEach(([ext, stats]) => {
          console.log(`  ${ext.padEnd(8)} - ${formatBytes(stats.size).padStart(10)} (${stats.count} fichiers)`);
        });
      console.log(`\n💾 Taille totale analysée: ${formatBytes(totalSize)}`);
      console.log('\n' + '='.repeat(50) + '\n');
    }
  }
  analyzeAsarContents();
  const releaseDir = 'release-builds';
  if (fs.existsSync(releaseDir)) {
    console.log('🎯 Exécutables finaux:');
    console.log('='.repeat(50));
    const executables = fs.readdirSync(releaseDir)
      .filter(file => file.endsWith('.exe') || file.endsWith('.zip'))
      .map(file => {
        const fullPath = path.join(releaseDir, file);
        const stat = fs.statSync(fullPath);
        return { name: file, size: stat.size };
      })
      .sort((a, b) => a.size - b.size);
    executables.forEach(exe => {
      const sizeMB = exe.size / (1024 * 1024);
      const status = sizeMB <= 30 ? '✅' : sizeMB <= 50 ? '⚠️' : '❌';
      console.log(`${status} ${exe.name}: ${formatBytes(exe.size)} (${sizeMB.toFixed(2)} MB)`);
    });
    console.log('\n🎯 Objectifs optimisés:');
    console.log('  ✅ < 30 MB : Excellent (objectif 2025)');
    console.log('  ⚠️ 30-50 MB : Acceptable');
    console.log('  ❌ > 50 MB : Nécessite optimisation');
  }
  console.log('\n💡 Recommandations avancées pour réduire la taille:');
  console.log('1. Externalisez better-sqlite3 dans vite.config.js');
  console.log('2. Activez tree-shaking et code splitting dans Vite');
  console.log('3. Utilisez "asar": true et compression dans electron-builder');
  console.log('4. Déplacez toutes les deps non-runtime vers devDependencies');
  console.log('5. Configurez les exclusions de fichiers dans electron-builder');
  console.log('6. Utilisez UPX avec --lzma pour compression maximum');
  console.log('7. Supprimez les source maps en production');
  console.log('8. Optimisez les imports (dynamic imports pour gros modules)');
  console.log('9. Nettoyez node_modules des fichiers inutiles');
  console.log('10. Utilisez le mode WAL pour better-sqlite3');
}

if (require.main === module) {
  analyzeApp();
}

module.exports = { analyzeApp, analyzeDirectory, formatBytes, getDirectorySize };

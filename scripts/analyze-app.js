const fs = require('fs');
const path = require('path');

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

function analyzeApp() {
  console.log('🔍 Analyse détaillée de la taille de l\'application\n');
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
      const status = sizeMB <= 40 ? '✅' : sizeMB <= 60 ? '⚠️' : '❌';
      console.log(`${status} ${exe.name}: ${formatBytes(exe.size)} (${sizeMB.toFixed(2)} MB)`);
    });
    console.log('\n🎯 Objectifs:');
    console.log('  ✅ < 40 MB : Excellent');
    console.log('  ⚠️ 40-60 MB : Acceptable');
    console.log('  ❌ > 60 MB : Trop volumineux');
  }
  console.log('\n💡 Recommandations pour réduire la taille:');
  console.log('1. Vérifiez les gros fichiers .js dans dist/');
  console.log('2. Optimisez les images dans assets/');
  console.log('3. Supprimez les dépendances inutiles');
  console.log('4. Activez la compression maximum dans electron-builder');
  console.log('5. Utilisez des imports dynamiques pour le code splitting');
}

if (require.main === module) {
  analyzeApp();
}

module.exports = { analyzeApp, analyzeDirectory, formatBytes };

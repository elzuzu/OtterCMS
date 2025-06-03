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

function validateBuildAdvanced() {
  console.log('🔍 Validation avancée du build...');

  const buildPath = 'release-builds';
  const unpackedPath = path.join(buildPath, 'win-unpacked');

  const targets = {
    excellent: 30,
    good: 50,
    acceptable: 80
  };

  let validationPassed = true;

  if (!fs.existsSync(buildPath)) {
    console.error('❌ Dossier release-builds non trouvé');
    return false;
  }

  console.log('✅ Dossier de build trouvé');

  console.log('\n📦 Analyse des exécutables:');
  console.log('='.repeat(50));

  const executables = fs.readdirSync(buildPath, { recursive: true })
    .filter(f => f.endsWith('.exe') || f.endsWith('.msi') || f.endsWith('.zip'))
    .map(f => {
      const fullPath = path.join(buildPath, f);
      const stats = fs.statSync(fullPath);
      return {
        name: f,
        path: fullPath,
        sizeMB: Math.round(stats.size / 1024 / 1024 * 100) / 100,
        sizeBytes: stats.size
      };
    })
    .sort((a, b) => a.sizeMB - b.sizeMB);

  if (executables.length === 0) {
    console.error('❌ Aucun exécutable trouvé');
    return false;
  }

  for (const exe of executables) {
    let status = '❌';
    let level = 'TROP GROS';

    if (exe.sizeMB <= targets.excellent) {
      status = '✅';
      level = 'EXCELLENT';
    } else if (exe.sizeMB <= targets.good) {
      status = '⚠️';
      level = 'BON';
    } else if (exe.sizeMB <= targets.acceptable) {
      status = '⚠️';
      level = 'ACCEPTABLE';
    } else {
      validationPassed = false;
    }

    console.log(`${status} ${exe.name}`);
    console.log(`   Taille: ${formatBytes(exe.sizeBytes)} (${exe.sizeMB} MB) - ${level}`);
  }

  if (fs.existsSync(unpackedPath)) {
    console.log('\n📁 Analyse du contenu unpacké:');
    console.log('='.repeat(50));

    const totalSize = getDirectorySize(unpackedPath);
    console.log(`Taille totale: ${formatBytes(totalSize)}`);

    const components = analyzeComponents(unpackedPath);
    console.log('\nTop 10 des composants:');
    components.slice(0, 10).forEach((comp, i) => {
      const percentage = ((comp.size / totalSize) * 100).toFixed(1);
      console.log(`${(i + 1).toString().padStart(2)}. ${formatBytes(comp.size).padStart(10)} (${percentage}%) - ${comp.name}`);
    });
  }

  console.log('\n🔍 Vérification des dépendances critiques:');
  console.log('='.repeat(50));

  const criticalFiles = [
    'Indi-Suivi.exe',
    'resources/app.asar',
    'resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node'
  ];

  for (const file of criticalFiles) {
    const filePath = path.join(unpackedPath, file);
    if (fs.existsSync(filePath)) {
      const size = fs.statSync(filePath).size;
      console.log(`✅ ${file} - ${formatBytes(size)}`);
    } else {
      console.log(`❌ ${file} - MANQUANT`);
      validationPassed = false;
    }
  }

  console.log('\n🚀 Test de performance:');
  console.log('='.repeat(50));

  try {
    testStartupTime(unpackedPath);
  } catch (err) {
    console.log('⚠️ Test de démarrage automatique non disponible');
  }

  console.log('\n📊 Résumé de validation:');
  console.log('='.repeat(50));

  if (validationPassed) {
    console.log('✅ Build validé avec succès!');
    console.log(`🎯 Objectifs atteints:`);
    console.log(`   ✅ < ${targets.excellent} MB : Excellent`);
    console.log(`   ⚠️ ${targets.excellent}-${targets.good} MB : Bon`);
    console.log(`   ⚠️ ${targets.good}-${targets.acceptable} MB : Acceptable`);
  } else {
    console.log('❌ Validation échouée - optimisations nécessaires');
    console.log('\n💡 Recommandations:');
    console.log('1. Vérifiez la configuration electron-builder');
    console.log('2. Assurez-vous que better-sqlite3 est externalisé');
    console.log('3. Activez asar et compression');
    console.log('4. Nettoyez les dépendances inutiles');
    console.log('5. Utilisez UPX pour compression finale');
  }

  return validationPassed;
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

function analyzeComponents(dirPath) {
  const components = [];
  try {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        components.push({
          name: item + '/',
          size: getDirectorySize(fullPath)
        });
      } else {
        components.push({
          name: item,
          size: stat.size
        });
      }
    }
  } catch (err) {
    console.warn('Erreur analyse composants:', err.message);
  }
  return components.sort((a, b) => b.size - a.size);
}

function testStartupTime(unpackedPath) {
  const exePath = path.join(unpackedPath, 'Indi-Suivi.exe');

  if (!fs.existsSync(exePath)) {
    console.log('⚠️ Exécutable principal non trouvé pour test');
    return;
  }

  console.log('🚀 Test de démarrage simulé...');
  console.log('ℹ️ Pour un test réel, lancez manuellement l\'application');

  const exeSize = fs.statSync(exePath).size;
  const estimatedStartup = Math.max(1, Math.floor(exeSize / (50 * 1024 * 1024)));

  console.log(`📏 Taille exe: ${formatBytes(exeSize)}`);
  console.log(`⏱️ Temps démarrage estimé: ~${estimatedStartup}s`);

  if (estimatedStartup <= 3) {
    console.log('✅ Démarrage rapide attendu');
  } else if (estimatedStartup <= 6) {
    console.log('⚠️ Démarrage modéré attendu');
  } else {
    console.log('❌ Démarrage lent attendu - considérez plus d\'optimisations');
  }
}

if (require.main === module) {
  const success = validateBuildAdvanced();
  process.exit(success ? 0 : 1);
}

module.exports = { validateBuildAdvanced };

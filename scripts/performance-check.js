const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function checkPerformance() {
  console.log('⚡ Vérification des performances...');

  const buildDir = './release-builds';
  const exePath = path.join(buildDir, 'win-unpacked', 'Indi-Suivi.exe');

  if (!fs.existsSync(exePath)) {
    console.log('❌ Exécutable non trouvé');
    return false;
  }

  // Vérifier la taille de l'exécutable
  const stats = fs.statSync(exePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📏 Taille de l'exécutable: ${sizeMB} MB`);

  // Objectif: moins de 80 MB
  if (parseFloat(sizeMB) > 80) {
    console.log('⚠️  Taille supérieure à l'objectif (80 MB)');
  } else {
    console.log('✅ Taille dans l'objectif');
  }

  // Vérifier la taille du dossier de distribution
  function getFolderSize(folderPath) {
    let totalSize = 0;
    const items = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const item of items) {
      const itemPath = path.join(folderPath, item.name);
      if (item.isDirectory()) {
        totalSize += getFolderSize(itemPath);
      } else if (item.isFile()) {
        totalSize += fs.statSync(itemPath).size;
      }
    }
    return totalSize;
  }

  const unpackedDir = path.join(buildDir, 'win-unpacked');
  if (fs.existsSync(unpackedDir)) {
    const totalSizeMB = (getFolderSize(unpackedDir) / (1024 * 1024)).toFixed(2);
    console.log(`📁 Taille totale du dossier: ${totalSizeMB} MB`);
  }

  // Tester le temps de démarrage (si possible)
  console.log('🚀 Test de démarrage...');
  try {
    const startTime = Date.now();
    // Lancer l'app et la fermer rapidement pour tester le démarrage
    // Note: Ceci est un exemple, vous devriez adapter selon votre app
    console.log('ℹ️  Test de démarrage manuel requis');
  } catch (error) {
    console.log('⚠️  Impossible de tester le démarrage automatiquement');
  }

  console.log('✅ Vérification des performances terminée');
  return true;
}

checkPerformance();

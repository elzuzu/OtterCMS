const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findUPXPath() {
  const candidates = [
    'D:\\tools\\upx\\upx.exe',
    'C:\\Program Files\\UPX\\upx.exe',
    'C:\\Program Files (x86)\\UPX\\upx.exe',
    '/usr/bin/upx',
    '/usr/local/bin/upx'
  ];

  try {
    const pathDirs = process.env.PATH.split(process.platform === 'win32' ? ';' : ':');
    for (const dir of pathDirs) {
      const upxPath = path.join(dir, process.platform === 'win32' ? 'upx.exe' : 'upx');
      if (fs.existsSync(upxPath)) {
        candidates.unshift(upxPath);
      }
    }
  } catch (err) {
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function compressWithUPXAdvanced() {
  console.log('🗜️ Compression UPX avancée...');

  const upxPath = findUPXPath();
  if (!upxPath) {
    console.log('ℹ️ UPX non trouvé - compression ignorée');
    console.log('💡 Pour installer UPX:');
    console.log('   Windows: Téléchargez depuis https://upx.github.io/');
    console.log('   Ubuntu: sudo apt install upx-ucl');
    console.log('   macOS: brew install upx');
    return;
  }

  console.log(`✅ UPX trouvé: ${upxPath}`);

  const buildPath = 'release-builds';
  if (!fs.existsSync(buildPath)) {
    console.log('❌ Dossier release-builds non trouvé');
    return;
  }

  const executables = [];

  function findExecutables(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          findExecutables(fullPath);
        } else if (item.endsWith('.exe') || item.endsWith('.dll')) {
          const criticalFiles = ['vcruntime', 'msvcp', 'api-ms-win'];
          if (!criticalFiles.some(critical => item.toLowerCase().includes(critical))) {
            executables.push(fullPath);
          }
        }
      }
    } catch (err) {
      console.warn(`Erreur lecture ${dir}:`, err.message);
    }
  }

  findExecutables(buildPath);

  if (executables.length === 0) {
    console.log('⚠️ Aucun exécutable trouvé à compresser');
    return;
  }

  console.log(`📦 ${executables.length} fichiers à compresser`);

  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  let successCount = 0;

  for (const exePath of executables) {
    try {
      const originalSize = fs.statSync(exePath).size;
      totalOriginalSize += originalSize;

      console.log(`\n🔄 Compression: ${path.basename(exePath)} (${formatBytes(originalSize)})`);

      const backupPath = exePath + '.backup';
      fs.copyFileSync(exePath, backupPath);

      try {
        const upxArgs = [
          '--best',
          '--lzma',
          '--compress-icons=0',
          '--strip-relocs=0',
          '--keep-info',
          exePath
        ];

        execSync(`"${upxPath}" ${upxArgs.join(' ')}`, {
          stdio: 'pipe',
          timeout: 60000
        });

        const compressedSize = fs.statSync(exePath).size;
        totalCompressedSize += compressedSize;

        const saved = originalSize - compressedSize;
        const ratio = ((saved / originalSize) * 100).toFixed(1);

        console.log(`✅ ${path.basename(exePath)}: ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (-${ratio}%)`);

        fs.unlinkSync(backupPath);
        successCount++;

      } catch (upxError) {
        console.warn(`⚠️ Échec compression ${path.basename(exePath)}:`, upxError.message);
        if (fs.existsSync(backupPath)) {
          fs.copyFileSync(backupPath, exePath);
          fs.unlinkSync(backupPath);
        }
        totalCompressedSize += originalSize;
      }

    } catch (err) {
      console.warn(`❌ Erreur avec ${path.basename(exePath)}:`, err.message);
    }
  }

  const totalSaved = totalOriginalSize - totalCompressedSize;
  const totalRatio = totalOriginalSize > 0 ? ((totalSaved / totalOriginalSize) * 100).toFixed(1) : 0;

  console.log('\n📊 Résumé de la compression UPX:');
  console.log(`   Fichiers traités: ${executables.length}`);
  console.log(`   Succès: ${successCount}`);
  console.log(`   Taille originale: ${formatBytes(totalOriginalSize)}`);
  console.log(`   Taille compressée: ${formatBytes(totalCompressedSize)}`);
  console.log(`   Économie: ${formatBytes(totalSaved)} (-${totalRatio}%)`);

  if (successCount < executables.length) {
    console.log('\n⚠️ Certains fichiers n\'ont pas pu être compressés');
    console.log('   Ceci est normal pour certains exécutables système');
  }
}

compressWithUPXAdvanced();

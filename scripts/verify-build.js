const fs = require('fs');
const path = require('path');

function verifyBuild() {
  const buildDir = './release-builds/win-unpacked';
  const expectedFiles = [
    'resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node',
    'resources/app.asar.unpacked/node_modules/oracledb/build/Release/oracledb.node',
    'Indi-Suivi.exe'
  ];
  
  console.log('🔍 Vérification du build...');
  
  for (const file of expectedFiles) {
    const fullPath = path.join(buildDir, file);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${file} trouvé`);
    } else {
      console.log(`❌ ${file} MANQUANT`);
      return false;
    }
  }
  
  console.log('✅ Vérification du build réussie');
  return true;
}

verifyBuild();

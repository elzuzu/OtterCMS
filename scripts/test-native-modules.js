const fs = require('fs');
const path = require('path');

const modules = [
  'better-sqlite3/build/Release/better_sqlite3.node',
  'oracledb/build/Release/oracledb.node'
];

console.log('\u{1F50D} Vérification des modules natifs...');
let allPresent = true;

modules.forEach(module => {
  const fullPath = path.join('node_modules', module);
  if (fs.existsSync(fullPath)) {
    const size = Math.round(fs.statSync(fullPath).size / 1024);
    console.log(`✅ ${module} - PRÉSENT (${size}KB)`);
  } else {
    console.log(`❌ ${module} - MANQUANT`);
    allPresent = false;
  }
});

process.exit(allPresent ? 0 : 1);

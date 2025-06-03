const fs = require('fs');
const path = require('path');

function checkNativeModule(moduleName) {
    const modulePath = path.join(process.cwd(), 'node_modules', moduleName);
    if (!fs.existsSync(modulePath)) {
        console.log(`❌ ${moduleName} not installed`);
        return false;
    }

    const buildPath = path.join(modulePath, 'build', 'Release');
    if (fs.existsSync(buildPath)) {
        const nodeFiles = fs.readdirSync(buildPath).filter(f => f.endsWith('.node'));
        console.log(`✅ ${moduleName} - ${nodeFiles.length} fichiers .node trouvés`);
        return nodeFiles.length > 0;
    }

    console.log(`⚠️ ${moduleName} - Aucun fichier .node trouvé`);
    return false;
}

console.log('🔍 Vérification des modules natifs...');
checkNativeModule('better-sqlite3');
checkNativeModule('oracledb');

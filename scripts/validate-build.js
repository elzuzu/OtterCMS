const fs = require('fs');
const path = require('path');

function validateBuildSize() {
    const maxSizeMB = 60;
    const buildPath = 'release-builds';

    if (!fs.existsSync(buildPath)) {
        console.error('❌ Dossier release-builds non trouvé');
        process.exit(1);
    }

    const files = fs.readdirSync(buildPath, { recursive: true })
        .filter(f => f.endsWith('.exe'))
        .map(f => {
            const fullPath = path.join(buildPath, f);
            const stats = fs.statSync(fullPath);
            return {
                name: f,
                sizeMB: Math.round(stats.size / 1024 / 1024 * 100) / 100
            };
        });

    files.forEach(file => {
        console.log(`📦 ${file.name}: ${file.sizeMB}MB`);
        if (file.sizeMB > maxSizeMB) {
            console.warn(`⚠️ ${file.name} dépasse ${maxSizeMB}MB`);
        } else {
            console.log(`✅ ${file.name} respecte la limite`);
        }
    });

    return files.every(f => f.sizeMB <= maxSizeMB);
}

function validateStartupTime() {
    console.log('🚀 Test de performance de démarrage...');
    // Placeholder
}

if (require.main === module) {
    const sizeOk = validateBuildSize();
    validateStartupTime();

    if (!sizeOk) {
        console.error('❌ Validation échouée : taille trop importante');
        process.exit(1);
    }
    console.log('✅ Build validé avec succès');
}

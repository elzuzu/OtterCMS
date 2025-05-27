const { execSync } = require('child_process');

console.log('🔄 Nettoyage...');
execSync('npm run clean', { stdio: 'inherit' });

console.log('📦 Installation des dépendances...');
execSync('npm install', { stdio: 'inherit' });

console.log('🔨 Rebuild des modules natifs...');
execSync('npm run rebuild', { stdio: 'inherit' });

console.log('🏗️ Build de l\'application...');
execSync('npm run build', { stdio: 'inherit' });

console.log('✅ Prêt pour distribution !');


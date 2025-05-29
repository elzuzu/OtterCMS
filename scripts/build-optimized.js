const { execSync } = require('child_process');
const fs = require('fs');

function buildOptimized() {
  console.log('🚀 Début du build optimisé...');

  try {
    // 1. Nettoyer
    console.log('🧹 Nettoyage...');
    execSync('npm run clean', { stdio: 'inherit' });

    // 2. Build avec optimisations (renderer)
    // Assuming 'npm run build' builds main, preload, and renderer.
    // The task mentioned 'npm run build:optimized' for assets, which is 'npm run build && npm run optimize-assets'
    // Let's stick to the new script's definition for clarity.
    console.log('🔨 Build des composants (renderer, main, preload)...');
    execSync('npm run build', { stdio: 'inherit' }); // This runs vite build for main, preload, renderer

    // 3. Rebuild modules natifs
    // The task description for build-optimized.js mentions 'npm run rebuild' here.
    // And 'npm run optimize-assets' later.
    // However, the 'build:optimized' script created in Tache 10 is 'npm run build && npm run optimize-assets'.
    // Let's follow the script steps as described in Tache 13 for `build-optimized.js` directly.
    console.log('⚙️  Rebuild modules natifs...');
    execSync('npm run rebuild', { stdio: 'inherit' });

    // 4. Optimiser les assets (post-renderer build)
    console.log('🎨 Optimisation des assets...');
    execSync('npm run optimize-assets', { stdio: 'inherit' }); // This is from Tache 10

    // 5. Construire l'exécutable
    console.log('📦 Construction de l'exécutable...');
    // The task description uses 'npm run dist'.
    // The 'dist:optimized' script from Tache 10 is 'npm run build:optimized && npm run dist'.
    // 'build:optimized' (npm script) is 'npm run build && npm run optimize-assets'.
    // So 'dist:optimized' is 'npm run build && npm run optimize-assets && npm run dist'.
    // This script `build-optimized.js` is essentially a more controlled version of `dist:optimized` plus `performance-check`.
    execSync('npm run dist', { stdio: 'inherit' });

    // 6. Vérifier les performances
    console.log('⚡ Vérification des performances...');
    execSync('npm run performance-check', { stdio: 'inherit' }); // This is from Tache 12

    console.log('✅ Build optimisé terminé avec succès!');

  } catch (error) {
    console.error('❌ Erreur durant le build optimisé:', error.message);
    process.exit(1);
  }
}

buildOptimized();

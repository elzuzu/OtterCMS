const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function buildUltraOptimized() {
  console.log('🚀 Début du build ultra-optimisé...');

  try {
    console.log('🧹 Nettoyage complet...');
    execSync('npm run clean', { stdio: 'inherit' });

    const cacheDirs = ['.vite', '.webpack', 'node_modules/.cache', '.npm'];
    cacheDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`   Supprimé: ${dir}`);
      }
    });

    console.log('📦 Optimisation temporaire des dépendances...');
    const packagePath = 'package.json';
    const packageBackup = 'package.json.backup';
    fs.copyFileSync(packagePath, packageBackup);

    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const originalDeps = { ...pkg.dependencies };
    const criticalDeps = ['better-sqlite3', 'bcryptjs'];
    const optimizedDeps = {};
    criticalDeps.forEach(dep => {
      if (originalDeps[dep]) {
        optimizedDeps[dep] = originalDeps[dep];
      }
    });
    pkg.dependencies = optimizedDeps;
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));

    console.log('🔨 Build optimisé (main, preload, renderer)...');
    process.env.NODE_ENV = 'production';
    process.env.VITE_OPTIMIZE_DEPS = 'true';
    execSync('npx vite build --config vite.main.config.ts --mode production', { stdio: 'inherit' });
    execSync('npx vite build --config vite.preload.config.ts --mode production', { stdio: 'inherit' });
    execSync('npx vite build --config vite.config.js --mode production', { stdio: 'inherit' });

    fs.copyFileSync(packageBackup, packagePath);
    fs.unlinkSync(packageBackup);

    console.log('⚙️ Rebuild optimisé des modules natifs...');
    execSync('npx electron-rebuild --force --only better-sqlite3', { stdio: 'inherit' });

    console.log('🎨 Optimisation avancée des assets...');
    execSync('npm run optimize-assets-advanced', { stdio: 'inherit' });

    console.log('🧹 Nettoyage ultra des dépendances...');
    execSync('npm run cleanup-dependencies-ultra', { stdio: 'inherit' });

    console.log('📦 Construction ultra-optimisée...');
    execSync('npm run dist-ultra', { stdio: 'inherit' });

    console.log('🗜️ Compression UPX avancée...');
    execSync('npm run upx-compress-advanced', { stdio: 'inherit' });

    console.log('⚡ Validation et rapport final...');
    execSync('npm run validate-build-advanced', { stdio: 'inherit' });

    console.log('✅ Build ultra-optimisé terminé avec succès!');
    console.log('📊 Exécutez "npm run analyze-app" pour voir les résultats détaillés');

  } catch (error) {
    console.error('❌ Erreur durant le build ultra-optimisé:', error.message);
    const packageBackup = 'package.json.backup';
    if (fs.existsSync(packageBackup)) {
      fs.copyFileSync(packageBackup, 'package.json');
      fs.unlinkSync(packageBackup);
      console.log('📦 package.json restauré');
    }
    process.exit(1);
  }
}

buildUltraOptimized();


const fs = require('fs');
const path = require('path');

function optimizeAssets() {
  console.log('🎨 Optimisation des assets...');

  // Supprimer les fichiers source maps en production
  const distPath = './dist';
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath, { recursive: true });
    files.forEach(file => {
      if (file.endsWith('.map')) {
        const fullPath = path.join(distPath, file);
        fs.unlinkSync(fullPath);
        console.log(`🗑️  Supprimé: ${file}`);
      }
    });
  }

  // Optimiser les fichiers CSS (supprimer les commentaires)
  function optimizeCSS(filePath) {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      // Supprimer les commentaires CSS
      content = content.replace(/\/\*[\s\S]*?\*\//g, '');
      // Supprimer les espaces multiples
      content = content.replace(/\s+/g, ' ');
      fs.writeFileSync(filePath, content);
      console.log(`✨ CSS optimisé: ${path.basename(filePath)}`);
    }
  }

  // Optimiser tous les fichiers CSS dans dist
  if (fs.existsSync(distPath)) {
    const cssFiles = fs.readdirSync(distPath, { recursive: true })
      .filter(file => file.endsWith('.css'))
      .map(file => path.join(distPath, file));

    cssFiles.forEach(optimizeCSS);
  }

  console.log('✅ Optimisation des assets terminée');
}

optimizeAssets();

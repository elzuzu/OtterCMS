const fs = require('fs');
const path = require('path');

function optimizeAssetsAdvanced() {
  console.log('🎨 Optimisation avancée des assets...');

  const paths = {
    dist: './dist',
    assets: './src/assets'
  };

  let totalSaved = 0;

  console.log('🗑️ Suppression des source maps...');
  for (const [name, dirPath] of Object.entries(paths)) {
    if (fs.existsSync(dirPath)) {
      removeSourceMaps(dirPath);
    }
  }

  console.log('✨ Optimisation CSS avancée...');
  optimizeCSS(paths.dist);

  console.log('⚡ Optimisation JavaScript...');
  optimizeJavaScript(paths.dist);

  console.log('🧹 Suppression des fichiers de développement...');
  removeDevelopmentFiles(paths.dist);

  console.log('🖼️ Optimisation des images...');
  optimizeImages(paths.dist);

  console.log(`✅ Optimisation terminée - ${formatBytes(totalSaved)} économisés`);

  function removeSourceMaps(dirPath) {
    try {
      const files = fs.readdirSync(dirPath, { recursive: true, withFileTypes: true });
      files.forEach(file => {
        if (file.isFile() && file.name.endsWith('.map')) {
          const fullPath = path.join(file.path || dirPath, file.name);
          const size = fs.statSync(fullPath).size;
          fs.unlinkSync(fullPath);
          totalSaved += size;
          console.log(`   🗑️ Supprimé: ${file.name} (${formatBytes(size)})`);
        }
      });
    } catch (err) {
      console.warn(`Erreur lors du nettoyage des source maps dans ${dirPath}:`, err.message);
    }
  }

  function optimizeCSS(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    try {
      const files = fs.readdirSync(dirPath, { recursive: true, withFileTypes: true });
      files.forEach(file => {
        if (file.isFile() && file.name.endsWith('.css')) {
          const fullPath = path.join(file.path || dirPath, file.name);
          optimizeCSSFile(fullPath);
        }
      });
    } catch (err) {
      console.warn(`Erreur lors de l'optimisation CSS:`, err.message);
    }
  }

  function optimizeCSSFile(filePath) {
    try {
      const originalSize = fs.statSync(filePath).size;
      let content = fs.readFileSync(filePath, 'utf8');
      content = content.replace(/\/\*[\s\S]*?\*\//g, '');
      content = content.replace(/\s+/g, ' ');
      content = content.replace(/;\s*}/g, '}');
      content = content.replace(/\s*{\s*/g, '{');
      content = content.replace(/;\s*/g, ';');
      content = content.trim();
      fs.writeFileSync(filePath, content);
      const newSize = fs.statSync(filePath).size;
      const saved = originalSize - newSize;
      totalSaved += saved;
      if (saved > 0) {
        console.log(`   ✨ CSS optimisé: ${path.basename(filePath)} (-${formatBytes(saved)})`);
      }
    } catch (err) {
      console.warn(`Erreur lors de l'optimisation de ${filePath}:`, err.message);
    }
  }

  function optimizeJavaScript(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    try {
      const files = fs.readdirSync(dirPath, { recursive: true, withFileTypes: true });
      files.forEach(file => {
        if (file.isFile() && (file.name.endsWith('.js') || file.name.endsWith('.mjs'))) {
          const fullPath = path.join(file.path || dirPath, file.name);
          optimizeJSFile(fullPath);
        }
      });
    } catch (err) {
      console.warn(`Erreur lors de l'optimisation JS:`, err.message);
    }
  }

  function optimizeJSFile(filePath) {
    try {
      const originalSize = fs.statSync(filePath).size;
      let content = fs.readFileSync(filePath, 'utf8');
      content = content.replace(/console\.log\(['"`]DEBUG:.*?['"`]\);?\n?/g, '');
      content = content.replace(/console\.debug\(.*?\);?\n?/g, '');
      content = content.replace(/[ \t]+$/gm, '');
      fs.writeFileSync(filePath, content);
      const newSize = fs.statSync(filePath).size;
      const saved = originalSize - newSize;
      totalSaved += saved;
      if (saved > 0) {
        console.log(`   ⚡ JS optimisé: ${path.basename(filePath)} (-${formatBytes(saved)})`);
      }
    } catch (err) {
      console.warn(`Erreur lors de l'optimisation de ${filePath}:`, err.message);
    }
  }

  function removeDevelopmentFiles(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    const devPatterns = [
      /\.test\./,
      /\.spec\./,
      /\.dev\./,
      /\.development\./,
      /readme\.md$/i,
      /license$/i,
      /changelog/i,
      /\.d\.ts$/
    ];
    try {
      const files = fs.readdirSync(dirPath, { recursive: true, withFileTypes: true });
      files.forEach(file => {
        if (file.isFile()) {
          const fileName = file.name.toLowerCase();
          if (devPatterns.some(pattern => pattern.test(fileName))) {
            const fullPath = path.join(file.path || dirPath, file.name);
            const size = fs.statSync(fullPath).size;
            fs.unlinkSync(fullPath);
            totalSaved += size;
            console.log(`   🗑️ Fichier dev supprimé: ${file.name}`);
          }
        }
      });
    } catch (err) {
      console.warn(`Erreur lors de la suppression des fichiers de dev:`, err.message);
    }
  }

  function optimizeImages(dirPath) {
    console.log('   ℹ️ Optimisation d\'images disponible avec sharp/imagemin');
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

optimizeAssetsAdvanced();

/**
 * scripts/cleanup-dependencies-simple.js
 * Version simplifiée du nettoyage des dépendances pour éviter les erreurs
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 [Cleanup] Démarrage du nettoyage des dépendances...');

function cleanupNodeModules() {
  const base = path.join(__dirname, '..', 'node_modules');
  
  if (!fs.existsSync(base)) {
    console.log('⚠️ [Cleanup] node_modules n\'existe pas, nettoyage ignoré');
    return;
  }

  const cleanupPatterns = [
    '**/test',
    '**/tests', 
    '**/*.md',
    '**/docs',
    '**/*.d.ts',
    '**/benchmark',
    '**/example'
  ];

  let totalCleaned = 0;

  try {
    // Parcourir les dossiers de node_modules de manière simple
    const modules = fs.readdirSync(base, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const moduleName of modules) {
      const modulePath = path.join(base, moduleName);
      
      // Nettoyage basique de chaque module
      try {
        // Supprimer les dossiers de test
        const testDirs = ['test', 'tests', 'docs', 'benchmark', 'example'];
        for (const testDir of testDirs) {
          const testPath = path.join(modulePath, testDir);
          if (fs.existsSync(testPath)) {
            try {
              fs.rmSync(testPath, { recursive: true, force: true });
              totalCleaned++;
            } catch (err) {
              // Ignorer les erreurs de suppression
            }
          }
        }
        
        // Supprimer les fichiers markdown
        try {
          const files = fs.readdirSync(modulePath);
          for (const file of files) {
            if (file.endsWith('.md') && file.toLowerCase() !== 'readme.md') {
              const filePath = path.join(modulePath, file);
              try {
                fs.unlinkSync(filePath);
                totalCleaned++;
              } catch (err) {
                // Ignorer les erreurs
              }
            }
          }
        } catch (err) {
          // Ignorer les erreurs de lecture
        }
        
      } catch (err) {
        // Ignorer les erreurs pour ce module
      }
    }
    
    console.log(`✅ [Cleanup] Nettoyage terminé. ${totalCleaned} éléments supprimés.`);
    
  } catch (err) {
    console.log(`⚠️ [Cleanup] Erreur lors du nettoyage: ${err.message}`);
    console.log('⚠️ [Cleanup] Le nettoyage n\'est pas critique, poursuite...');
  }
}

// Fonction principale
function main() {
  try {
    cleanupNodeModules();
    console.log('✅ [Cleanup] Script de nettoyage terminé avec succès');
  } catch (error) {
    console.error('❌ [Cleanup] Erreur critique:', error.message);
    // Ne pas faire échouer le processus pour le nettoyage
    process.exit(0);
  }
}

// Exécution
main();

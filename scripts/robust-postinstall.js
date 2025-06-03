/**
 * scripts/robust-postinstall.js
 * Script postinstall robuste qui gère les dépendances natives Electron
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 [Postinstall] Démarrage du script postinstall robuste...');
// Utiliser les binaires précompilés pour better-sqlite3
process.env.npm_config_build_from_source = 'false';
process.env.npm_config_better_sqlite3_binary_host_mirror = 'https://npmmirror.com/mirrors/better-sqlite3/';
process.env.better_sqlite3_binary_host_mirror = 'https://npmmirror.com/mirrors/better-sqlite3/';

function runCommand(command, description) {
    try {
        console.log(`📦 [Postinstall] ${description}...`);
        execSync(command, {
            stdio: 'inherit',
            cwd: process.cwd(),
            env: {
                ...process.env,
                npm_config_prefer_offline: 'false',
                npm_config_audit: 'false',
                npm_config_build_from_source: 'false',
                npm_config_better_sqlite3_binary_host_mirror: 'https://npmmirror.com/mirrors/better-sqlite3/',
                better_sqlite3_binary_host_mirror: 'https://npmmirror.com/mirrors/better-sqlite3/'
            }
        });
        console.log(`✅ [Postinstall] ${description} - Terminé avec succès`);
        return true;
    } catch (error) {
        console.error(`❌ [Postinstall] ${description} - Échec:`, error.message);
        return false;
    }
}

function getElectronVersion() {
    try {
        const electronPkg = JSON.parse(
            fs.readFileSync(path.join(process.cwd(), 'node_modules', 'electron', 'package.json'), 'utf8')
        );
        return electronPkg.version;
    } catch (error) {
        console.error('❌ [Postinstall] Impossible de détecter la version d\'Electron');
        return null;
    }
}

function rebuildForElectron() {
    const electronVersion = getElectronVersion();
    if (!electronVersion) return false;

    console.log(`🔧 [Postinstall] Rebuild pour Electron ${electronVersion}...`);
    const rebuildCmd = `npx electron-rebuild --version=${electronVersion} --force --only better-sqlite3,oracledb`;
    return runCommand(rebuildCmd, 'Rebuild spécifique Electron');
}

function checkElectronInstalled() {
    try {
        const electronPath = path.join(process.cwd(), 'node_modules', 'electron');
        const packageJsonPath = path.join(electronPath, 'package.json');
        if (!fs.existsSync(electronPath)) {
            console.log('❌ [Postinstall] Electron n\'est pas installé dans node_modules');
            return false;
        }
        if (!fs.existsSync(packageJsonPath)) {
            console.log('❌ [Postinstall] package.json d\'Electron introuvable');
            return false;
        }
        const electronPkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        console.log(`✅ [Postinstall] Electron détecté - Version: ${electronPkg.version}`);
        return true;
    } catch (error) {
        console.error('❌ [Postinstall] Erreur lors de la vérification d\'Electron:', error.message);
        return false;
    }
}

function main() {
    console.log('🔍 [Postinstall] Vérification de l\'installation d\'Electron...');
    if (!checkElectronInstalled()) {
        console.log('⚠️ [Postinstall] Electron n\'est pas correctement installé, tentative de réinstallation...');
        const electronReinstall = runCommand('npm install electron@36.3.2 --save-dev --no-audit', 'Réinstallation d\'Electron');
        if (!electronReinstall) {
            console.error('❌ [Postinstall] CRITIQUE: Impossible de réinstaller Electron');
            process.exit(1);
        }
        if (!checkElectronInstalled()) {
            console.error('❌ [Postinstall] CRITIQUE: Electron toujours absent après réinstallation');
            process.exit(1);
        }
    }

    console.log('📦 [Postinstall] Installation des dépendances natives avec electron-builder...');
    const appDepsSuccess = runCommand(
        'npx electron-builder install-app-deps --arch x64 --platform win32',
        'Installation des dépendances d\'application'
    );

    if (!appDepsSuccess) {
        console.log('⚠️ [Postinstall] electron-builder install-app-deps a échoué, essai de méthode alternative...');
        const directRebuildSuccess = rebuildForElectron();
        if (!directRebuildSuccess) {
            console.log('⚠️ [Postinstall] Rebuild Electron échoué, essai méthode alternative...');
            const sqlite3RebuildSuccess = runCommand(
                'npx electron-rebuild --force --only better-sqlite3,oracledb',
                'Rebuild de better-sqlite3 uniquement'
            );
            if (!sqlite3RebuildSuccess) {
                console.error('❌ [Postinstall] ATTENTION: Toutes les tentatives de rebuild ont échoué. L\'application pourrait ne pas fonctionner correctement.');
                console.error('❌ [Postinstall] Vous devrez peut-être exécuter manuellement: npm run setup-native-deps');
            }
        }
    }

    console.log('🧹 [Postinstall] Nettoyage des dépendances...');
    const cleanupSuccess = runCommand('node scripts/cleanup-dependencies.js', 'Nettoyage des dépendances');
    if (!cleanupSuccess) {
        console.log('⚠️ [Postinstall] Le nettoyage a échoué, mais ce n\'est pas critique');
    }

    console.log('🔍 [Postinstall] Vérification finale...');
    const sqlite3Path = path.join(process.cwd(), 'node_modules', 'better-sqlite3', 'build', 'Release');
    if (fs.existsSync(sqlite3Path)) {
        const files = fs.readdirSync(sqlite3Path);
        const nodeFiles = files.filter(f => f.endsWith('.node'));
        console.log(`✅ [Postinstall] Modules natifs détectés: ${nodeFiles.join(', ')}`);
    } else {
        console.log('⚠️ [Postinstall] Dossier des modules natifs introuvable');
    }

    console.log('🎉 [Postinstall] Script postinstall terminé');
    console.log('ℹ️ [Postinstall] Si des erreurs persistent, exécutez: npm run setup-native-deps');
}

process.on('uncaughtException', (error) => {
    console.error('❌ [Postinstall] Erreur non capturée:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ [Postinstall] Promesse rejetée:', reason);
    process.exit(1);
});

main();

# Guide de développement

Ce document résume la mise en place d'un environnement local pour développer « Indi-Suivi » et les bonnes pratiques à adopter en 2025.

## Prérequis

- **Node.js 20 LTS** ou version ultérieure.
- **Electron 36.3.2** fourni via le script `build.ps1`.
- **npm** est recommandé pour la gestion des dépendances. Yarn ou pnpm fonctionnent mais ne sont pas testés.
- Un système Windows, macOS ou Linux récent.
- Sous **Windows**, installez **w64devkit** dans `D:\tools\w64devkit` afin de compiler les dépendances natives. Le script `build.ps1` le configure automatiquement.

## Installation des dépendances

1. Clonez le dépôt puis installez les modules (y compris les dépendances de développement) :
   ```bash
   npm install --include=dev
   ```
   Le script `postinstall` télécharge les modules natifs précompilés pour Electron.
   Si un message d'erreur apparaît lors de la compilation de `ffi-napi` ou d'autres modules,
   exécutez :
   ```bash
   npm run setup-native-deps
   ```
   Cela tentera d'utiliser les binaires précompilés fournis par `electron-builder`.
2. Lancez le script d'installation pour créer la configuration et la base SQLite :
   ```bash
   npm run install-app
   ```
   Vous pouvez modifier `config/app-config.json` après cette étape pour ajuster le chemin de la base ou le niveau de journalisation.

## Lancer l'application en mode développement

Utilisez le script suivant pour ouvrir la fenêtre Electron avec rechargement automatique :

```bash
npm run dev
```

Les fichiers du renderer sont générés à chaud par Vite. Toute modification dans `src/renderer` rechargera l'interface.
Le script se termine automatiquement quand la fenêtre Electron est fermée grâce
à l'option `-k` de `concurrently`. Vous pouvez aussi l'interrompre manuellement
via <kbd>Ctrl</kbd>+<kbd>C</kbd> si besoin.

## Structure du projet

```
src/
  main.js        Processus principal Electron (API, base SQLite)
  preload.ts     Passerelle sécurisée vers le renderer
  renderer/      Application React
  shared/        Types partagés (TypeScript)
scripts/install.js  Initialisation de la base et de la config
config/          Fichiers de configuration
```

## Packaging et distribution

La commande suivante crée un exécutable pour votre plateforme :

```bash
npm run dist
```
Les fichiers générés se trouvent dans le dossier `release-builds/`. La configuration d'Electron Builder se situe dans la section `build` du `package.json`.
Sous Windows, exécutez simplement `scripts/build.ps1` pour lancer automatiquement la compilation, appliquer les optimisations et compresser l'exécutable avec **UPX** si disponible. Le script nettoie aussi le cache Electron avant l'installation pour éviter les erreurs de téléchargement.
Vous pouvez activer le téléchargement automatique des outils supplémentaires :

```powershell
scripts\build.ps1 -DownloadElectronLocally -DownloadTools -InstallDeps
```

Cette commande télécharge UPX et 7‑Zip si besoin, puis récupère Electron **36.3.2** et le place dans le cache pour accélérer `npm install`.

En cas de doute sur la présence d'Electron ou pour diagnostiquer une installation défaillante, lancez :

```powershell
scripts\electron-diagnostic.ps1
```

Une fois le build terminé, validez la présence des modules natifs avec :

```bash
npm run verify-build
```

### Conseils 2025

- Privilégiez l'utilisation de versions LTS des outils pour garantir la compatibilité.
- Testez les builds sur chaque plateforme cible (Windows, macOS, Linux) avant de publier.
- Documentez les changements majeurs dans un fichier `CHANGELOG.md`.
- Utilisez des commits structurés (`feat:`, `fix:`, `docs:`...) pour une meilleure lisibilité de l'historique.


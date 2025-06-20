# Guide de développement

Ce document résume la mise en place d'un environnement local pour développer « OtterCMS » et les bonnes pratiques à adopter en 2025.

## Prérequis

- **Node.js 20 LTS** ou version ultérieure.
- **Rust stable** pour compiler le backend Tauri (installé automatiquement par le script).
- **npm** est recommandé pour la gestion des dépendances. Yarn ou pnpm fonctionnent mais ne sont pas testés.
- Un système Windows, macOS ou Linux récent.
 - Sous **Windows**, exécutez `scripts/setup-tauri-tools.ps1` pour installer
   Rust portable.

## Installation des dépendances

1. Clonez le dépôt puis installez les modules (y compris les dépendances de développement) :
   ```bash
   npm install --include=dev
   ```
   Le script `postinstall` installe les dépendances nécessaires au fonctionnement du backend.
2. Lancez le script d'installation pour créer la configuration et la base SQLite :
   ```bash
   npm run install-app
   ```
   Vous pouvez modifier `config/config.json` après cette étape pour ajuster le chemin de la base ou le niveau de journalisation.

## Lancer l'application en mode développement

Lancez l'application en mode développement :

```bash
npm run dev
```

Les fichiers du renderer sont générés à chaud par Vite. Toute modification dans `src/renderer` rechargera automatiquement l'interface React.

## Structure du projet

```
src/
  renderer/      Application React
src-tauri/       Backend Rust (Tauri)
scripts/install.js  Initialisation de la base et de la config
config/          Fichiers de configuration
```

## Packaging et distribution

La commande suivante crée un exécutable Tauri :

```bash
npm run build
```
Sous Windows, exécutez d'abord `scripts/setup-tauri-tools.ps1` pour préparer
l'environnement (Rust portable). Le script crée un
fichier `start-tauri-env.ps1` qu'il faut charger dans votre terminal PowerShell
(commande `. .\start-tauri-env.ps1`) avant d'appeler `cargo tauri build
--release` dans `src-tauri`. Le script facultatif `setup-tools.ps1` peut
également installer UPX pour compresser l'exécutable.

### Conseils 2025

- Privilégiez l'utilisation de versions LTS des outils pour garantir la compatibilité.
- Testez les builds sur chaque plateforme cible (Windows, macOS, Linux) avant de publier.
- Documentez les changements majeurs dans un fichier `CHANGELOG.md`.
- Utilisez des commits structurés (`feat:`, `fix:`, `docs:`...) pour une meilleure lisibilité de l'historique.


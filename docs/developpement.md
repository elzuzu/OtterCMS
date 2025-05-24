# Guide de développement

Ce document résume la mise en place d'un environnement local pour développer « Indi-Suivi » et les bonnes pratiques à adopter en 2025.

## Prérequis

- **Node.js 20 LTS** ou version ultérieure.
- **npm** est recommandé pour la gestion des dépendances. Yarn ou pnpm fonctionnent mais ne sont pas testés.
- Un système Windows, macOS ou Linux récent.

## Installation des dépendances

1. Clonez le dépôt puis installez les modules :
   ```bash
   npm install
   ```
   Le script `postinstall` télécharge les modules natifs précompilés pour Electron.
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
Sous Windows, le script `scripts/build-app.ps1` permet de nettoyer et de lancer la construction en une seule commande.

### Conseils 2025

- Privilégiez l'utilisation de versions LTS des outils pour garantir la compatibilité.
- Testez les builds sur chaque plateforme cible (Windows, macOS, Linux) avant de publier.
- Documentez les changements majeurs dans un fichier `CHANGELOG.md`.
- Utilisez des commits structurés (`feat:`, `fix:`, `docs:`...) pour une meilleure lisibilité de l'historique.


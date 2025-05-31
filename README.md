# Indi-Suivi

Application Electron et React permettant le suivi d'individus avec champs dynamiques et interface moderne.

## Sommaire

- [Nouveautés](#nouveaut%C3%A9s)
- [Fonctionnalités](#fonctionnalit%C3%A9s)
- [Prérequis](#pr%C3%A9requis)
- [Installation rapide](#installation-rapide)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Développement](#d%C3%A9veloppement)
- [Construction et distribution](#construction-et-distribution)
- [Documentation](#documentation)
- [Licence](#licence)

## Nouveautés

Version **2.0** avec thèmes personnalisables et navigation revue.

L'interface repose désormais sur le template **Datta Able** adapté à Electron. Les principaux écrans utilisent des wrappers React (`DattaCard`, `DattaDataTable`...) pour harmoniser le rendu.

## Fonctionnalités

- Gestion des utilisateurs et des rôles (login Windows optionnel)
- Catégories et champs dynamiques entièrement configurables
- Import CSV/Excel avec attribution en masse
- Tableau de bord synthétique et audit complet des modifications
- Interface React moderne
- Visualisation graphique de l'historique pour certains champs numériques

## Prérequis

- Node.js 20.19.2 ou plus récent
- npm (ou un gestionnaire compatible)

## Installation rapide

```bash
npm install --include=dev   # dépendances + devDependencies
npm run install-app         # crée la configuration et la base SQLite
```

## Configuration

Le fichier `config/app-config.json` contient le chemin de la base de données et d'autres options (langue, titre...). Modifiez-le après l'installation si nécessaire.

## Architecture

```
src/
  main.js        Processus principal Electron
  preload.ts     Passerelle sécurisée
  renderer/      Application React
  shared/        Types TypeScript
scripts/         Outils d'installation et de build
config/          Fichiers de configuration
```

## Développement

Lancez l'application en mode développement avec rechargement automatique :

```bash
npm run dev
```

## Construction et distribution

Pour générer un installateur via **electron-builder** :

```bash
npm run dist
```

Sur Windows, des scripts PowerShell permettent un build plus complet :

- `scripts/build-app.ps1` : nettoyage, build et packaging avec options `-UseForge` ou `-UsePackager` en cas de problème.
- `scripts/build-ultra-optimized.ps1` : version allégée visant un exécutable < 40 MB.

Exemple :

```powershell
pwsh scripts/build-app.ps1 -Clean
```

Les exécutables sont placés dans `release-builds/`.

## Documentation

Les guides détaillés se trouvent dans le dossier [`docs`](docs). Consultez notamment `developpement.md` et `guide-utilisation.md`.

## Licence

MIT

# Indi-Suivi

Application Electron et React permettant le suivi d'individus avec champs dynamiques et interface moderne.

## Sommaire

- [Nouveautés](#nouveautés)
- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation rapide](#installation-rapide)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Développement](#développement)
- [Construction et distribution](#construction-et-distribution)
- [Documentation](#documentation)
- [Licence](#licence)

## Nouveautés

Version **2.0** avec thèmes personnalisables et navigation revue.

L'interface repose desormais sur le template **Datta Able** adapte a Electron.
Les principaux ecrans utilisent des wrappers React (`DattaCard`, `DattaDataTable`...) pour harmoniser le rendu.
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
npm run install-app
pwsh scripts/copy-datta-assets.ps1   # copie les images Datta Able
```

## Configuration

Le fichier `config/app-config.json` définit le chemin de la base SQLite et d'autres options :

```json
{
  "appTitle": "Indi-Suivi",
  "dbPath": "../db/indi-suivi.sqlite",
  "defaultLanguage": "fr",
  "logLevel": "info"
}
```


## Architecture

```
src/main.js        Processus principal Electron et API SQLite
src/preload.ts     Passerelle sécurisée
src/renderer/      Application React (renderer Vite)
scripts/install.js Initialisation de la base
```

## Thèmes et composants Datta

- La fonction `useTheme` applique dynamiquement la couleur principale.
- Les styles principaux se trouvent dans `src/renderer/styles/themes.css` et `app.css`.
- Des wrappers (`DattaCard`, `DattaDataTable`...) simplifient l'utilisation des composants MUI pour rester proches du design Datta Able.

Le schéma SQLite est créé lors de l'exécution de `npm run install-app`.

## Développement

Lancement avec rechargement automatique :

```bash
npm run dev
```

Si l'interface Datta Able ne réagit pas comme prévu, ouvrez la console des outils de développement d'Electron (raccourci `Ctrl+Shift+I`) pour vérifier la présence d'erreurs JavaScript.

La structure détaillée et des conseils supplémentaires se trouvent dans [docs/developpement.md](docs/developpement.md).

## Construction et distribution

Générez les binaires :

```bash
npm run dist
```

Les artefacts sont placés dans `release-builds/`. La configuration d'Electron Builder se trouve dans la section `build` du `package.json` (packaging **NSIS** sous Windows).
Sous Windows, le script `scripts/build-app.ps1` permet de nettoyer puis de lancer la compilation complète. Il propose également les options `-UseForge` et `-UsePackager` pour essayer d'autres outils si besoin. Pensez à exécuter `scripts/check-icon.ps1` pour valider l'icône `src/assets/app-icon.ico` avant de compiler.

### Optimisation de la taille

L'objectif est de maintenir l'exécutable final sous **60 MB**.
Plusieurs scripts automatisent la vérification :

```bash
npm run dist:validate
```

Ce script compile puis lance `scripts/validate-build.js` qui contrôle la taille des artefacts dans `release-builds/`.
Vous pouvez aussi analyser les dépendances avec :

```bash
pwsh scripts/size-analysis.ps1
node scripts/analyze-app.js
```


## Documentation

- [Guide d'administration](docs/guide-administration.md)
- [Guide d'utilisation](docs/guide-utilisation.md)
- [Architecture des themes](docs/themes.md)
- [Guide de développement](docs/developpement.md)

## État actuel du code

- Base technique : Node.js 20+, Electron 36 et React 19 packagés via **Vite**.
- Base SQLite gérée avec **better-sqlite3** et initialisée par `scripts/install.js`.
- Rôles et permissions centralisés dans `src/renderer/constants/permissions.js`.
- Champs dynamiques évalués par un parseur sécurisé (`src/renderer/utils/safeExpression.js`).
- Audit complet enregistré dans la table `individu_audit` et utilisé lors de l'attribution en masse.
- Fonction d'attribution massive présente dans `src/main.js` (`attribuerIndividusEnMasse`).
- TODO en cours : typer les messages IPC (`src/preload.ts`), préciser le type des données du store (`src/renderer/store.ts`) et ajouter l'UI de pagination dans `DattaDataTable`.

## Licence

MIT

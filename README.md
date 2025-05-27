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
- Interface React moderne avec mode clair/sombre
- Visualisation graphique de l'historique pour certains champs numériques

## Prérequis

- Node.js 20.19.2 ou plus récent
- npm (ou un gestionnaire compatible)

## Installation rapide

```bash
npm install        # dépendances
npm run install-app
```

## Configuration

Le fichier `config/app-config.json` définit le chemin de la base SQLite et d'autres options :

```json
{
  "appTitle": "Indi-Suivi",
  "dbPath": "./db/indi-suivi.sqlite",
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

- La fonction `useTheme` applique dynamiquement le mode clair ou sombre et la couleur principale.
- Les styles principaux se trouvent dans `src/renderer/styles/themes.css` et `app.css`.
- Des wrappers (`DattaCard`, `DattaDataTable`, `PageWrapper`...) simplifient l'utilisation des composants MUI pour rester proches du design Datta Able.

Le schéma SQLite est créé lors de l'exécution de `npm run install-app`.

## Développement

Lancement avec rechargement automatique :

```bash
npm run dev
```

La structure détaillée et des conseils supplémentaires se trouvent dans [docs/developpement.md](docs/developpement.md).

## Construction et distribution

Générez les binaires :

```bash
npm run dist
```

Les artefacts sont placés dans `release-builds/`. La configuration d'Electron Builder se trouve dans la section `build` du `package.json` (packaging **NSIS** sous Windows).
Sous Windows, le script `scripts/build-app.ps1` permet de nettoyer puis de lancer la compilation complète. Il propose également les options `-UseForge` et `-UsePackager` pour essayer d'autres outils si besoin. Pensez à exécuter `scripts/check-icon.ps1` pour valider l'icône `src/assets/app-icon.ico` avant de compiler.


## Documentation

- [Guide d'administration](docs/guide-administration.md)
- [Guide d'utilisation](docs/guide-utilisation.md)
- [Architecture des themes](docs/themes.md)
- [Guide de développement](docs/developpement.md)

## Licence

MIT

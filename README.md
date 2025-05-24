# Indi-Suivi - Neo UI Edition

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

Version **2.0 Neo UI** avec thèmes personnalisables et navigation revue.

## Fonctionnalités

- Gestion des utilisateurs et des rôles (login Windows optionnel)
- Catégories et champs dynamiques entièrement configurables
- Import CSV/Excel avec attribution en masse
- Tableau de bord synthétique et audit complet des modifications
- Interface React moderne avec mode clair/sombre

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

Placez ce fichier à côté de l'exécutable après packaging pour personnaliser l'installation.

## Architecture

```
src/main.js        Processus principal Electron et API SQLite
src/preload.ts     Passerelle sécurisée
src/renderer/      Application React (renderer Vite)
scripts/install.js Initialisation de la base
```

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
npm run make
```

Les artefacts sont placés dans `out/make/`. Consultez `forge.config.mjs` pour modifier les options de packaging.
Sous Windows, vous pouvez exécuter `scripts/build-app.ps1` pour nettoyer et lancer la construction en une seule commande.


## Documentation

- [Guide d'administration](docs/guide-administration.md)
- [Guide d'utilisation](docs/guide-utilisation.md)
- [Guide de développement](docs/developpement.md)

## Licence

MIT

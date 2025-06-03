# Indi-Suivi

![Node.js >=20](https://img.shields.io/badge/node-%3E=20.0-brightgreen)
![License MIT](https://img.shields.io/badge/license-MIT-blue.svg)

Application Electron et React pour le suivi d'individus avec champs dynamiques et interface moderne.

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
- [Graph de navigation](#graph-de-navigation)
- [Licence](#licence)

## Nouveautés

Version **2.0** avec thèmes personnalisables, navigation revue et intégration de graphiques ApexCharts.
- Fonctionnalité de bordure Windows actuellement désactivée en attendant une solution native.
- Connexion automatique possible via le login Windows local (sans domaine) détecté avec `os.userInfo().username`.

## Fonctionnalités

- Gestion des utilisateurs et des rôles (login Windows optionnel)
- Catégories et champs dynamiques entièrement configurables
- Import CSV/Excel avec attribution en masse
- Tableau de bord synthétique et audit complet des modifications
- Visualisation graphique de l'historique de certains champs numériques
- Interface React moderne basée sur le template Datta Able

## Prérequis

 - **Node.js 20** ou version ultérieure
 - **Python 3** installé et accessible via `python` pour la compilation node-gyp
 - **npm** ou équivalent (pnpm, Yarn)
- Sous **Windows**, les *Visual Studio Build Tools* avec le composant
  « Desktop development with C++ » sont recommandés pour compiler les modules
  natifs (node-gyp), mais le script peut fonctionner sans.

## Installation rapide

```bash
npm install --include=dev   # installe les dépendances et devDependencies
npm run install-app         # crée la configuration et la base SQLite
```

## Configuration

Le fichier `config/app-config.json` définit notamment le chemin de la base de données et la langue de l'application. Modifiez-le après l'installation si nécessaire.

## Architecture

```
src/
  main.js        Processus principal Electron
  preload.ts     Passerelle sécurisée vers l'API
  renderer/      Application React
  shared/        Types et constantes TypeScript
scripts/         Outils d'installation et de build
config/          Fichiers de configuration
```

## Développement

Démarrage en mode développement avec rechargement automatique :

```bash
npm run dev
```

## Construction et distribution

Génération d'un installateur via **electron-builder** :

```bash
npm run dist
```

Si la compilation des dépendances natives échoue, lancez :

```bash
npm run setup-native-deps
```
pour récupérer automatiquement les binaires précompilés.

Sous Windows, un unique script PowerShell `scripts/build.ps1` automatise la construction et la compression UPX.
Le script supprime également le cache Electron avant l'installation des dépendances afin d'éviter les erreurs de téléchargement.

Les exécutables sont déposés dans le dossier `release-builds/`.

## Documentation

Les guides détaillés se trouvent dans le dossier [`docs`](docs). Consultez en particulier `developpement.md` et `guide-utilisation.md`.

## Graph de navigation

La navigation principale est décrite par le GraphML ci‑dessous. Le fichier d’origine reste disponible dans [`docs/navigation.graphml`](docs/navigation.graphml).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">
  <graph id="IndiSuiviNavigation" edgedefault="directed">
    <node id="Auth"/>
    <node id="MainContent"/>
    <node id="Dashboard"/>
    <node id="IndividusList"/>
    <node id="ImportData"/>
    <node id="MassAttribution"/>
    <node id="AdminCategories"/>
    <node id="AdminUsersSection"/>
    <node id="AdminTemplate"/>
    <node id="UserSettings"/>
    <edge source="Auth" target="MainContent"/>
    <edge source="MainContent" target="Dashboard"/>
    <edge source="MainContent" target="IndividusList"/>
    <edge source="MainContent" target="ImportData"/>
    <edge source="MainContent" target="MassAttribution"/>
    <edge source="MainContent" target="AdminCategories"/>
    <edge source="MainContent" target="AdminUsersSection"/>
    <edge source="MainContent" target="AdminTemplate"/>
    <edge source="MainContent" target="UserSettings"/>
    <edge source="Dashboard" target="IndividusList"/>
    <edge source="IndividusList" target="IndividuFicheDetails"/>
    <edge source="IndividusList" target="NouvelIndividu"/>
    <node id="IndividuFicheDetails"/>
    <node id="NouvelIndividu"/>
    <edge source="IndividuFicheDetails" target="IndividusList"/>
    <edge source="NouvelIndividu" target="IndividusList"/>
  </graph>
</graphml>
```

## Licence

MIT

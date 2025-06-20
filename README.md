# OtterCMS

![Node.js >=20](https://img.shields.io/badge/node-%3E=20.0-brightgreen)
![License MIT](https://img.shields.io/badge/license-MIT-blue.svg)

**Auteur :** AWY  
**Entreprise :** EGE

Application Tauri 2 et React pour le suivi d'individus avec champs dynamiques et interface moderne.

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
- [Guide d'utilisation - Build Tauri 2](#guide-dutilisation---build-tauri-2)
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
- **Rust stable** avec toolchain MSVC (installé par le script)
- Plugin **SQL** Tauri (SQLite)
- **npm** ou équivalent (pnpm, Yarn)

## Installation rapide

```bash
npm install --include=dev   # installe les dépendances et devDependencies
npm run install-app         # crée la configuration et la base SQLite
```

## Configuration

Le fichier `config/config.json` définit notamment le chemin de la base de données et la langue de l'application. Modifiez-le après l'installation si nécessaire.

## Architecture

```
src/
  renderer/      Application React
  shared/        Types et constantes TypeScript
src-tauri/       Backend Rust (Tauri)
scripts/         Outils d'installation et de build
config/          Fichiers de configuration
```

La base de données est gérée depuis le frontend avec le **plugin SQL** de Tauri.
Les commandes Rust ont été réduites au minimum.

## Développement

Démarrage en mode développement avec rechargement automatique :

```bash
npm run dev
```

## Construction et distribution

Génération d'un exécutable Tauri :

```bash
npm run build
```

Sous Windows, exécutez `scripts/setup-tauri-tools.ps1` pour installer
l'environnement Rust portable. Le script
génère un fichier `start-tauri-env.ps1` qu'il faut charger avant la compilation
(via `.` suivi du chemin). Vous pourrez ensuite lancer la commande suivante
depuis `src-tauri` :

```powershell
cargo tauri build --release
```

Un script PowerShell complet (`build.ps1`) est également disponible à la racine
du dépôt pour automatiser l'installation des outils et la compilation. Il
télécharge **PortableBuildTools** avec les options `--accept-license`,
`--msvc=latest`, `--sdk=latest`, `--target=x64` et `--host=x64`, puis exécute
`npx tauri build --no-bundle`.

Utilisation typique :

```powershell
./build.ps1
```

Adaptez les paramètres dans le fichier si vous devez cibler d'autres versions
de MSVC ou un chemin différent pour les outils.

## Documentation

Les guides détaillés se trouvent dans le dossier [`docs`](docs). Consultez en particulier `developpement.md` et `guide-utilisation.md`.

## Graph de navigation

La navigation principale est décrite par le GraphML ci‑dessous. Le fichier d’origine reste disponible dans [`docs/navigation.graphml`](docs/navigation.graphml).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">
  <graph id="OtterCMSNavigation" edgedefault="directed">
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

## Guide d'utilisation - Build Tauri 2

### Lancer en développement
```bash
npm run dev
```

### Construire l'application
```bash
npm run build
```

Les scripts utilisent Tauri 2 avec un backend Rust minimal. La base de données SQLite est gérée via le **plugin SQL**.
## Licence

MIT

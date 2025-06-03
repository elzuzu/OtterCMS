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
- [Guide d'utilisation final - Build Electron 37.0.0-beta.2](#guide-dutilisation-final---build-electron-3700-beta2)
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
- **Electron 37.0.0-beta.2** téléchargé automatiquement par le script
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
Vous pouvez lui passer des options supplémentaires :

```powershell
scripts\build.ps1 -DownloadElectronLocally -DownloadTools -InstallDeps
```

`-DownloadTools` télécharge UPX et 7‑Zip si nécessaire, tandis que `-DownloadElectronLocally` récupère l'archive officielle d'Electron **37.0.0-beta.2** et la place dans le cache npm.

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

## Guide d'utilisation final - Build Electron 37.0.0-beta.2

### 🎯 Système 100% Autonome Intégré

Ce guide présente le **système de build final** qui télécharge automatiquement toutes les dépendances nécessaires et génère des builds optimisés avec Electron 37.0.0-beta.2.

### 🚀 Commandes Principales (Ordre Recommandé)

#### 1. Build Standard Autonome
```powershell
# Télécharge Electron 37.0.0-beta.2 + outils + build optimisé
.\scripts\build.ps1 -DownloadElectronLocally -InstallDeps
```

#### 2. Build Ultra-Optimisé Complet
```powershell
# Mode complet: toutes les optimisations + compression UPX
.\scripts\build.ps1 -DownloadAllDeps -DownloadElectronLocally -InstallDeps -UltraOptimize
```

#### 3. Build avec Streaming et Module Federation
```powershell
# Build 2025: streaming + lazy loading + module federation
.\scripts\build.ps1 -DownloadAllDeps -DownloadElectronLocally -InstallDeps -EnableStreaming -ModuleFederation
```

#### 4. Build Ultra-Complet (Recommandé)
```powershell
# TOUT en une commande: téléchargements + optimisations + compression maximale
.\scripts\build.ps1 -DownloadAllDeps -DownloadElectronLocally -InstallDeps -UltraOptimize -EnableStreaming -UPXLevel 9
```

### 🛠️ Options de Build Alternatives

#### Electron Forge
```powershell
.\scripts\build.ps1 -UseForge -DownloadElectronLocally -InstallDeps -DownloadAllDeps
```

#### Electron Packager
```powershell
.\scripts\build.ps1 -UsePackager -DownloadElectronLocally -InstallDeps -DownloadAllDeps
```

#### Build Propre (Clean Build)
```powershell
.\scripts\build.ps1 -Clean -DownloadElectronLocally -InstallDeps -DownloadAllDeps
```

### 🚨 Dépannage et Options de Secours

#### Si problèmes avec modules natifs
```powershell
.\scripts\build.ps1 -DownloadElectronLocally -InstallDeps -SkipNativeDeps
```

#### Si problèmes avec UPX
```powershell
.\scripts\build.ps1 -DownloadElectronLocally -InstallDeps -SkipUPX
```

#### Mode Verbose (Débogage)
```powershell
.\scripts\build.ps1 -DownloadElectronLocally -InstallDeps -Verbose
```

#### Désactiver téléchargement automatique
```powershell
.\scripts\build.ps1 -DownloadAllDeps:$false -DownloadElectronLocally -InstallDeps
```

### 📊 Scripts NPM Avancés

#### Builds spécialisés
```bash
npm run build:optimized       # Build avec optimisations automatiques
npm run build:ultra          # Build ultra-optimisé avec UPX
npm run build:streaming      # Build avec optimisations streaming
```

#### Distributions spécialisées
```bash
npm run dist:ultra           # Distribution ultra-optimisée
npm run dist:stream          # Distribution avec streaming
npm run dist:forge           # Distribution avec Electron Forge
npm run dist:packager        # Distribution avec Electron Packager
```

#### Optimisations individuelles
```bash
npm run optimize:deps        # Optimise les dépendances
npm run optimize:assets      # Optimise les assets (WebP/AVIF)
npm run compress:upx         # Compression UPX avancée
npm run streaming:build      # Build avec optimisations streaming
npm run validate:build       # Validation du build
npm run analyze              # Analyse du bundle
```

### 🌐 Outils Téléchargés Automatiquement

Le système télécharge automatiquement les outils suivants :

#### Outils de Compression
- **UPX 4.2.2** - Compression d'exécutables ultra-performante
- **7-Zip 23.01** - Compression LZMA2 pour assets lourds
- **Brotli 1.1.0** - Compression web ultra-efficace

#### Outils d'Optimisation d'Images
- **WebP Tools 1.3.2** - Conversion vers WebP (format 2025)
- **AVIF Tools 1.0.3** - Conversion vers AVIF (format nouvelle génération)

### 📁 Structure des Fichiers Générés

```
release-builds/
├── Indi-Suivi-2.0.0-x64.exe     # Installateur NSIS (optimisé)
├── Indi-Suivi-2.0.0-x64.zip     # Version portable (compressée)
└── win-unpacked/                  # Version non packagée
    └── Indi-Suivi.exe            # Exécutable principal (UPX compressé)

local-tools/                       # Outils téléchargés automatiquement
├── UPX/upx.exe                   # UPX pour compression
├── 7-Zip/7z.exe                  # 7-Zip pour compression avancée
├── WebP/bin/cwebp.exe            # Outils WebP
├── AVIF/bin/avifenc.exe          # Outils AVIF
└── Brotli/brotli.exe             # Compresseur Brotli

dist/                              # Build Vite optimisé
├── assets/                       # Assets optimisés (WebP/AVIF)
├── lazy-manifest.json            # Manifest de lazy loading
└── index.html                    # Point d'entrée

.vite/build/                       # Build Electron
├── main.js                       # Processus principal
└── preload.js                    # Script de préchargement
```

### ✅ Vérifications Automatiques du Système

Le script vérifie et configure automatiquement :

1. **Electron 37.0.0-beta.2** - Téléchargement et cache local
2. **Vite** - Installation automatique si manquant  
3. **UPX et outils** - Téléchargement depuis sources officielles
4. **Modules natifs** - Reconstruction pour Electron 37
5. **Cache npm** - Nettoyage et optimisation
6. **Variables d'environnement** - Configuration et nettoyage

### 🎉 Résultats Attendus

#### Performance
- **Taille finale**: 40-80 MB (vs 200+ MB avant optimisation)
- **Temps de build**: 3-8 minutes (premier run avec téléchargements)
- **Compression**: Jusqu'à 70% de réduction avec UPX + optimisations

#### Compatibilité
- **OS**: Windows x64
- **Electron**: 37.0.0-beta.2
- **Node.js**: 20+ LTS
- **Formats**: NSIS, Portable, Répertoire

#### Fonctionnalités 2025
- **Streaming & Lazy Loading** - Chargement progressif des composants
- **Module Federation** - Architecture micro-frontends
- **Tree Shaking Ultra** - Élimination du code mort
- **Compression Multi-Niveaux** - UPX + LZMA2 + Brotli
- **Formats d'Images Modernes** - WebP + AVIF
- **Workers Background** - Traitement asynchrone

### 💡 Conseils d'Utilisation

#### Pour le développement quotidien
```powershell
# Build rapide pour tester
.\scripts\build.ps1 -DownloadElectronLocally -InstallDeps

# Mode développement avec rechargement
npm run dev
```

#### Pour la production
```powershell
# Build complet optimisé pour distribution
.\scripts\build.ps1 -DownloadAllDeps -DownloadElectronLocally -InstallDeps -UltraOptimize -EnableStreaming
```

#### Pour résoudre les problèmes
```powershell
# Nettoyage complet et rebuild
.\scripts\build.ps1 -Clean -DownloadElectronLocally -InstallDeps -Verbose
```

### 🔧 Configuration Avancée

#### Variables d'environnement supportées
- `ELECTRON_CACHE` - Cache Electron personnalisé
- `NODE_ENV=production` - Mode production
- `DEBUG=electron-builder` - Debug electron-builder

#### Fichiers de configuration
- `package.json` - Configuration build et scripts
- `vite.config.js` - Configuration Vite renderer
- `vite.main.config.ts` - Configuration Vite main process
- `vite.preload.config.ts` - Configuration Vite preload

### 🚀 Conclusion

Ce système final offre :
- ✅ **Zéro configuration manuelle** - Tout est téléchargé automatiquement
- ✅ **Builds reproductibles** - Versions d'outils garanties
- ✅ **Optimisations 2025** - Technologies de pointe intégrées
- ✅ **Compression maximale** - Taille réduite de 70%+
- ✅ **Support Electron 37.0.0-beta.2** - Version beta stable
- ✅ **Gestion d'

## Licence

MIT

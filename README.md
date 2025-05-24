# Indi-Suivi - Neo UI Edition

Application Electron et React permettant le suivi d'individus avec champs dynamiques et une interface modernisée.

## 🎮 Nouveautés v2.0 - Neo UI

- **Design Fluent Modern** avec effets d'acrylique et animations fluides
- **Modes clair et sombre** avec bordure de fenêtre dynamique
- **Navigation latérale retravaillée** pour un accès rapide aux modules
- **Thèmes personnalisables** (bleu, vert, violet, orange, rouge)

## Fonctionnalités principales

- Gestion des utilisateurs (admin, manager, utilisateur) avec possibilité d'associer un compte au login Windows local.
- Catégories et champs personnalisables pour décrire chaque individu.
- Import CSV/Excel avec templates et attribution de masse.
- Tableau de bord et audit détaillé des modifications.
- Interface moderne construite avec React et Vite.

## Architecture

 - **src/main.js** : processus principal Electron. Il expose des API IPC et accède à SQLite via `better-sqlite3`.
- **src/preload.ts** : passerelle sécurisée entre le renderer et le processus principal.
- **src/renderer/** : application React (renderer) compilée par Vite.
- **scripts/install.js** : initialise la configuration et la base de données.

### Modèle de données (SQLite)

La base est définie dans `config/app-config.json` (par défaut `db/indi-suivi.sqlite`).
Lors du packaging, l'application cherche toujours ce fichier dans `./config/app-config.json` à côté de l'exécutable.

- **users**
  - `id` INTEGER primaire
  - `username` UNIQUE
  - `password_hash`
  - `role` (`admin`, `manager`, `user`)
  - `windows_login` optionnel
  - `deleted` (suppression logique)
- **categories**
  - `id` INTEGER primaire
  - `nom`
  - `champs` JSON décrivant les champs dynamiques
  - `ordre`
  - `deleted`
- **individus**
  - `id` INTEGER primaire
  - `numero_unique`
  - `en_charge` référence vers `users`
  - `categorie_id` référence vers `categories`
  - `champs_supplementaires` JSON
  - `deleted`
- **individu_audit**
  - `id` INTEGER primaire
  - `individu_id` référence vers `individus`
  - `champ`, `ancienne_valeur`, `nouvelle_valeur`
  - `utilisateur_id` référence vers `users`
  - `date_modif` DATETIME
  - `action` (`create`, `update`, `delete`, `import_create`, `import_update`, `attribution_masse`)
  - `fichier_import` nom du fichier d'import

### Configuration

Exemple de fichier `config/app-config.json` :

```json
{
  "appTitle": "Indi-Suivi",
  "dbPath": "./db/indi-suivi.sqlite",
  "defaultLanguage": "fr",
  "logLevel": "info"
}
```

Modifiez `dbPath` pour stocker la base ailleurs (partage réseau, etc.).
Après installation, placez `config/app-config.json` à côté de l'exécutable pour personnaliser la configuration.

## Installation

1. Installez Node.js 20.19.2 (Windows x64) ou une version ultérieure.
2. Installez les dépendances (les modules natifs comme **better-sqlite3** seront
   récupérés en version précompilée grâce au script `postinstall`) :
   ```bash
   npm install
   ```
3. Initialisez la configuration et la base :
   ```bash
   npm run install-app
   ```
4. Générez les fichiers du renderer (le dossier `dist/` n'est plus suivi dans le dépôt) :
   ```bash
   npx vite build
   ```

## Développement

Lancez l'application avec rechargement automatique :

```bash
npm run dev
```

## Construction et distribution

Générez les binaires avec Electron Forge :

```bash
npm run make
```

Les fichiers sont disponibles dans `out/make/`.

### Build du renderer seul

Pour compiler uniquement la partie React :

```bash
npx vite build
```

Le résultat se trouve dans `dist/` et doit être regénéré après chaque modification ou après avoir cloné le dépôt.

## Documentation

Consultez le [guide d'administration](docs/guide-administration.md) pour la gestion des catégories et des champs dynamiques.

## Licence

MIT

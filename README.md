# Indi-Suivi

Application Electron et React permettant le suivi d'individus avec champs dynamiques et gestion fine des droits.

## Fonctionnalités principales

- Gestion des utilisateurs (admin, manager, utilisateur) avec possibilité d'associer un compte au login Windows local.
- Catégories et champs personnalisables pour décrire chaque individu.
- Import CSV/Excel avec templates et attribution de masse.
- Tableau de bord et audit détaillé des modifications.
- Interface moderne construite avec React et Vite.

## Architecture

- **src/main.ts** : processus principal Electron. Il expose des API IPC et accède à SQLite via `better-sqlite3`.
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
  "appTitle": "Indi-Suivi Portable",
  "dbPath": "./data/indi-suivi-portable.sqlite",
  "defaultLanguage": "fr",
  "logLevel": "info"
}
```

Modifiez `dbPath` pour stocker la base ailleurs (partage réseau, etc.).
Après installation, placez `config/app-config.json` à côté de l'exécutable pour personnaliser la configuration.

## Installation

1. Installez Node.js 21.7.3 (Windows x64) ou une version ultérieure.
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Initialisez la configuration et la base :
   ```bash
   npm run install-app
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

Le résultat se trouve dans `dist/`.

## Licence

MIT

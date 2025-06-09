/**
 * install-libsql.js - Script d'initialisation pour libSQL
 * 
 * Ce script crée la configuration et la structure de base pour l'application OtterCMS
 * en utilisant libSQL comme base de données.
 */

const fs = require('fs');
const path = require('path');

// Configuration par défaut
const configTemplate = {
  "appTitle": "OtterCMS",
  "dbPath": "../db/ottercms.sqlite",
  "defaultLanguage": "fr",
  "logLevel": "info",
  "windowBorder": {
    "color": "#1890ff",
    "width": 0
  },
  "author": "AWY",
  "company": "EGE"
};

// Schéma SQL pour libSQL
const sqlSchema = `
-- Schema pour libSQL (OtterCMS v2.0)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'user')),
  windows_login TEXT,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  champs TEXT NOT NULL, -- JSON string for fields
  ordre INTEGER DEFAULT 0,
  deleted INTEGER DEFAULT 0 -- 0 for active, 1 for hidden/deleted
);

CREATE TABLE IF NOT EXISTS roles (
  name TEXT PRIMARY KEY,
  permissions TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS individus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_unique TEXT, -- Texte pour plus de flexibilité
  en_charge INTEGER REFERENCES users(id) ON DELETE SET NULL,
  categorie_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  champs_supplementaires TEXT NOT NULL DEFAULT '{}', -- JSON string for additional fields
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS individu_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  individu_id INTEGER NOT NULL REFERENCES individus(id) ON DELETE CASCADE,
  champ TEXT NOT NULL,
  ancienne_valeur TEXT,
  nouvelle_valeur TEXT,
  utilisateur_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  date_modif DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
  action TEXT NOT NULL, -- e.g., 'create', 'update', 'delete', 'import_create', 'import_update'
  fichier_import TEXT -- Name of the import file if applicable
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_windows_login ON users(windows_login);
CREATE INDEX IF NOT EXISTS idx_individus_numero ON individus(numero_unique);
CREATE INDEX IF NOT EXISTS idx_individus_categorie ON individus(categorie_id);
CREATE INDEX IF NOT EXISTS idx_audit_individu ON individu_audit(individu_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON individu_audit(date_modif);

-- Données initiales
INSERT OR IGNORE INTO roles (name, permissions) VALUES 
  ('admin', '["view_dashboard","view_individus","import_data","mass_attribution","manage_categories","manage_users","manage_roles","manage_columns","edit_all","edit_readonly_fields"]'),
  ('manager', '["view_dashboard","view_individus","import_data","mass_attribution","edit_all"]'),
  ('user', '["view_dashboard","view_individus","edit_assigned"]');

-- Utilisateur admin par défaut (mot de passe: admin)
-- Hash généré avec bcrypt cost 10
INSERT OR IGNORE INTO users (username, password_hash, role) VALUES 
  ('admin', '$2b$10$eImiTXuWVxfM37uY4JANjOVpMdLmEyIKZJyAZppq.gGWheCgd0XLK', 'admin');
`;

console.log('🚀 Initialisation OtterCMS avec libSQL...');

// Création du répertoire de configuration
const configDir = path.resolve(__dirname, '..', 'config');
if (!fs.existsSync(configDir)) {
  console.log('📁 Création du répertoire de configuration:', configDir);
  fs.mkdirSync(configDir, { recursive: true });
}

// Création du répertoire de base de données
const dbDir = path.resolve(__dirname, '..', 'db');
if (!fs.existsSync(dbDir)) {
  console.log('📁 Création du répertoire de base de données:', dbDir);
  fs.mkdirSync(dbDir, { recursive: true });
}

// Écriture du fichier de configuration
const configPath = path.join(configDir, 'app-config.json');
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify(configTemplate, null, 2), 'utf8');
  console.log('⚙️  Fichier de configuration créé:', configPath);
} else {
  console.log('⚙️  Configuration existante trouvée:', configPath);
}

// Création du fichier de schéma SQL pour libSQL
const schemaPath = path.join(dbDir, 'schema.sql');
fs.writeFileSync(schemaPath, sqlSchema, 'utf8');
console.log('📄 Schéma SQL créé:', schemaPath);

// Instructions pour libSQL
const dbPath = path.join(dbDir, 'ottercms.sqlite');
console.log('\n📋 Instructions pour libSQL:');
console.log('1. Le schéma SQL a été généré dans:', schemaPath);
console.log('2. L\'application Tauri initialisera automatiquement la base:', dbPath);
console.log('3. Au premier lancement, la base sera créée avec les données initiales');

console.log('\n👤 Utilisateur admin par défaut:');
console.log('   Username: admin');
console.log('   Password: admin');
console.log('   ⚠️  Changez ce mot de passe après la première connexion !');

console.log('\n✅ Initialisation terminée avec succès !');
console.log('📖 Consultez docs/guide-utilisation.md pour plus d\'informations');

// Vérification des prérequis
console.log('\n🔍 Vérification des prérequis...');

// Vérifier Node.js
const nodeVersion = process.version;
const nodeVersionNumber = parseInt(nodeVersion.replace('v', '').split('.')[0]);
if (nodeVersionNumber >= 20) {
  console.log('✅ Node.js:', nodeVersion, '(OK)');
} else {
  console.log('❌ Node.js:', nodeVersion, '(Requis: >=20.0.0)');
}

// Vérifier npm
try {
  const { execSync } = require('child_process');
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log('✅ npm:', npmVersion, '(OK)');
} catch (error) {
  console.log('❌ npm: Non trouvé');
}

// Vérifier Rust (optionnel pour dev)
try {
  const { execSync } = require('child_process');
  const rustVersion = execSync('rustc --version', { encoding: 'utf8' }).trim();
  console.log('✅ Rust:', rustVersion, '(OK)');
} catch (error) {
  console.log('⚠️  Rust: Non trouvé (requis pour la compilation)');
}

console.log('\n🚀 Prêt pour le développement !');
console.log('   npm run dev     # Mode développement');
console.log('   npm run build   # Build production');
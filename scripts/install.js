/**
 * install.js - Script d'initialisation Better-SQLite3
 * 
 * Ce script crée la configuration et la base de données initiale pour l'application OtterCMS
 * en utilisant la bibliothèque better-sqlite3 pour de meilleures performances.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

// Configuration par défaut
const configTemplate = {
  "appTitle": "OtterCMS-nodejs",
  // Utilise path.resolve pour garantir un chemin absolu correct quel que soit le contexte d'exécution
  "dbPath": path.resolve(__dirname, '..', 'db', 'ottercms.sqlite'),
  "defaultLanguage": "fr"
};

// Création du répertoire de configuration s'il n'existe pas
const configDir = path.resolve(__dirname, '..', 'config');
if (!fs.existsSync(configDir)) {
  console.log('Création du répertoire de configuration:', configDir);
  fs.mkdirSync(configDir, { recursive: true });
}

// Création du répertoire de base de données s'il n'existe pas
const dbDir = path.resolve(__dirname, '..', 'db');
if (!fs.existsSync(dbDir)) {
  console.log('Création du répertoire de base de données:', dbDir);
  fs.mkdirSync(dbDir, { recursive: true });
}

// Écriture du fichier de configuration s'il n'existe pas
const configPath = path.join(configDir, 'app-config.json');
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify(configTemplate, null, 2), 'utf8');
  console.log('Fichier de configuration créé à', configPath);
} else {
  console.log('Fichier de configuration existant trouvé à', configPath);
}

// Vérification de l'existence de la base de données
const dbPath = configTemplate.dbPath;
console.log('Vérification de la base de données à:', dbPath);

/**
 * Applique les PRAGMA SQLite recommandés pour les performances et l'accès multi-utilisateurs
 * @param {Database} db - L'instance de base de données better-sqlite3
 */
function applyPragmas(db) {
  console.log('Application des PRAGMAs pour optimisation...');
  db.pragma('journal_mode = WAL');            // Active Write-Ahead Logging
  db.pragma('synchronous = NORMAL');          // Bon équilibre entre performance et sécurité
  db.pragma('foreign_keys = ON');             // Active les contraintes de clés étrangères
  db.pragma('cache_size = -2000');            // ~2MB de cache (valeur négative = kilobytes)
  db.pragma('busy_timeout = 5000');           // Attendre si la DB est verrouillée (ms)
  db.pragma('temp_store = MEMORY');           // Stockage temporaire en mémoire
  console.log('PRAGMAs appliqués avec succès.');
}

if (!fs.existsSync(dbPath)) {
  console.log('Création de la base de données...');
  
  try {
    // Création de la base de données SQLite avec better-sqlite3 (synchrone)
    const db = new Database(dbPath, { verbose: console.log });
    console.log('Fichier de base de données SQLite créé avec succès.');
    
    // Optimiser la DB avec des PRAGMAs recommandés
    applyPragmas(db);

    // Définition du schéma de la base de données
    const schema = `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'user')),
        windows_login TEXT,
        deleted INTEGER DEFAULT 0
      );

      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        champs TEXT NOT NULL, -- JSON string for fields
        ordre INTEGER DEFAULT 0,
        deleted INTEGER DEFAULT 0 -- 0 for active, 1 for hidden/deleted
      );

      CREATE TABLE roles (
        name TEXT PRIMARY KEY,
        permissions TEXT NOT NULL
      );

      CREATE TABLE individus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero_unique TEXT, -- Texte pour plus de flexibilité
        en_charge INTEGER REFERENCES users(id) ON DELETE SET NULL,
        categorie_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        champs_supplementaires TEXT NOT NULL DEFAULT '{}', -- JSON string for additional fields
        deleted INTEGER DEFAULT 0
      );

      CREATE TABLE individu_audit (
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
    `;
    
    // Exécution du schéma (synchrone avec better-sqlite3)
    db.exec(schema);
    console.log('Schéma de la base de données créé avec succès.');
    
    // Création de l'utilisateur admin par défaut (synchrone avec better-sqlite3)
    const admin_hash = bcrypt.hashSync('admin', 10);
    const insertAdminStmt = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
    const adminInfo = insertAdminStmt.run('admin', admin_hash, 'admin');

    const insertRoleStmt = db.prepare('INSERT OR IGNORE INTO roles (name, permissions) VALUES (?, ?)');
    const defaultRoles = {
      admin: [
        'view_dashboard','view_individus','import_data','mass_attribution','manage_categories','manage_users','manage_roles','manage_columns','edit_all','edit_readonly_fields'
      ],
      manager: [
        'view_dashboard','view_individus','import_data','mass_attribution','edit_all'
      ],
      user: [
        'view_dashboard','view_individus','edit_assigned'
      ]
    };
    for (const [name, perms] of Object.entries(defaultRoles)) {
      insertRoleStmt.run(name, JSON.stringify(perms));
    }
    
    console.log('Base de données initialisée avec succès!');
    console.log(`Utilisateur admin créé (mot de passe: admin). ID: ${adminInfo.lastInsertRowid}`);
    
    // Fermeture de la base de données (synchrone avec better-sqlite3)
    db.close();
    console.log('Connexion à la base de données fermée.');
    
  } catch (error) {
    console.error('ERREUR lors de l\'initialisation de la base de données:', error.message);
    console.error(error.stack);
    process.exit(1); // Quitter avec code d'erreur
  }
} else {
  console.log('Base de données existante trouvée à', dbPath);
  
  try {
    // Vérification optionnelle de la structure existante
    const db = new Database(dbPath, { readonly: true });
    
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name);
    console.log('Tables existantes:', tables.join(', '));
    
    // Vérifier si l'admin existe
    const adminExists = db.prepare("SELECT COUNT(*) as count FROM users WHERE username = 'admin'").get();
    if (adminExists && adminExists.count > 0) {
      console.log('L\'utilisateur admin existe dans la base de données.');
    } else {
      console.log('ATTENTION: L\'utilisateur admin n\'existe pas dans la base de données!');
    }
    
    db.close();
    
    console.log('Le script install.js ne modifiera pas une base de données existante.');
    console.log('Si des modifications de schéma sont nécessaires sur une DB existante, une migration manuelle ou un script de migration est requis, ou supprimez le fichier .sqlite et relancez l\'initialisation.');
  } catch (error) {
    console.error('ERREUR lors de la vérification de la base de données existante:', error.message);
    console.log('La base de données existe mais pourrait être endommagée ou incompatible.');
  }
}

console.log('Script d\'installation terminé.');

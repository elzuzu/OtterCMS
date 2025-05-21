const { app, BrowserWindow, ipcMain, protocol, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const xlsx = require('xlsx');

// Variable globale pour la base de données
let db;

// Objet pour stocker les requêtes préparées
const preparedStatements = {};

// Fonction pour charger la configuration
function loadConfig() {
  const configPaths = [
    path.join(process.cwd(), 'config', 'app-config.json'), // For running with npm start from project root
    path.join(app.getAppPath(), 'config', 'app-config.json'), // For packaged app (inside resources/app)
    path.join(__dirname, 'config', 'app-config.json') // Fallback for other scenarios
  ];
  
  let loadedConfigPath = null;

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        log('Configuration chargée depuis:', configPath);
        loadedConfigPath = configPath;
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
    } catch (error) {
      logError('loadConfig from ' + configPath, error);
    }
  }
  
  log('ATTENTION: Aucun fichier de configuration trouvé, utilisation des valeurs par défaut.');
  // Determine a sensible default path for the database in a packaged app
  const defaultDbPath = app.isPackaged ? 
    path.join(app.getPath('userData'), 'data', 'database.db') : 
    path.join(process.cwd(), 'db', 'database.db'); // Changed default dev path to project_root/db/

  const defaultDataDir = path.dirname(defaultDbPath);
   if (!fs.existsSync(defaultDataDir)) {
      try {
        fs.mkdirSync(defaultDataDir, { recursive: true });
        log('Répertoire de données par défaut créé:', defaultDataDir);
      } catch (mkdirErr) {
        logError('loadConfig (mkdir defaultDataDir)', mkdirErr);
      }
    }

  return {
    dbPath: defaultDbPath,
    appTitle: "Indi-Suivi (Config par défaut)"
  };
}

// Load configuration at startup
const config = loadConfig();

// Fonctions de log
function log(...args) {
  console.log('[MAIN]', ...args); // Changed prefix to [MAIN] for clarity
}

/**
 * Logs an error with operation details.
 * @param {string} operation - The name of the operation where the error occurred.
 * @param {Error} error - The error object.
 */
function logError(operation, error) {
  log(`[ERROR] Opération: ${operation}, Code: ${error.code || 'N/A'}, Message: ${error.message}`, error.stack);
}

function logIPC(name, ...args) {
  const loggedArgs = args.map(arg => {
    if (arg && typeof arg === 'object' && arg.fileContent) {
      return { ...arg, fileContent: `[Contenu du fichier de ${arg.fileContent.length} octets]` };
    }
    if (name === 'attribuerIndividusEnMasse' && arg && arg.individuIds) {
        return { ...arg, individuIds: `[${arg.individuIds.length} IDs]`};
    }
    return arg;
  });
  console.log(`[IPC-MAIN] ${name} called with:`, ...loggedArgs);
  return args; // Return args for potential chaining or verification if needed
}

/**
 * Applies recommended PRAGMA settings to the database.
 * @param {Database.Database} databaseInstance - The better-sqlite3 database instance.
 */
function applyPragmas(databaseInstance) {
  log('Application des PRAGMAs...');
  try {
    databaseInstance.pragma('journal_mode = WAL');
    databaseInstance.pragma('synchronous = NORMAL');
    databaseInstance.pragma('foreign_keys = ON');
    databaseInstance.pragma('cache_size = -2000'); // ~2MB
    databaseInstance.pragma('busy_timeout = 5000'); // 5 seconds
    databaseInstance.pragma('temp_store = MEMORY');
    log('PRAGMAs appliqués avec succès.');
  } catch (error) {
    logError('applyPragmas', error);
  }
}

/**
 * Initializes prepared statements for frequently used queries.
 */
function initPreparedStatements() {
  if (!db || !db.open) {
    log('[PREPARED STATEMENTS] Base de données non ouverte. Impossible d\'initialiser les requêtes.');
    return;
  }
  log('[PREPARED STATEMENTS] Initialisation...');
  try {
    // Users
    preparedStatements.getUserByUsername = db.prepare('SELECT * FROM users WHERE username = ? AND deleted = 0');
    preparedStatements.getUserById = db.prepare('SELECT * FROM users WHERE id = ? AND deleted = 0');
    preparedStatements.getUserByWindowsLogin = db.prepare('SELECT * FROM users WHERE lower(windows_login) = ? AND deleted = 0');
    preparedStatements.insertUser = db.prepare('INSERT INTO users (username, password_hash, role, windows_login) VALUES (?, ?, ?, ?)');
    preparedStatements.updateUser = db.prepare('UPDATE users SET username = ?, role = ?, windows_login = ? WHERE id = ? AND deleted = 0');
    preparedStatements.updateUserWithPassword = db.prepare('UPDATE users SET username = ?, password_hash = ?, role = ?, windows_login = ? WHERE id = ? AND deleted = 0');
    preparedStatements.deleteUser = db.prepare('UPDATE users SET deleted = 1 WHERE id = ? AND deleted = 0'); // Soft delete
    preparedStatements.associateWindowsLogin = db.prepare('UPDATE users SET windows_login = ? WHERE id = ? AND deleted = 0');
    preparedStatements.getAllUsers = db.prepare('SELECT id, username, role, windows_login FROM users WHERE deleted = 0 ORDER BY username ASC');

    // Categories
    preparedStatements.getAllCategories = db.prepare('SELECT * FROM categories ORDER BY ordre ASC, nom ASC');
    preparedStatements.insertCategory = db.prepare('INSERT INTO categories (nom, champs, ordre, deleted) VALUES (?, ?, ?, 0)');
    preparedStatements.updateCategory = db.prepare('UPDATE categories SET nom = ?, champs = ?, ordre = ?, deleted = ? WHERE id = ?');
    preparedStatements.updateActiveCategory = db.prepare('UPDATE categories SET nom = ?, champs = ?, ordre = ? WHERE id = ? AND deleted = 0');
    preparedStatements.hideCategory = db.prepare('UPDATE categories SET deleted = 1 WHERE id = ?'); // Soft delete for categories

    // Individus
    preparedStatements.getIndividuById = db.prepare(`
        SELECT i.*, c.nom as categorie_nom, u.username as en_charge_username
        FROM individus i
        LEFT JOIN categories c ON i.categorie_id = c.id
        LEFT JOIN users u ON i.en_charge = u.id
        WHERE i.id = ? AND i.deleted = 0`);
    preparedStatements.getIndividuByNumeroUnique = db.prepare("SELECT * FROM individus WHERE numero_unique = ? AND deleted = 0");
    preparedStatements.insertIndividu = db.prepare(
        `INSERT INTO individus (numero_unique, en_charge, champs_supplementaires, categorie_id, deleted) VALUES (?, ?, ?, ?, 0)`
      );
    preparedStatements.updateIndividu = db.prepare(
        `UPDATE individus SET numero_unique = ?, en_charge = ?, champs_supplementaires = ?, categorie_id = ? WHERE id = ? AND deleted = 0` // Ensure not to update deleted individuals
      );
    preparedStatements.deleteIndividu = db.prepare("UPDATE individus SET deleted = 1 WHERE id = ? AND deleted = 0"); // Soft delete

    // Audit
    preparedStatements.insertAudit = db.prepare( `INSERT INTO individu_audit (individu_id, champ, ancienne_valeur, nouvelle_valeur, utilisateur_id, action, fichier_import) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    preparedStatements.getAuditsForIndividu = db.prepare( `SELECT a.*, u.username as utilisateur_username FROM individu_audit a LEFT JOIN users u ON a.utilisateur_id = u.id WHERE a.individu_id = ? ORDER BY a.date_modif DESC, a.id DESC`);
    
    log('[PREPARED STATEMENTS] Initialisation terminée.');
  } catch (error) {
    logError('initPreparedStatements', error);
  }
}

// Initialisation de la base de données
function initializeDatabaseSync() {
  log('Initialisation de la base de données (synchrone)...');
  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
      log('Répertoire de la base de données créé:', dbDir);
    } catch (mkdirErr) {
      logError('initializeDatabaseSync (mkdir dbDir)', mkdirErr);
      throw mkdirErr; // Rethrow to be caught by caller
    }
  }

  const newDb = new Database(config.dbPath, { verbose: console.log });
  log('Base de données ouverte/créée avec succès à', config.dbPath);
  
  applyPragmas(newDb);

  const schema = `
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
      champs TEXT NOT NULL, -- JSON string
      ordre INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS individus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_unique TEXT, -- Should ideally be UNIQUE if not nullable
      en_charge INTEGER REFERENCES users(id) ON DELETE SET NULL,
      categorie_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      champs_supplementaires TEXT, -- JSON string
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
      action TEXT NOT NULL, -- e.g., 'create', 'update', 'delete', 'import_create', 'import_update', 'attribution_masse'
      fichier_import TEXT -- Name of the import file if applicable
    );
    CREATE INDEX IF NOT EXISTS idx_individus_deleted_en_charge ON individus(deleted, en_charge);
    CREATE INDEX IF NOT EXISTS idx_individus_deleted_numero_unique ON individus(deleted, numero_unique);
    CREATE INDEX IF NOT EXISTS idx_individu_audit_individu_id ON individu_audit(individu_id);
  `;
  newDb.exec(schema);
  log('Schéma vérifié/créé.');

  // Ensure admin user exists
  const adminUser = newDb.prepare("SELECT * FROM users WHERE username = 'admin' AND deleted = 0").get();
  if (!adminUser) {
    const admin_hash = bcrypt.hashSync('admin', 10); // Default password 'admin'
    const info = newDb.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', admin_hash, 'admin');
    log('Utilisateur admin créé avec succès (mot de passe: admin). ID:', info.lastInsertRowid);
  } else {
    log('L\'utilisateur admin existe déjà.');
  }
  return newDb;
}

function initDb() {
  try {
    log('Connexion à la base de données...');
    db = new Database(config.dbPath, { verbose: console.log /*, fileMustExist: true */ }); // fileMustExist can be true if init is separate
    log('Connexion à la base de données réussie.');
    
    applyPragmas(db);

    // Check if tables exist, if not, initialize schema. This is a simple check.
    const usersTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (!usersTableExists) {
      log('La table users n\'existe pas. Initialisation du schéma complet...');
      db.close(); // Close current empty/corrupt DB if any
      db = initializeDatabaseSync(); // Re-initialize and create schema
      log('Base de données et schéma initialisés.');
    } else {
        // Ensure admin user exists even if tables are there (e.g. after manual deletion)
        const adminUser = db.prepare("SELECT * FROM users WHERE username = 'admin' AND deleted = 0").get();
        if (!adminUser) {
            const admin_hash = bcrypt.hashSync('admin', 10);
            db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', admin_hash, 'admin');
            log('Utilisateur admin manquant recréé.');
        }
    }
    initPreparedStatements();
  } catch (error) {
    logError('initDb', error);
    if (error.code === 'SQLITE_CANTOPEN' || (error.message && error.message.includes("no such table")) || (error.message && error.message.includes("file is not a database")) ) {
        log('Tentative d\'initialisation complète de la base de données suite à une erreur critique...');
        try {
            if (db && db.open) db.close();
            db = initializeDatabaseSync();
            initPreparedStatements();
            log('Base de données initialisée avec succès après erreur critique.');
        } catch (initError) {
            logError('initDb (fallback init)', initError);
            dialog.showErrorBox('Erreur Base de Données Critique', `Impossible d'initialiser ou d'ouvrir la base de données: ${initError.message}. L'application va se fermer.`);
            app.quit();
        }
    } else {
        dialog.showErrorBox('Erreur Base de Données Inconnue', `Erreur de base de données non gérée: ${error.message}. L'application va se fermer.`);
        app.quit();
    }
  }
}

// Helper to infer data types from strings (e.g., from CSV)
function inferType(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'boolean') return value; // Already correct type
  
  if (value instanceof Date) { // Handle Excel date objects
    if (!isNaN(value.getTime())) {
        // Format as YYYY-MM-DD
        const year = value.getFullYear(); // Use getFullYear for local timezone from Excel
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } else {
        return String(value); // Invalid date object
    }
  }

  if (typeof value !== 'string') return value; // If not a string after date check, return as is

  const trimmedValue = value.trim();
  if (trimmedValue === "") return null; // Treat empty strings as null

  const lowerValue = trimmedValue.toLowerCase();
  if (lowerValue === 'true') return true;
  if (lowerValue === 'false') return false;
  if (lowerValue === 'null' || lowerValue === 'undefined' || lowerValue === 'vide' || lowerValue === 'na' || lowerValue === 'n/a') return null;
  
  // Number check (integer or float)
  if (/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
    const num = Number(trimmedValue);
    if (!isNaN(num)) return num;
  }

  // Date check (YYYY-MM-DD)
  const dateRegexYYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;
  if (dateRegexYYYYMMDD.test(trimmedValue)) {
    const date = new Date(trimmedValue + "T00:00:00Z"); // Assume UTC if no timezone
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // Date check (DD/MM/YYYY or MM/DD/YYYY - attempt to parse common formats)
  const dateRegexDMY = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  if (dateRegexDMY.test(trimmedValue)) {
    const parts = trimmedValue.split(/[\/\-]/);
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);

    // Try DD/MM/YYYY first (common in France)
    if (d > 0 && d <= 31 && m > 0 && m <= 12 && y > 1000 && y < 3000) {
      const date = new Date(Date.UTC(y, m - 1, d));
      if (date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d) {
        return date.toISOString().split('T')[0];
      }
    }
    // Try MM/DD/YYYY as a fallback
    if (m > 0 && m <= 31 && d > 0 && d <= 12 && y > 1000 && y < 3000) {
         const date = new Date(Date.UTC(y, d - 1, m));
         if (date.getUTCFullYear() === y && date.getUTCMonth() === d - 1 && date.getUTCDate() === m) {
            return date.toISOString().split('T')[0];
        }
    }
  }
  return value; // Return original string if no other type matches
}

// --- IPC Handlers ---

ipcMain.handle('test-ipc', async (event, arg) => {
  logIPC('test-ipc', arg);
  return { success: true, message: 'IPC connection works!' };
});

ipcMain.handle('init-database', async (event) => {
  logIPC('init-database');
  try {
    if (db && db.open) {
      db.close(); 
      log('Base de données existante fermée avant réinitialisation.');
    }
    db = initializeDatabaseSync(); 
    initPreparedStatements();
    return { success: true, message: 'Base de données initialisée avec succès' };
  } catch (error) {
    logError('init-database IPC', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth-login', async (event, { username, password }) => {
  logIPC('auth-login', { username, password: '***' }); // Log username, hide password
  if (!db || !preparedStatements.getUserByUsername) {
    return { success: false, error: 'Base de données non initialisée ou requêtes non préparées.' };
  }
  try {
    const user = preparedStatements.getUserByUsername.get(username);
    if (!user) {
      return { success: false, error: 'Utilisateur non trouvé.' };
    }
    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) {
      return { success: false, error: 'Mot de passe incorrect.' };
    }
    return {
      success: true,
      role: user.role,
      userId: user.id, // Ensure consistent ID field
      username: user.username,
      windows_login: user.windows_login
    };
  } catch (err) {
    logError('auth-login', err);
    return { success: false, error: 'Erreur base de données: ' + err.message };
  }
});

function findUserByWindowsLoginSync(windowsUsername) {
  if (!db || !preparedStatements.getUserByWindowsLogin) throw new Error('DB non prête pour findUserByWindowsLoginSync');
  const cleanUsername = windowsUsername ? windowsUsername.trim().toLowerCase() : null;
  if (!cleanUsername) return null;
  return preparedStatements.getUserByWindowsLogin.get(cleanUsername);
}

function findUserByIdSync(userId) {
  if (!db || !preparedStatements.getUserById) throw new Error('DB non prête pour findUserByIdSync');
  return preparedStatements.getUserById.get(userId);
}

function findUserByUsernameSync(username) {
  if (!db || !preparedStatements.getUserByUsername) throw new Error('DB non prête pour findUserByUsernameSync');
  return preparedStatements.getUserByUsername.get(username);
}

ipcMain.handle('auto-login-windows', async (event, windowsUsername) => {
  logIPC('auto-login-windows', windowsUsername);
  try {
    if (!windowsUsername) {
      return { success: false, error: 'Nom d\'utilisateur Windows non fourni' };
    }
    const user = findUserByWindowsLoginSync(windowsUsername);
    if (!user) {
      return { success: false, error: 'Aucun utilisateur associé à ce compte Windows' };
    }
    return {
      success: true,
      userId: user.id,
      username: user.username,
      role: user.role,
      windows_login: user.windows_login // Send back the stored login for consistency
    };
  } catch (error) {
    logError('auto-login-windows', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-user', async (event, userData) => {
  logIPC('create-user', userData.username, userData.role, userData.windows_login);
  try {
    if (!userData.username || !userData.password) {
      return { success: false, error: 'Nom d\'utilisateur et mot de passe obligatoires' };
    }
    const existingUser = findUserByUsernameSync(userData.username);
    if (existingUser) {
      return { success: false, error: 'Ce nom d\'utilisateur existe déjà' };
    }
    const hashedPassword = bcrypt.hashSync(userData.password, 10);
    const info = preparedStatements.insertUser.run(userData.username, hashedPassword, userData.role || 'user', userData.windows_login || null);
    return { success: true, userId: info.lastInsertRowid };
  } catch (error) {
    logError('create-user', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-user', async (event, userData) => {
  logIPC('update-user', userData.id, userData.username, userData.role, userData.windows_login);
  try {
    if (!userData.id || !userData.username) {
      return { success: false, error: 'ID et nom d\'utilisateur obligatoires' };
    }
    const existingUser = findUserByIdSync(userData.id);
    if (!existingUser) {
      return { success: false, error: 'Utilisateur non trouvé ou déjà supprimé' };
    }
    // Check if new username is already taken by another user
    if (userData.username !== existingUser.username) {
        const otherUserWithNewName = findUserByUsernameSync(userData.username);
        if (otherUserWithNewName && otherUserWithNewName.id !== userData.id) { // Check if it's not the same user
            return { success: false, error: 'Ce nom d\'utilisateur est déjà utilisé par un autre compte.' };
        }
    }

    let info;
    const windowsLoginToSet = userData.windows_login === undefined ? existingUser.windows_login : (userData.windows_login || null);

    if (userData.password && userData.password.trim() !== "") {
      const hashedPassword = bcrypt.hashSync(userData.password, 10);
      info = preparedStatements.updateUserWithPassword.run(userData.username, hashedPassword, userData.role || existingUser.role, windowsLoginToSet, userData.id);
    } else {
      info = preparedStatements.updateUser.run(userData.username, userData.role || existingUser.role, windowsLoginToSet, userData.id);
    }

    if (info.changes === 0) {
        // This can happen if no actual data changed, which isn't strictly an error.
        // However, if the user intended changes, it might indicate an issue.
        // For now, consider it success if no error, but acknowledge no DB rows affected.
        return { success: true, message: 'Aucune modification effectuée (données identiques ou utilisateur non trouvé).' };
    }
    return { success: true };
  } catch (error) {
    logError('update-user', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-user', async (event, userId) => {
  logIPC('delete-user', userId);
  try {
    if (!userId) return { success: false, error: 'ID utilisateur obligatoire' };
    const userToDelete = findUserByIdSync(userId);
    if (!userToDelete) return { success: false, error: 'Utilisateur non trouvé.' };
    if (userToDelete.username === 'admin') return { success: false, error: "L'administrateur par défaut (admin) ne peut pas être supprimé." };
    
    const info = preparedStatements.deleteUser.run(userId);
    if (info.changes === 0) {
        return { success: false, error: 'Utilisateur non trouvé ou déjà marqué comme supprimé.' };
    }
    return { success: true };
  } catch (error) {
    logError('delete-user', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('associer-login-windows', async (event, { userId, loginWindows }) => {
  logIPC('associer-login-windows', userId, loginWindows);
  try {
    let cleanLoginWindows = loginWindows;
    if (loginWindows && loginWindows.includes('\\')) { // Keep only username part if domain\username is provided
      cleanLoginWindows = loginWindows.split('\\').pop();
    }
    const windowsLoginToStore = cleanLoginWindows && cleanLoginWindows.trim() !== "" ? cleanLoginWindows.trim() : null;
    const info = preparedStatements.associateWindowsLogin.run(windowsLoginToStore, userId);
    if (info.changes === 0) {
        return { success: false, error: 'Utilisateur non trouvé ou login Windows déjà à jour.' };
    }
    return { success: true };
  } catch (error) {
    logError('associer-login-windows', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('getUsers', async () => {
  logIPC('getUsers');
  if (!db || !preparedStatements.getAllUsers) return { success: false, error: 'Base de données non initialisée ou requêtes non préparées.', data: [] };
  try {
    const rows = preparedStatements.getAllUsers.all();
    return { success: true, data: rows };
  } catch (err) {
    logError('getUsers', err);
    return { success: false, error: err.message, data: [] };
  }
});

ipcMain.handle('getCategories', async () => {
  logIPC('getCategories');
  if (!db || !preparedStatements.getAllCategories) return { success: false, error: 'Base de données non initialisée ou requêtes non préparées.', data: [] };
  try {
    const rows = preparedStatements.getAllCategories.all();
    const categories = rows.map(row => {
      try {
        return { ...row, champs: JSON.parse(row.champs || '[]') };
      } catch (e) {
        logError(`getCategories (parsing JSON catégorie ID ${row.id})`, e);
        return { ...row, champs: [] }; // Return empty array for champs on error
      }
    });
    return { success: true, data: categories };
  } catch (err) {
    logError('getCategories', err);
    return { success: false, error: err.message, data: [] };
  }
});

ipcMain.handle('addCategorie', async (event, { nom, champs, ordre }) => {
  logIPC('addCategorie', nom, champs, ordre);
  if (!db || !preparedStatements.insertCategory) return { success: false, error: 'Base de données non initialisée ou requêtes non préparées.' };
  try {
    const info = preparedStatements.insertCategory.run(nom, JSON.stringify(champs || []), ordre || 0);
    return { success: true, id: info.lastInsertRowid };
  } catch (err) {
    logError('addCategorie', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('updateCategorie', async (event, { id, nom, champs, ordre, deleted }) => {
  logIPC('updateCategorie', id, nom, champs, ordre, deleted);
  if (!db) return { success: false, error: 'Base de données non initialisée.' };
  try {
    let info;
    // Ensure 'deleted' is explicitly 0 or 1 if provided, otherwise use the specific update statement
    if (deleted === 0 || deleted === 1) {
      info = preparedStatements.updateCategory.run(nom, JSON.stringify(champs || []), ordre || 0, deleted, id);
    } else {
      // This means we only update active categories and don't touch the 'deleted' flag
      info = preparedStatements.updateActiveCategory.run(nom, JSON.stringify(champs || []), ordre || 0, id);
    }
    return { success: info.changes > 0, changes: info.changes };
  } catch (err) {
    logError('updateCategorie', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('deleteCategorie', async (event, id) => { // This is actually hideCategorie
  logIPC('hideCategorie', id);
  if (!db || !preparedStatements.hideCategory) return { success: false, error: 'Base de données non initialisée ou requêtes non préparées.' };
  try {
    const info = preparedStatements.hideCategory.run(id);
    return { success: info.changes > 0 };
  } catch (err) {
    logError('hideCategorie', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('getIndividus', async (event, { userId, role }) => {
  logIPC('getIndividus', { userId, role });
  if (!db) return { success: false, error: 'Base de données non initialisée.', data: [] };
  try {
    let sql = `
      SELECT i.*, c.nom as categorie_nom, u.username as en_charge_username
      FROM individus i
      LEFT JOIN categories c ON i.categorie_id = c.id AND c.deleted = 0
      LEFT JOIN users u ON i.en_charge = u.id AND u.deleted = 0
      WHERE i.deleted = 0`; 
    const params = [];

    if (role !== 'admin' && role !== 'manager') {
      sql += " AND i.en_charge = ?";
      params.push(userId);
    }
    sql += " ORDER BY i.id DESC"; // Consider if other sorting is needed
    
    const stmt = db.prepare(sql); 
    const rows = stmt.all(...params);
    const individus = rows.map(row => {
      try {
        return { ...row, champs_supplementaires: JSON.parse(row.champs_supplementaires || '{}') };
      } catch (e) {
        logError(`getIndividus (parsing JSON individu ID ${row.id})`, e);
        return { ...row, champs_supplementaires: {} };
      }
    });
    return { success: true, data: individus };
  } catch (err) {
    logError('getIndividus', err);
    return { success: false, error: err.message, data: [] };
  }
});

ipcMain.handle('getIndividu', async (event, id) => {
  logIPC('getIndividu', id);
  if (!db || !preparedStatements.getIndividuById) return { success: false, error: 'Base de données non initialisée ou requêtes non préparées.', data: null };
  try {
    const row = preparedStatements.getIndividuById.get(id);
    if (row) {
      try {
        return { success: true, data: { ...row, champs_supplementaires: JSON.parse(row.champs_supplementaires || '{}') } };
      } catch (e) {
        logError(`getIndividu (parsing JSON individu ID ${row.id})`, e);
        return { success: true, data: { ...row, champs_supplementaires: {} } };
      }
    } else {
      return { success: false, error: 'Individu non trouvé ou supprimé.', data: null };
    }
  } catch (err) {
    logError('getIndividu', err);
    return { success: false, error: err.message, data: null };
  }
});

// Centralized logic for adding or updating an individu, including audit trail
function addOrUpdateIndividuLogicSync({ individu, userId, isImport = false, importFile = null }) {
  if (!db) throw new Error('DB non prête pour addOrUpdateIndividuLogicSync');

  const { id, numero_unique, en_charge, categorie_id, champs_supplementaires } = individu;

  const transaction = db.transaction(() => {
    let newId = id;
    let resultInfo = { changes: 0 };

    if (id) { // Update existing
      const oldIndividu = preparedStatements.getIndividuById.get(id); 
      if (!oldIndividu) { 
        throw new Error('Individu à mettre à jour non trouvé ou supprimé.');
      }
      const oldChampsSupp = JSON.parse(oldIndividu.champs_supplementaires || '{}');
      
      // Prepare values for update, using existing if not provided
      const updatedNumeroUnique = numero_unique !== undefined ? String(numero_unique).trim() : oldIndividu.numero_unique;
      const updatedEnCharge = en_charge !== undefined ? (en_charge === null || en_charge === '' || isNaN(parseInt(en_charge,10)) ? null : parseInt(en_charge,10) ) : oldIndividu.en_charge;
      const updatedCategorieId = categorie_id !== undefined ? (categorie_id === null || categorie_id === '' || isNaN(parseInt(categorie_id,10)) ? null : parseInt(categorie_id,10) ) : oldIndividu.categorie_id;
      const updatedChampsSupp = JSON.stringify(champs_supplementaires || {});
      
      resultInfo = preparedStatements.updateIndividu.run(updatedNumeroUnique, updatedEnCharge, updatedChampsSupp, updatedCategorieId, id);

      // Audit changes
      const auditEntries = [];
      if (String(oldIndividu.numero_unique || '') !== String(updatedNumeroUnique || '')) {
        auditEntries.push({ champ: 'numero_unique', ancienne_valeur: String(oldIndividu.numero_unique || ''), nouvelle_valeur: String(updatedNumeroUnique || '') });
      }
      if (String(oldIndividu.en_charge || '') !== String(updatedEnCharge || '')) {
         auditEntries.push({ champ: 'en_charge', ancienne_valeur: String(oldIndividu.en_charge || ''), nouvelle_valeur: String(updatedEnCharge || '') });
      }
      if (String(oldIndividu.categorie_id || '') !== String(updatedCategorieId || '')) {
         auditEntries.push({ champ: 'categorie_id', ancienne_valeur: String(oldIndividu.categorie_id || ''), nouvelle_valeur: String(updatedCategorieId || '') });
      }
      const newChampsSuppParsed = champs_supplementaires || {};
      const allSuppKeys = new Set([...Object.keys(newChampsSuppParsed), ...Object.keys(oldChampsSupp)]);
      allSuppKeys.forEach(key => {
        const oldValue = String(oldChampsSupp[key] === undefined ? '' : oldChampsSupp[key]);
        const newValue = String(newChampsSuppParsed[key] === undefined ? '' : newChampsSuppParsed[key]);
        if (oldValue !== newValue) {
          auditEntries.push({ champ: key, ancienne_valeur: oldValue, nouvelle_valeur: newValue });
        }
      });

      if (auditEntries.length > 0 || (isImport && resultInfo.changes > 0) ) {
        const auditAction = isImport ? 'import_update' : 'update';
        for (const entry of auditEntries) {
            try { preparedStatements.insertAudit.run(id, entry.champ, entry.ancienne_valeur, entry.nouvelle_valeur, userId, auditAction, importFile); }
            catch (auditErr) { logError(`addOrUpdateIndividuLogicSync (audit update, champ ${entry.champ})`, auditErr); }
        }
      }
    } else { // Create new
      const insertNumeroUnique = String(numero_unique || '').trim();
      if (!insertNumeroUnique && !isImport) { // For manual creation, numero_unique might be optional initially depending on rules
          // throw new Error('Le numéro unique est requis pour la création manuelle.');
          // Or allow creation and let user fill it later. For now, let's be strict for non-imports.
      }
      const insertEnCharge = en_charge !== undefined && en_charge !== null && en_charge !== '' && !isNaN(parseInt(en_charge,10)) ? parseInt(en_charge,10) : null;
      const insertCategorieId = categorie_id !== undefined && categorie_id !== null && categorie_id !== '' && !isNaN(parseInt(categorie_id,10)) ? parseInt(categorie_id,10) : null;
      const insertChampsSupp = JSON.stringify(champs_supplementaires || {});
      
      if (insertNumeroUnique) { // Only check for existing if numero_unique is provided
        const existingWithNumeroUnique = preparedStatements.getIndividuByNumeroUnique.get(insertNumeroUnique);
        if (existingWithNumeroUnique) {
            throw new Error(`Le numéro unique "${insertNumeroUnique}" existe déjà.`);
        }
      }

      const insertInfo = preparedStatements.insertIndividu.run(insertNumeroUnique, insertEnCharge, insertChampsSupp, insertCategorieId);
      newId = insertInfo.lastInsertRowid;
      resultInfo.changes = 1; // An insert is a change

      // Audit creation
      const auditAction = isImport ? 'import_create' : 'create';
      const creationAuditEntries = [
        { champ: 'numero_unique', ancienne_valeur: null, nouvelle_valeur: insertNumeroUnique },
        { champ: 'en_charge', ancienne_valeur: null, nouvelle_valeur: String(insertEnCharge === null ? '' : insertEnCharge) },
        { champ: 'categorie_id', ancienne_valeur: null, nouvelle_valeur: String(insertCategorieId === null ? '' : insertCategorieId) }
      ];
      Object.entries(champs_supplementaires || {}).forEach(([key, value]) => {
        creationAuditEntries.push({ champ: key, ancienne_valeur: null, nouvelle_valeur: String(value || '') });
      });
      for (const entry of creationAuditEntries) {
          if (entry.nouvelle_valeur !== '' && entry.nouvelle_valeur !== 'null') { // Audit only if value is set
            try { preparedStatements.insertAudit.run(newId, entry.champ, entry.ancienne_valeur, entry.nouvelle_valeur, userId, auditAction, importFile); }
            catch (auditErr) { logError(`addOrUpdateIndividuLogicSync (audit create, champ ${entry.champ})`, auditErr); }
          }
      }
    }
    return { success: true, id: newId, changes: resultInfo.changes };
  });
  
  try {
    return transaction();
  } catch (err) {
    logError('addOrUpdateIndividuLogicSync (transaction)', err);
    // Ensure the error message from the transaction (like "numéro unique existe déjà") is propagated
    return { success: false, error: err.message }; 
  }
}

ipcMain.handle('importCSV', async (event, { fileContent, mapping, userId, importFileName }) => {
  logIPC('importCSV', { mappingKeys: Object.keys(mapping), userId, importFileName, fileContentLength: fileContent?.length || 0 });
  if (!db) return { success: false, error: 'Base de données non initialisée.', insertedCount: 0, updatedCount: 0, errorCount: 0, errors: ['Base de données non initialisée.'] };
  
  let insertedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const errorsDetailed = [];
  let jsonData = [];

  try {
    const workbook = xlsx.read(fileContent, { type: 'binary', cellDates: true, codepage: 65001 }); // cellDates true to parse Excel dates
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false }); // raw: false to get formatted strings for dates if not parsed by cellDates

    if (jsonData.length < 2) { 
        return { success: false, error: 'Le fichier ne contient pas de données ou seulement des en-têtes.', insertedCount: 0, updatedCount: 0, errorCount: 0, errors: ['Données insuffisantes dans le fichier.'] };
    }
    const csvHeadersFromFile = jsonData[0].map(h => String(h || '').trim());
    const dataRows = jsonData.slice(1);
    
    // Create a direct mapping from target DB field to CSV header name
    const activeMapping = {};
    for (const [csvHeaderFromUserMapping, targetDbFieldConfig] of Object.entries(mapping)) {
        if (targetDbFieldConfig && targetDbFieldConfig.target && targetDbFieldConfig.target.trim() !== "") {
            // csvHeaderFromUserMapping is the actual header from the CSV file
            // targetDbFieldConfig.target is the DB field (e.g., 'numero_unique', 'champs_supplementaires.nom_client')
            activeMapping[targetDbFieldConfig.target.trim()] = csvHeaderFromUserMapping.trim();
        }
    }

    if (!activeMapping['numero_unique']) { 
        return { success: false, error: 'Le champ de destination "numero_unique" doit être mappé.', insertedCount: 0, updatedCount: 0, errorCount: 0, errors: ['Mapping de "numero_unique" manquant.'] };
    }
    
    const BATCH_SIZE = 100; // Process in batches
    let currentBatchData = [];

    for (let i = 0; i < dataRows.length; i++) {
      const rowArray = dataRows[i];
      const normalizedRowArray = [...rowArray]; // Ensure array has enough elements
      while(normalizedRowArray.length < csvHeadersFromFile.length) {
          normalizedRowArray.push(null);
      }

      const individuToProcess = { champs_supplementaires: {} };
      let hasNumeroUnique = false;

      for (const [targetDbFieldKey, csvHeaderMapped] of Object.entries(activeMapping)) {
        const csvHeaderIndex = csvHeadersFromFile.findIndex(h => h === csvHeaderMapped);
        if (csvHeaderIndex !== -1 && csvHeaderIndex < normalizedRowArray.length) {
          const rawValue = normalizedRowArray[csvHeaderIndex];
          const typedValue = inferType(rawValue); // Infer type

          if (targetDbFieldKey === 'numero_unique') {
            individuToProcess.numero_unique = typedValue !== null ? String(typedValue) : null;
            if (individuToProcess.numero_unique && individuToProcess.numero_unique.trim() !== '') hasNumeroUnique = true;
          } else if (targetDbFieldKey === 'en_charge') { // Assuming 'en_charge' maps to user ID or username
            // If it's a username, you'd need to resolve it to an ID.
            // For now, assuming it's an ID or can be parsed as such.
            individuToProcess.en_charge = typedValue !== null && !isNaN(parseInt(typedValue, 10)) ? parseInt(typedValue, 10) : null;
          } else if (targetDbFieldKey === 'categorie_id') { // Assuming 'categorie_id' maps to category ID or name
            // If it's a name, resolve to ID. For now, assuming ID.
            individuToProcess.categorie_id = typedValue !== null && !isNaN(parseInt(typedValue, 10)) ? parseInt(typedValue, 10) : null;
          } else if (targetDbFieldKey.startsWith('champs_supplementaires.')) {
            const actualChampKey = targetDbFieldKey.substring('champs_supplementaires.'.length);
            individuToProcess.champs_supplementaires[actualChampKey] = typedValue;
          } else { // Direct mapping to a root field if not special
            individuToProcess[targetDbFieldKey] = typedValue;
          }
        }
      }

      if (!hasNumeroUnique && Object.values(individuToProcess.champs_supplementaires).every(v => v === null || v === '')) {
        // Skip entirely empty rows or rows without a numero_unique
        // errorsDetailed.push(`Ligne ${i + 2}: Données vides ou "numero_unique" manquant.`);
        // errorCount++; // Optionally count as error or just skip
        continue;
      }
      if (!hasNumeroUnique) {
         errorsDetailed.push(`Ligne ${i + 2}: "numero_unique" manquant ou vide. La ligne sera ignorée.`);
         errorCount++;
         continue;
      }

      currentBatchData.push(individuToProcess); 

      if (currentBatchData.length >= BATCH_SIZE || i === dataRows.length - 1) {
        log(`[importCSV] Traitement du lot de ${currentBatchData.length} lignes.`);
        const batchTransaction = db.transaction((batchToProcess) => {
          for (const indData of batchToProcess) {
            try {
              const existingIndividu = indData.numero_unique ? preparedStatements.getIndividuByNumeroUnique.get(indData.numero_unique) : null;
              let operationType = '';
              if (existingIndividu) {
                indData.id = existingIndividu.id; // Set ID for update
                operationType = 'update';
              } else {
                operationType = 'create';
              }
              const result = addOrUpdateIndividuLogicSync({
                individu: indData, userId: userId, isImport: true, importFile: importFileName
              });

              if (result.success && result.id) {
                if (operationType === 'create') insertedCount++;
                else if (operationType === 'update' && result.changes > 0) updatedCount++;
                else if (operationType === 'update' && result.changes === 0) { /* No actual change, not an error */ }
              } else {
                errorCount++;
                errorsDetailed.push(`Ligne (NumUnique: ${indData.numero_unique || 'N/A'}): ${result.error || 'Erreur inconnue sauvegarde.'}`);
              }
            } catch (rowError) { // Catch errors from within the loop (e.g., from addOrUpdateIndividuLogicSync if it throws)
                errorCount++;
                errorsDetailed.push(`Ligne (NumUnique: ${indData.numero_unique || 'N/A'}): Erreur interne - ${rowError.message}`);
            }
          }
        });
        try {
            batchTransaction(currentBatchData); 
        } catch (batchError) { // Catch error from the transaction itself
            logError('importCSV (batch transaction)', batchError);
            errorsDetailed.push(`Erreur critique lors du traitement d'un lot: ${batchError.message}. Certaines lignes de ce lot pourraient ne pas avoir été traitées.`);
            errorCount += currentBatchData.length - (insertedCount + updatedCount); // Estimate failures
        }
        currentBatchData = []; 
      }
    }
    return { success: true, insertedCount, updatedCount, errorCount, errors: errorsDetailed };
  } catch (e) {
    logError('importCSV (critique, hors boucle)', e);
    errorsDetailed.push(`Erreur générale du processus d'import: ${e.message}`);
    const totalRowsToProcess = jsonData && jsonData.length > 1 ? jsonData.length - 1 : 0;
    // Adjust error count if some were processed before critical error
    const processedCount = insertedCount + updatedCount;
    const remainingErrorCount = totalRowsToProcess > processedCount ? totalRowsToProcess - processedCount : errorCount;
    return { success: false, error: `Erreur critique: ${e.message}`, insertedCount, updatedCount, errorCount: remainingErrorCount, errors: errorsDetailed };
  }
});

ipcMain.handle('addOrUpdateIndividu', async (event, params) => {
  logIPC('addOrUpdateIndividu', {individuId: params.individu?.id, userId: params.userId, isImport: params.isImport, importFile: params.importFile});
  try {
    return addOrUpdateIndividuLogicSync(params);
  } catch (error) { // Should not happen if addOrUpdateIndividuLogicSync always returns object
    logError('addOrUpdateIndividu IPC (unexpected throw)', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('deleteIndividu', async (event, { id, userId }) => {
  logIPC('deleteIndividu', {id, userId});
  if (!db) return { success: false, error: 'Base de données non initialisée' };
  const deleteTransaction = db.transaction(() => {
    const info = preparedStatements.deleteIndividu.run(id);
    if (info.changes > 0) {
      try { preparedStatements.insertAudit.run(id, '_SYSTEM_DELETE', 'active', 'deleted', userId, 'delete', null); }
      catch (auditErr) { logError('deleteIndividu (audit)', auditErr); }
      return { success: true };
    } else {
      return { success: false, error: 'Individu non trouvé ou déjà supprimé.' };
    }
  });
  try {
    return deleteTransaction();
  } catch (err) {
    logError('deleteIndividu (transaction)', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('getAuditIndividu', async (event, individu_id) => {
  logIPC('getAuditIndividu', individu_id);
  if (!db || !preparedStatements.getAuditsForIndividu) return { success: false, error: 'Base de données non initialisée ou requêtes non préparées.', data: [] };
  try {
    const rows = preparedStatements.getAuditsForIndividu.all(individu_id);
    return { success: true, data: rows };
  } catch (err) {
    logError('getAuditIndividu', err);
    return { success: false, error: err.message, data: [] };
  }
});

// Handles mass assignment based on percentage distribution
ipcMain.handle('attribuerIndividusEnMasse', async (event, { individuIds, managerUserId, distribution }) => {
  logIPC('attribuerIndividusEnMasse', { numIndividus: individuIds?.length, managerUserId, numDistributionUsers: distribution?.length });
  if (!db) return { success: false, error: 'Base de données non initialisée.', updatedCount: 0, errors: ['Base de données non initialisée.'] };
  if (!individuIds || individuIds.length === 0) return { success: false, error: 'Aucun individu sélectionné.', updatedCount: 0, errors: ['Aucun individu sélectionné.'] };
  if (managerUserId === undefined || managerUserId === null) return { success: false, error: 'ID de l\'utilisateur effectuant l\'action non fourni.', updatedCount: 0, errors: ['ID utilisateur manager manquant.'] };

  let updatedCount = 0;
  const errorsDetailed = [];

  try {
    const oldEnChargeValues = {};
    const selectPlaceholders = individuIds.map(() => '?').join(',');
    const selectStmt = db.prepare(`SELECT id, en_charge FROM individus WHERE id IN (${selectPlaceholders}) AND deleted = 0`);
    const oldIndividus = selectStmt.all(...individuIds);

    if (oldIndividus.length === 0) { 
        return { success: false, error: 'Aucun individu valide trouvé pour l\'attribution.', updatedCount: 0, errors: ['Aucun individu valide.'] };
    }

    const actualIndividuIdsToProcess = oldIndividus.map(ind => ind.id);
    oldIndividus.forEach(row => oldEnChargeValues[row.id] = row.en_charge);
    
    const assignments = []; 
    let currentIndexInIndividuList = 0;

    const activeDistribution = distribution ? distribution.filter(d => d.userId !== undefined && d.percentage > 0) : [];
    const shouldUnassignAll = !distribution || distribution.length === 0 || (distribution && distribution.every(d => d.percentage === 0 && d.userId === null)); // More specific unassign condition

    if (shouldUnassignAll) {
        log('[IPC-MAIN] attribuerIndividusEnMasse (distribution): Désassignation de tous les individus sélectionnés.');
        for (const individuId of actualIndividuIdsToProcess) {
            assignments.push({ individuId, newUserId: null });
        }
    } else if (activeDistribution.length > 0) {
        log('[IPC-MAIN] attribuerIndividusEnMasse (distribution): Application de la distribution par pourcentage.');
        let totalPercentageForActive = activeDistribution.reduce((sum, d) => sum + d.percentage, 0);
        
        if (totalPercentageForActive > 0) { // Ensure we don't divide by zero
            // Shuffle individuals to ensure random distribution for remainders
            const shuffledIndividuIds = [...actualIndividuIdsToProcess].sort(() => 0.5 - Math.random());

            for (const rule of activeDistribution) {
                const userIdToAssign = rule.userId === '' ? null : parseInt(rule.userId, 10); // Handle unassignment rule
                if (rule.userId !== '' && isNaN(userIdToAssign)) {
                    errorsDetailed.push(`ID utilisateur invalide dans la règle de distribution: ${rule.userId}`);
                    continue;
                }
                const countForThisUser = Math.floor((rule.percentage / totalPercentageForActive) * shuffledIndividuIds.length); // Use floor to avoid over-assigning initially
                
                for (let i = 0; i < countForThisUser && currentIndexInIndividuList < shuffledIndividuIds.length; i++) {
                    assignments.push({ individuId: shuffledIndividuIds[currentIndexInIndividuList], newUserId: userIdToAssign });
                    currentIndexInIndividuList++;
                }
            }
            // Distribute any remaining individuals (due to Math.floor) round-robin among active users
            let userIndexForRemainder = 0;
            while(currentIndexInIndividuList < shuffledIndividuIds.length && activeDistribution.length > 0) {
                const userIdToAssignRem = activeDistribution[userIndexForRemainder % activeDistribution.length].userId;
                const actualUserIdRem = userIdToAssignRem === '' ? null : parseInt(userIdToAssignRem, 10);
                 if (userIdToAssignRem !== '' && isNaN(actualUserIdRem)) { /* skip if invalid */ }
                 else {
                    assignments.push({ individuId: shuffledIndividuIds[currentIndexInIndividuList], newUserId: actualUserIdRem });
                 }
                currentIndexInIndividuList++;
                userIndexForRemainder++;
            }
        } else {
             log('[IPC-MAIN] attribuerIndividusEnMasse: Total percentage is 0, no assignment based on percentage.');
        }
    } else {
         log('[IPC-MAIN] attribuerIndividusEnMasse (distribution): Aucune règle de distribution active ou valide. Aucune action.');
    }
    
    // Perform updates in a transaction for each assignment to ensure audit logging per change
    const singleAssignmentTransaction = db.transaction((individuId, newUserIdToAssign, oldEnChargeVal) => {
        const updateIndStmt = db.prepare('UPDATE individus SET en_charge = ? WHERE id = ? AND deleted = 0'); 
        const updateInfo = updateIndStmt.run(newUserIdToAssign, individuId);
        if (updateInfo.changes > 0) {
            const auditAction = shouldUnassignAll ? 'desattribution_masse_distrib' : 'attribution_masse_distrib';
            try { preparedStatements.insertAudit.run(individuId, 'en_charge', String(oldEnChargeVal === undefined || oldEnChargeVal === null ? '' : oldEnChargeVal), String(newUserIdToAssign === null ? '' : newUserIdToAssign), managerUserId, auditAction, null); }
            catch (auditErr) { logError(`attribuerIndividusEnMasse (audit pour ID ${individuId}, action ${auditAction})`, auditErr); }
            return true; 
        }
        return false; 
    });

    for (const assignment of assignments) {
      const { individuId, newUserId } = assignment;
      const oldEnCharge = oldEnChargeValues[individuId]; // Get original value for this specific ID
      
      // Only perform update and audit if the value is actually changing
      if (String(oldEnCharge === undefined || oldEnCharge === null ? '' : oldEnCharge) !== String(newUserId === null ? '' : newUserId)) {
        try {
          const success = singleAssignmentTransaction(individuId, newUserId, oldEnCharge);
          if (success) updatedCount++;
          // else: No DB change, so no error to push here unless transaction itself failed, caught below
        } catch (transactionError) {
          errorsDetailed.push(`Erreur transaction pour individu ${individuId}: ${transactionError.message}`);
          logError(`attribuerIndividusEnMasse (transaction pour ID ${individuId})`, transactionError);
        }
      }
    }

    if (errorsDetailed.length > 0) {
      return { success: updatedCount > 0, message: `Attribution terminée avec ${errorsDetailed.length} erreurs sur ${assignments.length} tentatives. ${updatedCount} succès.`, updatedCount, errors: errorsDetailed };
    }
    return { success: true, message: `${updatedCount} individu(s) traité(s) avec succès. ${assignments.length - updatedCount} individu(s) n'ont pas nécessité de mise à jour.`, updatedCount, errors: [] };

  } catch (error) {
    logError('attribuerIndividusEnMasse (critique)', error);
    return { success: false, error: `Erreur serveur: ${error.message}`, updatedCount: 0, errors: [error.message] };
  }
});


ipcMain.handle('getDashboardStats', async (event, { userId, role }) => {
  logIPC('getDashboardStats', {userId, role});
  if (!db) return { success: false, error: 'Base de données non initialisée', data: {} };
  try {
    const stats = {};
    stats.totalIndividus = db.prepare("SELECT COUNT(*) as count FROM individus WHERE deleted = 0").get().count;
    stats.totalCategories = db.prepare("SELECT COUNT(*) as count FROM categories WHERE deleted = 0").get().count;
    stats.categoriesMasquees = db.prepare("SELECT COUNT(*) as count FROM categories WHERE deleted = 1").get().count;
    stats.totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE deleted = 0").get().count;
    
    if (userId) { // Ensure userId is valid before querying
      stats.mesIndividus = db.prepare("SELECT COUNT(*) as count FROM individus WHERE en_charge = ? AND deleted = 0").get(userId).count;
    } else {
      stats.mesIndividus = 0; // Or handle as appropriate if userId is expected
    }

    if (role === 'manager' || role === 'admin') {
      stats.individusNonAttribues = db.prepare("SELECT COUNT(*) as count FROM individus WHERE (en_charge IS NULL OR en_charge = '') AND deleted = 0").get().count;
    } else {
      stats.individusNonAttribues = 0; // Users don't see this stat
    }
    return { success: true, data: stats };
  } catch (err) {
    logError('getDashboardStats', err);
    return { success: false, error: 'Erreur lors de la récupération des statistiques: ' + err.message, data: {} };
  }
});

// --- Electron App Lifecycle ---
app.whenReady().then(() => {
  log('Application prête.');
  // Custom protocol for serving built app files (useful for packaged apps)
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.substring(6); // Remove 'app://'
    callback({ path: path.join(__dirname, 'dist', url) }); 
  });

  initDb(); // Initialize database connection and schema
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  try {
    if (db && db.open) {
      db.close();
      log('Base de données fermée avec succès.');
    }
  } catch (err) {
    logError('window-all-closed (DB close)', err);
  }
  if (process.platform !== 'darwin') app.quit();
});

function createWindow () {
  log('Création de la fenêtre principale...');
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Important for security
      contextIsolation: true, // Important for security
      sandbox: false, // Consider true for more security if possible, might affect some node APIs in preload
      webSecurity: process.env.NODE_ENV !== 'development' // Disable webSecurity only for HMR in dev
    },
    title: config.appTitle || "Indi-Suivi" // Use loaded config for title
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      // win.webContents.openDevTools(); // Uncomment to open DevTools on start
  }

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    logError('createWindow (did-fail-load)', new Error(`Code: ${errorCode}, Desc: ${errorDescription}, URL: ${validatedURL}`));
  });
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // level: 0=verbose, 1=info, 2=warning, 3=error
    const levelStr = ['VERBOSE', 'INFO', 'WARNING', 'ERROR'][level] || `LVL${level}`;
    log(`[CONSOLE RENDERER - ${levelStr}] ${message} (source: ${path.basename(sourceId)}:${line})`);
  });

  const indexPath = path.join(__dirname, 'dist', 'index.html'); 
  log(`Chemin de l'index.html pour la fenêtre: ${indexPath}`);

  if (app.isPackaged) {
    // In packaged app, load index.html directly
    // Using custom protocol 'app://./index.html' or file path
    win.loadFile(indexPath).catch(err => {
        logError('createWindow (loadFile prod)', err);
        dialog.showErrorBox('Erreur Chargement Application', `Impossible de charger l'application: ${err.message}. Vérifiez le chemin: ${indexPath}`);
    });
  } else {
    // In development, load from Vite dev server
    const viteDevServerUrl = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL || process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    log(`Tentative de chargement de VITE_DEV_SERVER_URL: ${viteDevServerUrl}`);
    win.loadURL(viteDevServerUrl).catch(err => {
        logError(`createWindow (loadURL dev ${viteDevServerUrl})`, err);
        log(`Fallback: tentative de chargement de file://${indexPath}`);
        win.loadFile(indexPath).catch(fileErr => { // Fallback to file if Vite server fails
            logError('createWindow (loadFile dev fallback)', fileErr);
            dialog.showErrorBox('Erreur Chargement Développement', `Impossible de charger l'application depuis ${viteDevServerUrl} ou ${indexPath}: ${fileErr.message}. Assurez-vous que le serveur de développement (Vite) est lancé.`);
        });
    });
  }
}

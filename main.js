const { app, BrowserWindow, ipcMain, protocol, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const xlsx = require('xlsx');
const { log, logError, logIPC } = require('./utils/logger');
const { inferType } = require('./utils/inferType');

// Global variable for the database
let db;

// Object to store prepared statements
const preparedStatements = {};

// Function to load configuration
function loadConfig() {
  const configPaths = [
    path.join(process.cwd(), 'config', 'app-config.json'), 
    path.join(app.getAppPath(), 'config', 'app-config.json'), 
    path.join(__dirname, 'config', 'app-config.json') 
  ];
  
  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        log('Configuration loaded from:', configPath);
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
    } catch (error) {
      logError('loadConfig from ' + configPath, error);
    }
  }
  
  log('WARNING: No configuration file found, using default values.');
  const defaultDbPath = app.isPackaged ? 
    path.join(app.getPath('userData'), 'data', 'database.db') : 
    path.join(process.cwd(), 'db', 'database.db');

  const defaultDataDir = path.dirname(defaultDbPath);
   if (!fs.existsSync(defaultDataDir)) {
      try {
        fs.mkdirSync(defaultDataDir, { recursive: true });
        log('Default data directory created:', defaultDataDir);
      } catch (mkdirErr) {
        logError('loadConfig (mkdir defaultDataDir)', mkdirErr);
      }
    }
  return { dbPath: defaultDbPath, appTitle: "Indi-Suivi (Default Config)" };
}

const config = loadConfig();

function applyPragmas(databaseInstance) {
  log('Applying PRAGMAs...');
  try {
    databaseInstance.pragma('journal_mode = WAL');
    databaseInstance.pragma('synchronous = NORMAL');
    databaseInstance.pragma('foreign_keys = ON');
    databaseInstance.pragma('cache_size = -2000'); 
    databaseInstance.pragma('busy_timeout = 5000'); 
    databaseInstance.pragma('temp_store = MEMORY');
    log('PRAGMAs applied successfully.');
  } catch (error) {
    logError('applyPragmas', error);
  }
}

function initPreparedStatements() {
  if (!db || !db.open) {
    log('[PREPARED STATEMENTS] Database not open. Cannot initialize statements.');
    return;
  }
  log('[PREPARED STATEMENTS] Initializing...');
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
    preparedStatements.getCategoryById = db.prepare('SELECT * FROM categories WHERE id = ?'); // Get even if deleted for some ops
    preparedStatements.getCategoryByNameLower = db.prepare('SELECT * FROM categories WHERE lower(nom) = ? AND deleted = 0');
    preparedStatements.insertCategory = db.prepare('INSERT INTO categories (nom, champs, ordre, deleted) VALUES (?, ?, ?, 0)');
    preparedStatements.updateCategoryChamps = db.prepare('UPDATE categories SET champs = ? WHERE id = ?');
    preparedStatements.updateCategory = db.prepare('UPDATE categories SET nom = ?, champs = ?, ordre = ?, deleted = ? WHERE id = ?');
    preparedStatements.updateActiveCategory = db.prepare('UPDATE categories SET nom = ?, champs = ?, ordre = ? WHERE id = ? AND deleted = 0');
    preparedStatements.hideCategory = db.prepare('UPDATE categories SET deleted = 1 WHERE id = ?'); // Soft delete for categories
    preparedStatements.getMaxCategoryOrder = db.prepare('SELECT MAX(ordre) as max_ordre FROM categories');


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
    
    log('[PREPARED STATEMENTS] Initialization complete.');
  } catch (error) {
    logError('initPreparedStatements', error);
  }
}

// Initialization of the database
function initializeDatabaseSync() {
  log('Initializing database (synchronous)...');
  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
      log('Database directory created:', dbDir);
    } catch (mkdirErr) {
      logError('initializeDatabaseSync (mkdir dbDir)', mkdirErr);
      throw mkdirErr; // Rethrow to be caught by caller
    }
  }

  const newDb = new Database(config.dbPath, { verbose: console.log });
  log('Database opened/created successfully at', config.dbPath);
  
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
  log('Schema verified/created.');

  // Ensure admin user exists
  const adminUser = newDb.prepare("SELECT * FROM users WHERE username = 'admin' AND deleted = 0").get();
  if (!adminUser) {
    const admin_hash = bcrypt.hashSync('admin', 10); // Default password 'admin'
    const info = newDb.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', admin_hash, 'admin');
    log('Admin user created successfully (password: admin). ID:', info.lastInsertRowid);
  } else {
    log('Admin user already exists.');
  }
  return newDb;
}

function initDb() {
  try {
    log('Connecting to database...');
    db = new Database(config.dbPath, { verbose: console.log /*, fileMustExist: true */ }); // fileMustExist can be true if init is separate
    log('Database connection successful.');
    
    applyPragmas(db);

    // Check if tables exist, if not, initialize schema. This is a simple check.
    const usersTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (!usersTableExists) {
      log('Users table does not exist. Initializing full schema...');
      db.close(); // Close current empty/corrupt DB if any
      db = initializeDatabaseSync(); // Re-initialize and create schema
      log('Database and schema initialized.');
    } else {
        // Ensure admin user exists even if tables are there (e.g. after manual deletion)
        const adminUser = db.prepare("SELECT * FROM users WHERE username = 'admin' AND deleted = 0").get();
        if (!adminUser) {
            const admin_hash = bcrypt.hashSync('admin', 10);
            db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', admin_hash, 'admin');
            log('Admin user was missing, recreated.');
        }
    }
    initPreparedStatements();
  } catch (error) {
    logError('initDb', error);
    if (error.code === 'SQLITE_CANTOPEN' || (error.message && (error.message.includes("no such table") || error.message.includes("file is not a database"))) ) {
        log('Attempting full database initialization due to critical error...');
        try {
            if (db && db.open) db.close();
            db = initializeDatabaseSync();
            initPreparedStatements();
            log('Database successfully initialized after critical error.');
        } catch (initError) {
            logError('initDb (fallback init)', initError);
            dialog.showErrorBox('Critical Database Error', `Could not initialize or open database: ${initError.message}. The application will close.`);
            app.quit();
        }
    } else {
        dialog.showErrorBox('Unknown Database Error', `Unhandled database error: ${error.message}. The application will close.`);
        app.quit();
    }
  }
}

// --- IPC Handlers ---

ipcMain.handle('test-ipc', async (event, arg) => {
  logIPC('test-ipc', arg);
  return { success: true, message: 'IPC connection works!' };
});

// Resize window on demand from renderer
ipcMain.handle('resize-window', async (event, { width, height }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && width && height) {
    win.setSize(parseInt(width, 10), parseInt(height, 10));
  }
});

ipcMain.handle('init-database', async (event) => {
  logIPC('init-database');
  try {
    if (db && db.open) {
      db.close(); 
      log('Existing database closed before reinitialization.');
    }
    db = initializeDatabaseSync(); 
    initPreparedStatements();
    return { success: true, message: 'Database initialized successfully' };
  } catch (error) {
    logError('init-database IPC', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth-login', async (event, { username, password }) => {
  logIPC('auth-login', { username, password: '***' }); // Log username, hide password
  if (!db || !preparedStatements.getUserByUsername) {
    return { success: false, error: 'Database not initialized or statements not prepared.' };
  }
  try {
    const user = preparedStatements.getUserByUsername.get(username);
    if (!user) {
      return { success: false, error: 'User not found.' };
    }
    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) {
      return { success: false, error: 'Incorrect password.' };
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
    return { success: false, error: 'Database error: ' + err.message };
  }
});

function findUserByWindowsLoginSync(windowsUsername) {
  if (!db || !preparedStatements.getUserByWindowsLogin) throw new Error('DB not ready for findUserByWindowsLoginSync');
  const cleanUsername = windowsUsername ? windowsUsername.trim().toLowerCase() : null;
  if (!cleanUsername) return null;
  return preparedStatements.getUserByWindowsLogin.get(cleanUsername);
}

function findUserByIdSync(userId) {
  if (!db || !preparedStatements.getUserById) throw new Error('DB not ready for findUserByIdSync');
  return preparedStatements.getUserById.get(userId);
}

function findUserByUsernameSync(username) {
  if (!db || !preparedStatements.getUserByUsername) throw new Error('DB not ready for findUserByUsernameSync');
  return preparedStatements.getUserByUsername.get(username);
}

ipcMain.handle('auto-login-windows', async (event, windowsUsername) => {
  logIPC('auto-login-windows', windowsUsername);
  try {
    if (!windowsUsername) {
      return { success: false, error: 'Windows username not provided' };
    }
    const user = findUserByWindowsLoginSync(windowsUsername);
    if (!user) {
      return { success: false, error: 'No user associated with this Windows account' };
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
      return { success: false, error: 'Username and password are required' };
    }
    const existingUser = findUserByUsernameSync(userData.username);
    if (existingUser) {
      return { success: false, error: 'This username already exists' };
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
      return { success: false, error: 'ID and username are required' };
    }
    const existingUser = findUserByIdSync(userData.id);
    if (!existingUser) {
      return { success: false, error: 'User not found or already deleted' };
    }
    // Check if new username is already taken by another user
    if (userData.username !== existingUser.username) {
        const otherUserWithNewName = findUserByUsernameSync(userData.username);
        if (otherUserWithNewName && otherUserWithNewName.id !== userData.id) { // Check if it's not the same user
            return { success: false, error: 'This username is already used by another account.' };
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
        return { success: true, message: 'No changes made (data identical or user not found).' };
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
    if (!userId) return { success: false, error: 'User ID required' };
    const userToDelete = findUserByIdSync(userId);
    if (!userToDelete) return { success: false, error: 'User not found.' };
    if (userToDelete.username === 'admin') return { success: false, error: "Default admin user (admin) cannot be deleted." };
    
    const info = preparedStatements.deleteUser.run(userId);
    if (info.changes === 0) {
        return { success: false, error: 'User not found or already marked as deleted.' };
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
    if (loginWindows && loginWindows.includes('\\')) { 
      cleanLoginWindows = loginWindows.split('\\').pop();
    }
    const windowsLoginToStore = cleanLoginWindows && cleanLoginWindows.trim() !== "" ? cleanLoginWindows.trim() : null;
    const info = preparedStatements.associateWindowsLogin.run(windowsLoginToStore, userId);
    if (info.changes === 0) {
        return { success: false, error: 'User not found or Windows login already up to date.' };
    }
    return { success: true };
  } catch (error) {
    logError('associer-login-windows', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('getUsers', async () => {
  logIPC('getUsers');
  if (!db || !preparedStatements.getAllUsers) return { success: false, error: 'Database not initialized or statements not prepared.', data: [] };
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
  if (!db || !preparedStatements.getAllCategories) return { success: false, error: 'Database not initialized or statements not prepared.', data: [] };
  try {
    const rows = preparedStatements.getAllCategories.all();
    const categories = rows.map(row => {
      try {
        return { ...row, champs: JSON.parse(row.champs || '[]') };
      } catch (e) {
        logError(`getCategories (parsing JSON for category ID ${row.id})`, e);
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
  if (!db || !preparedStatements.insertCategory) return { success: false, error: 'Database not initialized or statements not prepared.' };
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
  if (!db) return { success: false, error: 'Database not initialized.' };
  try {
    let info;
    if (deleted === 0 || deleted === 1) {
      info = preparedStatements.updateCategory.run(nom, JSON.stringify(champs || []), ordre || 0, deleted, id);
    } else {
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
  if (!db || !preparedStatements.hideCategory) return { success: false, error: 'Database not initialized or statements not prepared.' };
  try {
    const info = preparedStatements.hideCategory.run(id);
    return { success: info.changes > 0 };
  } catch (err) {
    logError('hideCategorie', err);
    return { success: false, error: err.message };
  }
});

// --- Individu and Audit Logic ---

function addOrUpdateIndividuLogicSync({ individu, userId, isImport = false, importFile = null }) {
  if (!db) throw new Error('DB not ready for addOrUpdateIndividuLogicSync');

  const { id, numero_unique, en_charge, categorie_id, champs_supplementaires } = individu;

  const transaction = db.transaction(() => {
    let currentId = id;
    let resultInfo = { changes: 0 };
    let operationType = '';

    if (id) { // Update existing
      const oldIndividu = preparedStatements.getIndividuById.get(id); 
      if (!oldIndividu) throw new Error(`Individu à mettre à jour (ID: ${id}) non trouvé ou supprimé.`);
      
      // CORRECTION : Vérification et initialisation sécurisée
      let oldChampsSupp = {};
      try {
        oldChampsSupp = JSON.parse(oldIndividu.champs_supplementaires || '{}');
      } catch (e) {
        logError(`addOrUpdateIndividuLogicSync (parsing old champs_supplementaires for ID ${id})`, e);
        oldChampsSupp = {};
      }
      
      // Assurer que oldChampsSupp est un objet
      if (!oldChampsSupp || typeof oldChampsSupp !== 'object') {
        oldChampsSupp = {};
      }
      
      const updatedNumeroUnique = numero_unique !== undefined ? String(numero_unique || '').trim() : oldIndividu.numero_unique;
      const updatedEnCharge = en_charge !== undefined ? (en_charge === null || en_charge === '' || isNaN(parseInt(en_charge,10)) ? null : parseInt(en_charge,10) ) : oldIndividu.en_charge;
      const updatedCategorieId = categorie_id !== undefined ? (categorie_id === null || categorie_id === '' || isNaN(parseInt(categorie_id,10)) ? null : parseInt(categorie_id,10) ) : oldIndividu.categorie_id;
      
      // CORRECTION : Assurer que champs_supplementaires est un objet
      const newChampsSuppToUse = champs_supplementaires && typeof champs_supplementaires === 'object' ? champs_supplementaires : {};
      const updatedChampsSuppJSON = JSON.stringify(newChampsSuppToUse);
      
      resultInfo = preparedStatements.updateIndividu.run(updatedNumeroUnique, updatedEnCharge, updatedChampsSuppJSON, updatedCategorieId, id);
      operationType = 'update';

      const auditEntries = [];
      if (String(oldIndividu.numero_unique || '') !== String(updatedNumeroUnique || '')) auditEntries.push({ champ: 'numero_unique', ancienne_valeur: String(oldIndividu.numero_unique || ''), nouvelle_valeur: String(updatedNumeroUnique || '') });
      if (String(oldIndividu.en_charge || '') !== String(updatedEnCharge || '')) auditEntries.push({ champ: 'en_charge', ancienne_valeur: String(oldIndividu.en_charge || ''), nouvelle_valeur: String(updatedEnCharge || '') });
      if (String(oldIndividu.categorie_id || '') !== String(updatedCategorieId || '')) auditEntries.push({ champ: 'categorie_id', ancienne_valeur: String(oldIndividu.categorie_id || ''), nouvelle_valeur: String(updatedCategorieId || '') });
      
      // CORRECTION : Traitement sécurisé des champs supplémentaires
      const allSuppKeys = new Set();
      try {
        Object.keys(newChampsSuppToUse || {}).forEach(key => allSuppKeys.add(key));
        Object.keys(oldChampsSupp || {}).forEach(key => allSuppKeys.add(key));
      } catch (keysError) {
        logError('addOrUpdateIndividuLogicSync (building allSuppKeys)', keysError);
      }
      
      allSuppKeys.forEach(key => {
        const oldValue = String((oldChampsSupp || {})[key] === undefined ? '' : (oldChampsSupp || {})[key]);
        const newValue = String((newChampsSuppToUse || {})[key] === undefined ? '' : (newChampsSuppToUse || {})[key]);
        if (oldValue !== newValue) auditEntries.push({ champ: key, ancienne_valeur: oldValue, nouvelle_valeur: newValue });
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
      if (insertNumeroUnique) {
        const existingWithNumeroUnique = preparedStatements.getIndividuByNumeroUnique.get(insertNumeroUnique);
        if (existingWithNumeroUnique) throw new Error(`Le numéro unique "${insertNumeroUnique}" existe déjà.`);
      }

      const insertEnCharge = en_charge !== undefined && en_charge !== null && en_charge !== '' && !isNaN(parseInt(en_charge,10)) ? parseInt(en_charge,10) : null;
      const insertCategorieId = categorie_id !== undefined && categorie_id !== null && categorie_id !== '' && !isNaN(parseInt(categorie_id,10)) ? parseInt(categorie_id,10) : null;
      
      // CORRECTION : Assurer que champs_supplementaires est un objet
      const insertChampsSuppToUse = champs_supplementaires && typeof champs_supplementaires === 'object' ? champs_supplementaires : {};
      const insertChampsSuppJSON = JSON.stringify(insertChampsSuppToUse);
      
      const insertInfo = preparedStatements.insertIndividu.run(insertNumeroUnique, insertEnCharge, insertChampsSuppJSON, insertCategorieId);
      currentId = insertInfo.lastInsertRowid;
      resultInfo.changes = 1; 
      operationType = 'create';

      const auditAction = isImport ? 'import_create' : 'create';
      const creationAuditEntries = [];
      if (insertNumeroUnique) creationAuditEntries.push({ champ: 'numero_unique', ancienne_valeur: null, nouvelle_valeur: insertNumeroUnique });
      if (insertEnCharge !== null) creationAuditEntries.push({ champ: 'en_charge', ancienne_valeur: null, nouvelle_valeur: String(insertEnCharge) });
      if (insertCategorieId !== null) creationAuditEntries.push({ champ: 'categorie_id', ancienne_valeur: null, nouvelle_valeur: String(insertCategorieId) });
      
      // CORRECTION : Traitement sécurisé des champs supplémentaires
      try {
        Object.entries(insertChampsSuppToUse || {}).forEach(([key, value]) => {
          if (value !== null && value !== undefined && String(value) !== '') { 
              creationAuditEntries.push({ champ: key, ancienne_valeur: null, nouvelle_valeur: String(value) });
          }
        });
      } catch (entriesError) {
        logError('addOrUpdateIndividuLogicSync (processing creation audit entries)', entriesError);
      }
      
      for (const entry of creationAuditEntries) {
          try { preparedStatements.insertAudit.run(currentId, entry.champ, entry.ancienne_valeur, entry.nouvelle_valeur, userId, auditAction, importFile); }
          catch (auditErr) { logError(`addOrUpdateIndividuLogicSync (audit create, champ ${entry.champ})`, auditErr); }
      }
    }
    return { success: true, id: currentId, changes: resultInfo.changes, operationType };
  });
  
  try {
    return transaction();
  } catch (err) {
    logError('addOrUpdateIndividuLogicSync (transaction)', err);
    return { success: false, error: err.message }; 
  }
}
/**
 * Ensures a field definition exists in a category's `champs` JSON.
 */
function ensureFieldInCategorySync(categoryId, fieldConfig) {
    if (!db || !preparedStatements.getCategoryById || !preparedStatements.updateCategoryChamps) {
        throw new Error("Database or prepared statements not ready for ensureFieldInCategorySync.");
    }
    const categoryRow = preparedStatements.getCategoryById.get(categoryId);
    if (!categoryRow) {
        logError('ensureFieldInCategorySync', new Error(`Category with ID ${categoryId} not found.`));
        throw new Error(`Category with ID ${categoryId} not found during field creation.`);
    }

    let champsArray = [];
    try {
        champsArray = JSON.parse(categoryRow.champs || '[]');
    } catch (e) {
        logError('ensureFieldInCategorySync', new Error(`Failed to parse champs JSON for category ID ${categoryId}: ${e.message}. Initializing as empty array.`));
        champsArray = [];
    }

    const existingFieldIndex = champsArray.findIndex(f => f.key === fieldConfig.key);
    let fieldActuallyAddedOrChanged = false;

    if (existingFieldIndex === -1) {
        const newFieldDbSchema = {
            key: String(fieldConfig.key).trim(),
            label: String(fieldConfig.label || fieldConfig.key).trim(),
            type: fieldConfig.type || 'text',
            ordre: Number(fieldConfig.ordre) || 0,
            obligatoire: fieldConfig.obligatoire || false,
            visible: fieldConfig.visible === undefined ? true : fieldConfig.visible,
            readonly: fieldConfig.readonly || false,
            afficherEnTete: fieldConfig.afficherEnTete || false,
            options: fieldConfig.type === 'list' ? (Array.isArray(fieldConfig.options) ? fieldConfig.options : []) : [],
            maxLength: fieldConfig.type === 'text' && fieldConfig.maxLength ? parseInt(fieldConfig.maxLength, 10) : null,
        };
        champsArray.push(newFieldDbSchema);
        fieldActuallyAddedOrChanged = true;
        log(`Field '${newFieldDbSchema.key}' definition added to category ID ${categoryId}`);
    } else {
        log(`Field '${fieldConfig.key}' already defined in category ID ${categoryId}. No change to definition.`);
    }

    if (fieldActuallyAddedOrChanged) {
        champsArray.sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
        preparedStatements.updateCategoryChamps.run(JSON.stringify(champsArray), categoryId);
    }
    return fieldActuallyAddedOrChanged;
}
ipcMain.handle('importCSV', async (event, importParams) => {
  // Vérifications de sécurité initiales
  if (!importParams) {
    return { success: false, error: 'Paramètres d\'import manquants.', insertedCount: 0, updatedCount: 0, errorCount: 0, errors: ['Paramètres manquants.'] };
  }

  // Sécuriser l'extraction des paramètres
  const {
    fileContent,
    fileName,
    numeroIndividuHeader,
    columns: rawColumns,
    newCategories: rawNewCategories,
    userId,
    createIfMissing
  } = importParams;

  // Utiliser des valeurs sûres pour éviter les erreurs lors de l'accès aux propriétés
  const columns = (rawColumns && typeof rawColumns === 'object') ? rawColumns : {};
  const newCategories = Array.isArray(rawNewCategories) ? rawNewCategories : [];
  
  // CORRECTION CRITIQUE : Protéger l'appel logIPC
  let numCols = 0;
  try {
    if (columns && typeof columns === 'object') {
      numCols = Object.keys(columns).length;
    }
  } catch (countErr) {
    numCols = 0;
  }

  let numNewCats = 0;
  try {
    if (newCategories && Array.isArray(newCategories)) {
      numNewCats = newCategories.length;
    }
  } catch (countErr) {
    numNewCats = 0;
  }

  logIPC('importCSV', {
    numCols,
    numNewCats,
    userId,
    importFileName: fileName,
    createIfMissing
  });

  // Vérifications des paramètres obligatoires
  if (!columns || typeof columns !== 'object') {
    return { success: false, error: 'Configuration des colonnes manquante ou invalide.', insertedCount: 0, updatedCount: 0, errorCount: 0, errors: ['Configuration des colonnes invalide.'] };
  }
  
  if (!fileContent) {
    return { success: false, error: 'Contenu du fichier manquant.', insertedCount: 0, updatedCount: 0, errorCount: 0, errors: ['Contenu du fichier manquant.'] };
  }

  if (!numeroIndividuHeader) {
    return { success: false, error: 'En-tête du numéro d\'individu manquant.', insertedCount: 0, updatedCount: 0, errorCount: 0, errors: ['En-tête numéro individu manquant.'] };
  }

  if (userId === undefined || userId === null) {
    return { success: false, error: 'ID utilisateur manquant.', insertedCount: 0, updatedCount: 0, errorCount: 0, errors: ['ID utilisateur manquant.'] };
  }

  if (!db) return { success: false, error: 'Base de données non initialisée.', insertedCount: 0, updatedCount: 0, errorCount: 0, errors: ['Base de données non initialisée.'] };
  
  let insertedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const errorsDetailed = [];
  let newCategoriesCreatedCount = 0;
  let newFieldsAddedCount = 0;
  
  let jsonData = [];

  try {
    const workbook = xlsx.read(fileContent, { type: 'binary', cellDates: true, codepage: 65001 });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false });

    if (jsonData.length < 2) { 
        return { success: false, error: 'Le fichier ne contient pas de données ou seulement des en-têtes.', insertedCount:0, updatedCount:0, errorCount:1, errors:['Données insuffisantes.'] };
    }
    
    const csvHeadersFromFile = jsonData[0].map(h => String(h || '').trim());
    const dataRows = jsonData.slice(1);

    // Vérification que l'en-tête du numéro d'individu existe
    if (!csvHeadersFromFile.includes(numeroIndividuHeader)) {
      return { success: false, error: `L'en-tête du numéro d'individu "${numeroIndividuHeader}" n'existe pas dans le fichier.`, insertedCount: 0, updatedCount: 0, errorCount: 1, errors: [`En-tête "${numeroIndividuHeader}" introuvable.`] };
    }

    // --- Phase 1: Ensure Categories and Field Definitions ---
    const categorySetupTransaction = db.transaction(() => {
        const createdCategoryCache = {};
        const ensuredFieldDefinitionsCache = {};

        if (newCategories && Array.isArray(newCategories)) {
            for (const categoryGroup of newCategories) {
                if (!categoryGroup || typeof categoryGroup !== 'object') {
                  errorsDetailed.push('Groupe de catégorie invalide détecté, ignoré.');
                  continue;
                }
                
                const categoryName = String(categoryGroup.nom || '').trim();
                if (!categoryName) {
                  errorsDetailed.push('Nom de catégorie vide détecté, ignoré.');
                  continue;
                }
                
                const categoryNameLower = categoryName.toLowerCase();
                let categoryId;

                if (createdCategoryCache[categoryNameLower]) {
                    categoryId = createdCategoryCache[categoryNameLower];
                } else {
                    const existingCat = preparedStatements.getCategoryByNameLower.get(categoryNameLower);
                    if (existingCat) {
                        categoryId = existingCat.id;
                        log(`New category group '${categoryName}' matches existing category ID ${categoryId}.`);
                    } else {
                        const maxOrderResult = preparedStatements.getMaxCategoryOrder.get();
                        const newOrder = (maxOrderResult && typeof maxOrderResult.max_ordre === 'number' ? maxOrderResult.max_ordre : -10) + 10;
                        const info = preparedStatements.insertCategory.run(categoryName, '[]', newOrder);
                        categoryId = info.lastInsertRowid;
                        newCategoriesCreatedCount++;
                        log(`New category '${categoryName}' created with ID ${categoryId}, order ${newOrder}.`);
                    }
                    createdCategoryCache[categoryNameLower] = categoryId;
                }

                if (categoryGroup.champs && Array.isArray(categoryGroup.champs)) {
                  for (const fieldConfig of categoryGroup.champs) {
                      if (!fieldConfig || typeof fieldConfig !== 'object') {
                        errorsDetailed.push(`Configuration de champ invalide dans la catégorie "${categoryName}", ignorée.`);
                        continue;
                      }
                      
                      const fieldKey = String(fieldConfig.key || '').trim();
                      if (!fieldKey) {
                        errorsDetailed.push(`Clé de champ vide dans la catégorie "${categoryName}", ignorée.`);
                        continue;
                      }
                      
                      const cacheKey = `${categoryId}_${fieldKey}`;
                      if (!ensuredFieldDefinitionsCache[cacheKey]) {
                          if (ensureFieldInCategorySync(categoryId, fieldConfig)) {
                              newFieldsAddedCount++;
                          }
                          ensuredFieldDefinitionsCache[cacheKey] = true;
                      }
                  }
                }
            }
        }

        // Traitement des champs des colonnes existantes
        for (const csvHeader of csvHeadersFromFile) {
            const colConfig = columns[csvHeader];
            if (!colConfig || !colConfig.fieldConfig) continue;

            let categoryIdForField;
            const fieldConfig = colConfig.fieldConfig;
            if (!fieldConfig || typeof fieldConfig !== 'object') continue;
            
            const fieldKey = String(fieldConfig.key || '').trim();
            if (!fieldKey) continue;

            if (colConfig.action === 'create') { 
                categoryIdForField = fieldConfig.categorie_id;
            } else if (colConfig.action === 'create_in_existing_category') { 
                categoryIdForField = colConfig.targetCategoryId;
            }

            if (categoryIdForField && fieldKey) {
                 const cacheKey = `${categoryIdForField}_${fieldKey}`;
                 if (!ensuredFieldDefinitionsCache[cacheKey]) {
                    if (ensureFieldInCategorySync(categoryIdForField, fieldConfig)) {
                        newFieldsAddedCount++;
                    }
                    ensuredFieldDefinitionsCache[cacheKey] = true;
                 }
            }
        }
    });
    
    try {
        categorySetupTransaction();
    } catch (catError) {
        logError('importCSV (categorySetupTransaction)', catError);
        errorsDetailed.push(`Erreur critique lors de la configuration des catégories/champs: ${catError.message}`);
        return { success: false, error: `Erreur configuration: ${catError.message}`, insertedCount, updatedCount, errorCount: dataRows.length, errors: errorsDetailed, newCategoriesCreatedCount, newFieldsAddedCount };
    }

    // --- Phase 2: Process Rows ---
    const totalRows = dataRows.length;
    try { event.sender.send('import-progress', { current: 0, total: totalRows, percent: 0 }); } catch (_) {}
    for (let i = 0; i < dataRows.length; i++) {
        const rowArray = dataRows[i];
        if (!Array.isArray(rowArray)) {
          errorsDetailed.push(`Ligne ${i + 2}: Format de ligne invalide, ignorée.`);
          errorCount++;
          continue;
        }
        
        // CORRECTION : Initialiser explicitement champs_supplementaires comme objet vide
        const individuData = { 
            champs_supplementaires: {} // Assurer que c'est toujours un objet
        };
        let currentNumeroUnique = null;

        for (let colIdx = 0; colIdx < csvHeadersFromFile.length; colIdx++) {
            const csvHeader = csvHeadersFromFile[colIdx];
            const colConfig = columns[csvHeader];
            if (!colConfig) continue;

            const rawValue = rowArray[colIdx];
            const typedValue = inferType(rawValue);

            if (colConfig.action === 'map') {
                const targetField = colConfig.targetField;
                if (targetField === 'numero_unique') {
                    currentNumeroUnique = typedValue !== null ? String(typedValue).trim() : null;
                } else if (targetField === 'en_charge') {
                    individuData.en_charge = typedValue !== null && !isNaN(parseInt(typedValue, 10)) ? parseInt(typedValue, 10) : (typeof typedValue === 'string' && typedValue.trim() !== '' ? typedValue.trim() : null);
                } else if (targetField === 'categorie_id') {
                    individuData.categorie_id = typedValue !== null && !isNaN(parseInt(typedValue, 10)) ? parseInt(typedValue, 10) : null;
                } else if (targetField && targetField.startsWith('champs_supplementaires.')) {
                    const actualChampKey = targetField.substring('champs_supplementaires.'.length);
                    // CORRECTION : Vérifier que champs_supplementaires existe
                    if (!individuData.champs_supplementaires) {
                        individuData.champs_supplementaires = {};
                    }
                    individuData.champs_supplementaires[actualChampKey] = typedValue;
                } else if (targetField) { 
                    individuData[targetField] = typedValue;
                }
            } else if (['create', 'create_in_existing_category', 'create_in_new_category'].includes(colConfig.action)) {
                if (colConfig.fieldConfig && colConfig.fieldConfig.key) {
                    const fieldKey = String(colConfig.fieldConfig.key).trim();
                    // CORRECTION : Vérifier que champs_supplementaires existe
                    if (!individuData.champs_supplementaires) {
                        individuData.champs_supplementaires = {};
                    }
                    individuData.champs_supplementaires[fieldKey] = typedValue;
                    if (csvHeader === numeroIndividuHeader) {
                         currentNumeroUnique = typedValue !== null ? String(typedValue).trim() : null;
                    }
                }
            }
        }
        individuData.numero_unique = currentNumeroUnique;

        // CORRECTION : Vérifications sécurisées avec des vérifications null/undefined
        const champsSupp = individuData.champs_supplementaires || {};
        let champsSuppValues = [];
        try {
            champsSuppValues = Object.values(champsSupp);
        } catch (objectValuesError) {
            log(`Erreur Object.values sur champs_supplementaires ligne ${i + 2}:`, objectValuesError);
            champsSuppValues = [];
        }
        
        if (!individuData.numero_unique && champsSuppValues.every(v => v === null || String(v || '').trim() === '')) {
            log(`Skipping empty row ${i + 2}`);
            continue;
        }
        
        if (!individuData.numero_unique && !createIfMissing) {
            errorsDetailed.push(`Ligne ${i + 2}: \"numero_unique\" manquant et création non autorisée. Ligne ignorée.`);
            errorCount++;
            continue;
        }
        
        if (typeof individuData.en_charge === 'string') {
            const userFound = preparedStatements.getUserByUsername.get(individuData.en_charge);
            individuData.en_charge = userFound ? userFound.id : null;
            // Retrieve original CSV value for 'en_charge' for accurate error reporting
            let originalEnChargeCsvValue = '';
            const enChargeCsvHeader = csvHeadersFromFile.find(h => {
                const config = columns[h];
                return config && config.targetField === 'en_charge';
            });
            if (enChargeCsvHeader) {
                const enChargeColIdx = csvHeadersFromFile.indexOf(enChargeCsvHeader);
                if (enChargeColIdx !== -1) originalEnChargeCsvValue = String(rowArray[enChargeColIdx] || '').trim();
            }
            if (!userFound && originalEnChargeCsvValue !== '') {
                 errorsDetailed.push(`Ligne ${i + 2}: Utilisateur en charge \"${originalEnChargeCsvValue}\" non trouvé.`);
            }
        }

        try {
            const result = addOrUpdateIndividuLogicSync({
                individu: individuData, userId: userId, isImport: true, importFile: fileName
            });

            if (result.success && result.id) {
                if (result.operationType === 'create') insertedCount++;
                else if (result.operationType === 'update' && result.changes > 0) updatedCount++;
            } else {
                errorCount++;
                errorsDetailed.push(`Ligne ${i + 2} (NumUnique: ${individuData.numero_unique || 'N/A'}): ${result.error || 'Erreur sauvegarde.'}`);
            }
        } catch (rowError) {
            errorCount++;
            errorsDetailed.push(`Ligne ${i + 2} (NumUnique: ${individuData.numero_unique || 'N/A'}): Erreur interne - ${rowError.message}`);
            logError('importCSV (row processing)', rowError);
        }
        const percent = Math.round(((i + 1) / totalRows) * 100);
        try { event.sender.send('import-progress', { current: i + 1, total: totalRows, percent }); } catch (_) {}
    }
    try { event.sender.send('import-progress', { current: totalRows, total: totalRows, percent: 100 }); } catch (_) {}
    return { success: true, insertedCount, updatedCount, errorCount, errors: errorsDetailed, newCategoriesCreatedCount, newFieldsAddedCount };

  } catch (e) {
    logError('importCSV (critique, hors boucle principale)', e);
    errorsDetailed.push(`Erreur générale du processus d'import: ${e.message}`);
    const totalRowsToProcess = jsonData && jsonData.length > 1 ? jsonData.length - 1 : 0;
    const processedCount = insertedCount + updatedCount;
    const remainingErrorCount = totalRowsToProcess > processedCount ? totalRowsToProcess - processedCount : errorCount;
    try { event.sender.send('import-progress', { current: processedCount, total: totalRowsToProcess, percent: 100 }); } catch (_) {}
    return { success: false, error: `Erreur critique: ${e.message}`, insertedCount, updatedCount, errorCount: remainingErrorCount, errors: errorsDetailed, newCategoriesCreatedCount, newFieldsAddedCount };
  }
});
ipcMain.handle('addOrUpdateIndividu', async (event, params) => {
  logIPC('addOrUpdateIndividu', {individuId: params.individu?.id, userId: params.userId, isImport: params.isImport, importFile: params.importFile});
  try {
    return addOrUpdateIndividuLogicSync(params);
  } catch (error) { 
    logError('addOrUpdateIndividu IPC (unexpected throw)', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('deleteIndividu', async (event, { id, userId }) => {
  logIPC('deleteIndividu', {id, userId});
  if (!db) return { success: false, error: 'Database not initialized' };
  const deleteTransaction = db.transaction(() => {
    const info = preparedStatements.deleteIndividu.run(id);
    if (info.changes > 0) {
      try { preparedStatements.insertAudit.run(id, '_SYSTEM_DELETE', 'active', 'deleted', userId, 'delete', null); }
      catch (auditErr) { logError('deleteIndividu (audit)', auditErr); }
      return { success: true };
    } else {
      return { success: false, error: 'Individu not found or already deleted.' };
    }
  });
  try {
    return deleteTransaction();
  } catch (err) {
    logError('deleteIndividu (transaction)', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('getIndividu', async (event, id) => {
  logIPC('getIndividu', id);
  if (!db || !preparedStatements.getIndividuById) return { success: false, error: 'Database not initialized or statements not prepared.', data: null };
  try {
    const row = preparedStatements.getIndividuById.get(id);
    if (row) {
      try {
        return { success: true, data: { ...row, champs_supplementaires: JSON.parse(row.champs_supplementaires || '{}') } };
      } catch (e) {
        logError(`getIndividu (parsing JSON for individu ID ${row.id})`, e);
        return { success: true, data: { ...row, champs_supplementaires: {} } };
      }
    } else {
      return { success: false, error: 'Individu not found or deleted.', data: null };
    }
  } catch (err) {
    logError('getIndividu', err);
    return { success: false, error: err.message, data: null };
  }
});

ipcMain.handle('getIndividus', async (event, { userId, role }) => {
  logIPC('getIndividus', { userId, role });
  if (!db) return { success: false, error: 'Database not initialized.', data: [] };
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
    sql += " ORDER BY i.id DESC";
    
    const stmt = db.prepare(sql); 
    const rows = stmt.all(...params);
    const individus = rows.map(row => {
      try {
        return { ...row, champs_supplementaires: JSON.parse(row.champs_supplementaires || '{}') };
      } catch (e) {
        logError(`getIndividus (parsing JSON for individu ID ${row.id})`, e);
        return { ...row, champs_supplementaires: {} };
      }
    });
    return { success: true, data: individus };
  } catch (err) {
    logError('getIndividus', err);
    return { success: false, error: err.message, data: [] };
  }
});

ipcMain.handle('getAuditIndividu', async (event, individu_id) => {
  logIPC('getAuditIndividu', individu_id);
  if (!db || !preparedStatements.getAuditsForIndividu) return { success: false, error: 'Database not initialized or statements not prepared.', data: [] };
  try {
    const rows = preparedStatements.getAuditsForIndividu.all(individu_id);
    return { success: true, data: rows };
  } catch (err) {
    logError('getAuditIndividu', err);
    return { success: false, error: err.message, data: [] };
  }
});

ipcMain.handle('attribuerIndividusEnMasse', async (event, { individuIds, managerUserId, distribution }) => {
  logIPC('attribuerIndividusEnMasse', { numIndividus: individuIds?.length, managerUserId, numDistributionUsers: distribution?.length });
  if (!db) return { success: false, error: 'Database not initialized.', updatedCount: 0, errors: ['Database not initialized.'] };
  if (!individuIds || individuIds.length === 0) return { success: false, error: 'No individu selected.', updatedCount: 0, errors: ['No individu selected.'] };
  if (managerUserId === undefined || managerUserId === null) return { success: false, error: 'User ID performing the action not provided.', updatedCount: 0, errors: ['Manager user ID missing.'] };

  let updatedCount = 0;
  const errorsDetailed = [];

  try {
    const oldEnChargeValues = {};
    const selectPlaceholders = individuIds.map(() => '?').join(',');
    const selectStmt = db.prepare(`SELECT id, en_charge FROM individus WHERE id IN (${selectPlaceholders}) AND deleted = 0`);
    const oldIndividus = selectStmt.all(...individuIds);

    if (oldIndividus.length === 0) { 
        return { success: false, error: 'No valid individu found for assignment.', updatedCount: 0, errors: ['No valid individu.'] };
    }

    const actualIndividuIdsToProcess = oldIndividus.map(ind => ind.id);
    oldIndividus.forEach(row => oldEnChargeValues[row.id] = row.en_charge);
    
    const assignments = []; 
    let currentIndexInIndividuList = 0;

    const activeDistribution = distribution ? distribution.filter(d => d.userId !== undefined && d.percentage > 0) : [];
    const shouldUnassignAll = !distribution || distribution.length === 0 || (distribution && distribution.every(d => d.percentage === 0 && d.userId === null));

    if (shouldUnassignAll) {
        log('[IPC-MAIN] attribuerIndividusEnMasse (distribution): Unassigning all selected individus.');
        for (const individuId of actualIndividuIdsToProcess) {
            assignments.push({ individuId, newUserId: null });
        }
    } else if (activeDistribution.length > 0) {
        log('[IPC-MAIN] attribuerIndividusEnMasse (distribution): Applying percentage distribution.');
        let totalPercentageForActive = activeDistribution.reduce((sum, d) => sum + d.percentage, 0);
        
        if (totalPercentageForActive > 0) {
            const shuffledIndividuIds = [...actualIndividuIdsToProcess].sort(() => 0.5 - Math.random());

            for (const rule of activeDistribution) {
                const userIdToAssign = rule.userId === '' ? null : parseInt(rule.userId, 10);
                if (rule.userId !== '' && isNaN(userIdToAssign)) {
                    errorsDetailed.push(`Invalid user ID in distribution rule: ${rule.userId}`);
                    continue;
                }
                const countForThisUser = Math.floor((rule.percentage / totalPercentageForActive) * shuffledIndividuIds.length);
                
                for (let i = 0; i < countForThisUser && currentIndexInIndividuList < shuffledIndividuIds.length; i++) {
                    assignments.push({ individuId: shuffledIndividuIds[currentIndexInIndividuList], newUserId: userIdToAssign });
                    currentIndexInIndividuList++;
                }
            }
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
         log('[IPC-MAIN] attribuerIndividusEnMasse (distribution): No active or valid distribution rules. No action.');
    }
    
    const singleAssignmentTransaction = db.transaction((individuId, newUserIdToAssign, oldEnChargeVal) => {
        const updateIndStmt = db.prepare('UPDATE individus SET en_charge = ? WHERE id = ? AND deleted = 0'); 
        const updateInfo = updateIndStmt.run(newUserIdToAssign, individuId);
        if (updateInfo.changes > 0) {
            const auditAction = shouldUnassignAll ? 'desattribution_masse_distrib' : 'attribution_masse_distrib';
            try { preparedStatements.insertAudit.run(individuId, 'en_charge', String(oldEnChargeVal === undefined || oldEnChargeVal === null ? '' : oldEnChargeVal), String(newUserIdToAssign === null ? '' : newUserIdToAssign), managerUserId, auditAction, null); }
            catch (auditErr) { logError(`attribuerIndividusEnMasse (audit for ID ${individuId}, action ${auditAction})`, auditErr); }
            return true; 
        }
        return false; 
    });

    for (const assignment of assignments) {
      const { individuId, newUserId } = assignment;
      const oldEnCharge = oldEnChargeValues[individuId];
      
      if (String(oldEnCharge === undefined || oldEnCharge === null ? '' : oldEnCharge) !== String(newUserId === null ? '' : newUserId)) {
        try {
          const success = singleAssignmentTransaction(individuId, newUserId, oldEnCharge);
          if (success) updatedCount++;
        } catch (transactionError) {
          errorsDetailed.push(`Transaction error for individu ${individuId}: ${transactionError.message}`);
          logError(`attribuerIndividusEnMasse (transaction for ID ${individuId})`, transactionError);
        }
      }
    }

    if (errorsDetailed.length > 0) {
      return { success: updatedCount > 0, message: `Assignment completed with ${errorsDetailed.length} errors out of ${assignments.length} attempts. ${updatedCount} successes.`, updatedCount, errors: errorsDetailed };
    }
    return { success: true, message: `${updatedCount} individu(s) processed successfully. ${assignments.length - updatedCount} individu(s) did not require update.`, updatedCount, errors: [] };

  } catch (error) {
    logError('attribuerIndividusEnMasse (critical)', error);
    return { success: false, error: `Server error: ${error.message}`, updatedCount: 0, errors: [error.message] };
  }
});


ipcMain.handle('getDashboardStats', async (event, { userId, role }) => {
  logIPC('getDashboardStats', {userId, role});
  if (!db) return { success: false, error: 'Database not initialized', data: {} };
  try {
    const stats = {};
    stats.totalIndividus = db.prepare("SELECT COUNT(*) as count FROM individus WHERE deleted = 0").get().count;
    stats.totalCategories = db.prepare("SELECT COUNT(*) as count FROM categories WHERE deleted = 0").get().count;
    stats.categoriesMasquees = db.prepare("SELECT COUNT(*) as count FROM categories WHERE deleted = 1").get().count;
    stats.totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE deleted = 0").get().count;
    
    if (userId) { 
      stats.mesIndividus = db.prepare("SELECT COUNT(*) as count FROM individus WHERE en_charge = ? AND deleted = 0").get(userId).count;
    } else {
      stats.mesIndividus = 0; 
    }

    if (role === 'manager' || role === 'admin') {
      stats.individusNonAttribues = db.prepare("SELECT COUNT(*) as count FROM individus WHERE (en_charge IS NULL OR en_charge = '') AND deleted = 0").get().count;
    } else {
      stats.individusNonAttribues = 0; 
    }
    return { success: true, data: stats };
  } catch (err) {
    logError('getDashboardStats', err);
    return { success: false, error: 'Error retrieving statistics: ' + err.message, data: {} };
  }
});

// --- Electron App Lifecycle ---
app.whenReady().then(() => {
  log('Application ready.');
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.substring(6); 
    callback({ path: path.join(__dirname, 'dist', url) }); 
  });
  initDb(); 
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  try { if (db && db.open) { db.close(); log('Database closed successfully.'); } } 
  catch (err) { logError('window-all-closed (DB close)', err); }
  if (process.platform !== 'darwin') app.quit();
});

function createWindow () {
  log('Creating main window...');
  const win = new BrowserWindow({ 
    width: 1366, 
    height: 768, 
    autoHideMenuBar: true, 
    title: config.appTitle || "Indi-Suivi",
    webPreferences: { 
        preload: path.join(__dirname, 'preload.js'), 
        nodeIntegration: false, 
        contextIsolation: true, 
        sandbox: false, 
        webSecurity: process.env.NODE_ENV !== 'development' 
    }
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) { 
    // win.webContents.openDevTools(); // Uncomment to open DevTools on start
  }

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => { 
      logError('createWindow (did-fail-load)', new Error(`Code: ${errorCode}, Desc: ${errorDescription}, URL: ${validatedURL}`)); 
  });
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levelStr = ['VERBOSE', 'INFO', 'WARNING', 'ERROR'][level] || `LVL${level}`;
    log(`[CONSOLE RENDERER - ${levelStr}] ${message} (source: ${path.basename(sourceId)}:${line})`);
  });

  const indexPath = path.join(__dirname, 'dist', 'index.html'); 
  log(`Index.html path for window: ${indexPath}`);

  if (app.isPackaged) {
    win.loadFile(indexPath).catch(err => { 
        logError('createWindow (loadFile prod)', err); 
        dialog.showErrorBox('App Load Error', `Cannot load application: ${err.message}. Path: ${indexPath}`); 
    });
  } else {
    const viteDevServerUrl = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL || process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    log(`Attempting to load VITE_DEV_SERVER_URL: ${viteDevServerUrl}`);
    win.loadURL(viteDevServerUrl).catch(err => {
        logError(`createWindow (loadURL dev ${viteDevServerUrl})`, err);
        log(`Fallback: attempting to load file://${indexPath}`);
        win.loadFile(indexPath).catch(fileErr => { 
            logError('createWindow (loadFile dev fallback)', fileErr);
            dialog.showErrorBox('Dev Load Error', `Cannot load from ${viteDevServerUrl} or ${indexPath}: ${fileErr.message}. Ensure Vite dev server is running.`);
        });
    });
  }
}

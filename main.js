const { app, BrowserWindow, ipcMain, protocol, dialog } = require('electron'); // Ajout de dialog
const path =require('path');
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
    path.join(process.cwd(), 'config', 'app-config.json'),
    path.join(process.cwd(), '..', 'config', 'app-config.json'),
    path.join(__dirname, 'config', 'app-config.json')
  ];

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        console.log('[APP] Configuration chargée depuis:', configPath);
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
    } catch (error) {
      console.log('[APP] Erreur lors du chargement de la configuration depuis', configPath, ':', error.message);
    }
  }
  console.log('[APP] ATTENTION: Aucun fichier de configuration trouvé, utilisation des valeurs par défaut');
  const defaultDbPath = app.isPackaged ? path.join(path.dirname(app.getPath('exe')), 'data', 'database.db') : path.join(process.cwd(), 'data', 'database.db');
  const defaultDataDir = path.dirname(defaultDbPath);
   if (!fs.existsSync(defaultDataDir)) {
      try {
        fs.mkdirSync(defaultDataDir, { recursive: true });
        console.log('[APP] Répertoire de données par défaut créé:', defaultDataDir);
      } catch (mkdirErr) {
        console.log('[APP] Erreur création répertoire de données par défaut:', mkdirErr);
      }
    }
  return {
    dbPath: defaultDbPath,
    appTitle: "Indi-Suivi (Config par défaut)"
  };
}

const config = loadConfig();

// Fonctions de log
function log(...args) {
  console.log('[APP]', ...args);
}

/**
 * Logs an error with operation details.
 * @param {string} operation - The name of the operation where the error occurred.
 * @param {Error} error - The error object.
 */
function logError(operation, error) {
  log(`[DB ERROR] Opération: ${operation}, Code: ${error.code}, Message: ${error.message}`, error.stack);
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
  return args;
}

/**
 * Applies recommended PRAGMA settings to the database.
 * @param {Database} databaseInstance - The better-sqlite3 database instance.
 */
function applyPragmas(databaseInstance) {
  log('Application des PRAGMAs...');
  try {
    databaseInstance.pragma('journal_mode = WAL');            // Active Write-Ahead Logging
    databaseInstance.pragma('synchronous = NORMAL');          // Bon équilibre entre performance et sécurité
    databaseInstance.pragma('foreign_keys = ON');             // Active les contraintes de clés étrangères
    databaseInstance.pragma('cache_size = -2000');            // ~2MB de cache (valeur négative = kilobytes)
    databaseInstance.pragma('busy_timeout = 5000');           // Attendre 5s si la DB est verrouillée (ms)
    databaseInstance.pragma('temp_store = MEMORY');           // Stockage temporaire en mémoire
    log('PRAGMAs appliqués avec succès.');
  } catch (error) {
    logError('applyPragmas', error);
    // Ne pas bloquer le démarrage pour une erreur PRAGMA, mais la logger.
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
    preparedStatements.deleteUser = db.prepare('UPDATE users SET deleted = 1 WHERE id = ? AND deleted = 0');
    preparedStatements.associateWindowsLogin = db.prepare('UPDATE users SET windows_login = ? WHERE id = ? AND deleted = 0');
    preparedStatements.getAllUsers = db.prepare('SELECT id, username, role, windows_login FROM users WHERE deleted = 0 ORDER BY username ASC');

    // Roles
    preparedStatements.getAllRoles = db.prepare('SELECT name, permissions FROM roles ORDER BY name ASC');
    preparedStatements.getRoleByName = db.prepare('SELECT name, permissions FROM roles WHERE name = ?');
    preparedStatements.insertRole = db.prepare('INSERT INTO roles (name, permissions) VALUES (?, ?)');
    preparedStatements.updateRole = db.prepare('UPDATE roles SET permissions = ? WHERE name = ?');
    preparedStatements.deleteRole = db.prepare('DELETE FROM roles WHERE name = ?');

    // Categories
    preparedStatements.getAllCategories = db.prepare('SELECT * FROM categories ORDER BY ordre ASC, nom ASC');
    preparedStatements.insertCategory = db.prepare('INSERT INTO categories (nom, champs, ordre, deleted) VALUES (?, ?, ?, 0)');
    preparedStatements.updateCategory = db.prepare('UPDATE categories SET nom = ?, champs = ?, ordre = ?, deleted = ? WHERE id = ?'); // Pour update complet (y.c. deleted)
    preparedStatements.updateActiveCategory = db.prepare('UPDATE categories SET nom = ?, champs = ?, ordre = ? WHERE id = ? AND deleted = 0'); // Pour update sans toucher à 'deleted'
    preparedStatements.hideCategory = db.prepare('UPDATE categories SET deleted = 1 WHERE id = ?');
    
    // Individus
    // Base query for getIndividus, specific parts will be appended
    // preparedStatements.getIndividuBase = db.prepare(`...`); // Not used directly, dynamic query in handler
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
        `UPDATE individus SET numero_unique = ?, en_charge = ?, champs_supplementaires = ?, categorie_id = ? WHERE id = ?`
      );
    preparedStatements.deleteIndividu = db.prepare("UPDATE individus SET deleted = 1 WHERE id = ? AND deleted = 0");

    // Audit
    preparedStatements.insertAudit = db.prepare( `INSERT INTO individu_audit (individu_id, champ, ancienne_valeur, nouvelle_valeur, utilisateur_id, action, fichier_import) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    preparedStatements.getAuditsForIndividu = db.prepare( `SELECT a.*, u.username as utilisateur_username FROM individu_audit a LEFT JOIN users u ON a.utilisateur_id = u.id WHERE a.individu_id = ? ORDER BY a.date_modif DESC, a.id DESC`);
    
    // Mass assignment (single user target)
    // La version avec liste d'IDs dynamique est gérée dans le handler directement.
    // preparedStatements.updateIndividuEnCharge = db.prepare( `UPDATE individus SET en_charge = ? WHERE id = ? AND deleted = 0`); // Pour assignation individuelle

    log('[PREPARED STATEMENTS] Initialisation terminée.');
  } catch (error) {
    logError('initPreparedStatements', error);
  }
}


// Initialisation de la base de données (adaptée pour better-sqlite3)
function initializeDatabaseSync() {
  log('Initialisation de la base de données (synchrone)...');
  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
      log('Répertoire de la base de données créé:', dbDir);
    } catch (mkdirErr) {
      log('Erreur création répertoire DB:', mkdirErr);
      throw mkdirErr;
    }
  }

  const newDb = new Database(config.dbPath, { verbose: console.log });
  log('Base de données ouverte/créée avec succès à', config.dbPath);
  
  applyPragmas(newDb); // Appliquer les PRAGMA

  const schema = `
    CREATE TABLE IF NOT EXISTS roles (
      name TEXT PRIMARY KEY,
      permissions TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      windows_login TEXT,
      deleted INTEGER DEFAULT 0,
      FOREIGN KEY(role) REFERENCES roles(name)
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      champs TEXT NOT NULL,
      ordre INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS individus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_unique TEXT,
      en_charge INTEGER REFERENCES users(id) ON DELETE SET NULL,
      categorie_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      champs_supplementaires TEXT,
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
      action TEXT NOT NULL,
      fichier_import TEXT
    );
  `;
  newDb.exec(schema);
  log('Schéma vérifié/créé.');

  // Insérer les rôles par défaut s'ils n'existent pas
  const rolesCount = newDb.prepare('SELECT COUNT(*) as count FROM roles').get().count;
  if (rolesCount === 0) {
    const insertRole = newDb.prepare('INSERT INTO roles (name, permissions) VALUES (?, ?)');
    insertRole.run('admin', JSON.stringify(['view_dashboard','view_individus','import_data','mass_attribution','manage_categories','manage_users','manage_roles','manage_columns']));
    insertRole.run('manager', JSON.stringify(['view_dashboard','view_individus','import_data','mass_attribution']));
    insertRole.run('user', JSON.stringify(['view_dashboard','view_individus']));
    log('Rôles par défaut créés.');
  }

  const adminUser = newDb.prepare("SELECT * FROM users WHERE username = 'admin'").get();
  if (adminUser) {
    log('L\'utilisateur admin existe déjà.');
  } else {
    const admin_hash = bcrypt.hashSync('admin', 10);
    const info = newDb.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', admin_hash, 'admin');
    log('Utilisateur admin créé avec succès (mot de passe: admin). ID:', info.lastInsertRowid);
  }
  return newDb;
}

function initDb() {
  try {
    log('Connexion à la base de données...');
    db = new Database(config.dbPath, { verbose: console.log });
    log('Connexion à la base de données réussie (ou fichier créé).');
    
    applyPragmas(db); // Appliquer les PRAGMA

    const usersTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    const rolesTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='roles'").get();
    if (!usersTableExists || !rolesTableExists) {
      log('Tables principales manquantes. Initialisation du schéma complet...');
      db.close();
      db = initializeDatabaseSync(); // Réassigner db
      log('Base de données et schéma initialisés.');
    } else {
      log('La table users existe. Schéma probablement déjà initialisé.');
      const adminUser = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
      if (!adminUser) {
          log('ATTENTION: L\'utilisateur admin n\'existe pas bien que la table users existe! Envisagez d\'utiliser "Initialiser la base de données".');
      }
    }
    initPreparedStatements(); // Initialiser les requêtes préparées après connexion/initialisation réussie
  } catch (error) {
    logError('initDb', error);
    if (error.code === 'SQLITE_CANTOPEN' || (error.message && error.message.includes("no such table")) ) {
        log('Tentative d\'initialisation complète de la base de données suite à une erreur...');
        try {
            if (db && db.open) db.close();
            db = initializeDatabaseSync(); // Réassigner db
            initPreparedStatements(); // Initialiser aussi ici
            log('Base de données initialisée avec succès après erreur critique.');
        } catch (initError) {
            logError('initDb (fallback init)', initError);
            dialog.showErrorBox('Erreur Base de Données Critique', `Impossible d'initialiser la base de données: ${initError.message}. L'application va se fermer.`);
            app.quit();
        }
    } else {
        dialog.showErrorBox('Erreur Base de Données', `Erreur de base de données non gérée: ${error.message}. L'application va se fermer.`);
        app.quit();
    }
  }
}

function inferType(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) {
        const year = value.getUTCFullYear();
        const month = String(value.getUTCMonth() + 1).padStart(2, '0');
        const day = String(value.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } else {
        return String(value);
    }
  }
  if (typeof value !== 'string') return value; 
  const trimmedValue = value.trim();
  const lowerValue = trimmedValue.toLowerCase();
  if (lowerValue === 'true') return true;
  if (lowerValue === 'false') return false;
  if (lowerValue === '' || lowerValue === 'null' || lowerValue === 'undefined') return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
    const num = Number(trimmedValue);
    if (!isNaN(num)) return num;
  }
  const dateRegexYYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;
  if (dateRegexYYYYMMDD.test(trimmedValue)) {
    const date = new Date(trimmedValue + "T00:00:00Z"); 
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  const dateRegexDMY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  if (dateRegexDMY.test(trimmedValue)) {
    const match = trimmedValue.match(dateRegexDMY);
    const dayOrMonth1 = parseInt(match[1], 10);
    const monthOrDay2 = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    if (dayOrMonth1 > 0 && dayOrMonth1 <= 31 && monthOrDay2 > 0 && monthOrDay2 <= 12) {
        const date = new Date(Date.UTC(year, monthOrDay2 - 1, dayOrMonth1));
        if (date.getUTCFullYear() === year && date.getUTCMonth() === monthOrDay2 - 1 && date.getUTCDate() === dayOrMonth1) {
            return date.toISOString().split('T')[0];
        }
    }
    if (monthOrDay2 > 0 && monthOrDay2 <= 31 && dayOrMonth1 > 0 && dayOrMonth1 <= 12) { 
        const date = new Date(Date.UTC(year, dayOrMonth1 - 1, monthOrDay2));
         if (date.getUTCFullYear() === year && date.getUTCMonth() === dayOrMonth1 - 1 && date.getUTCDate() === monthOrDay2) {
            return date.toISOString().split('T')[0];
        }
    }
  }
  return value;
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
      log('[IPC-MAIN] Base de données existante fermée avant réinitialisation.');
    }
    db = initializeDatabaseSync(); 
    initPreparedStatements(); // Réinitialiser les requêtes après réinitialisation DB
    return { success: true, message: 'Base de données initialisée avec succès' };
  } catch (error) {
    logError('init-database IPC', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth-login', async (event, { username, password }) => {
  logIPC('auth-login', { username, password: '***' });
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
    const permissions = getPermissionsForRoleSync(user.role);
    return {
      success: true,
      role: user.role,
      permissions,
      userId: user.id,
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

function getPermissionsForRoleSync(roleName) {
  if (!db || !preparedStatements.getRoleByName) throw new Error('DB non prête pour getPermissionsForRoleSync');
  const role = preparedStatements.getRoleByName.get(roleName);
  if (!role) return [];
  try {
    return JSON.parse(role.permissions || '[]');
  } catch (e) {
    logError('getPermissionsForRoleSync (parse)', e);
    return [];
  }
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
    const permissions = getPermissionsForRoleSync(user.role);
    return {
      success: true,
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions,
      windows_login: user.windows_login
    };
  } catch (error) {
    logError('auto-login-windows', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-user', async (event, userData) => {
  logIPC('create-user', userData.username, userData.role);
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
  logIPC('update-user', userData.id, userData.username, userData.role);
  try {
    if (!userData.id || !userData.username) {
      return { success: false, error: 'ID et nom d\'utilisateur obligatoires' };
    }
    const existingUser = findUserByIdSync(userData.id);
    if (!existingUser) {
      return { success: false, error: 'Utilisateur non trouvé ou déjà supprimé' };
    }
    if (userData.username !== existingUser.username) {
        const otherUserWithNewName = findUserByUsernameSync(userData.username);
        if (otherUserWithNewName) {
            return { success: false, error: 'Ce nom d\'utilisateur est déjà utilisé.' };
        }
    }

    let info;
    if (userData.password && userData.password.trim() !== "") {
      const hashedPassword = bcrypt.hashSync(userData.password, 10);
      info = preparedStatements.updateUserWithPassword.run(userData.username, hashedPassword, userData.role || existingUser.role, userData.windows_login === undefined ? existingUser.windows_login : (userData.windows_login || null), userData.id);
    } else {
      info = preparedStatements.updateUser.run(userData.username, userData.role || existingUser.role, userData.windows_login === undefined ? existingUser.windows_login : (userData.windows_login || null), userData.id);
    }

    if (info.changes === 0) {
        return { success: false, error: 'Utilisateur non trouvé ou aucune modification nécessaire.' };
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
    if (userId === 1) return { success: false, error: "L'administrateur par défaut ne peut pas être supprimé." };
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
    if (loginWindows && loginWindows.includes('\\')) {
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

ipcMain.handle('getRoles', async () => {
  logIPC('getRoles');
  if (!db || !preparedStatements.getAllRoles) return { success: false, error: 'Base de données non initialisée ou requêtes non préparées.', data: [] };
  try {
    const rows = preparedStatements.getAllRoles.all();
    const roles = rows.map(r => ({ name: r.name, permissions: JSON.parse(r.permissions || '[]') }));
    return { success: true, data: roles };
  } catch (err) {
    logError('getRoles', err);
    return { success: false, error: err.message, data: [] };
  }
});

ipcMain.handle('createRole', async (event, roleData) => {
  logIPC('createRole', roleData.name);
  if (!db || !preparedStatements.insertRole) return { success: false, error: 'Base de données non initialisée ou requêtes non préparées.' };
  try {
    preparedStatements.insertRole.run(roleData.name, JSON.stringify(roleData.permissions || []));
    return { success: true };
  } catch (err) {
    logError('createRole', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('updateRole', async (event, roleData) => {
  logIPC('updateRole', roleData.name);
  if (!db || !preparedStatements.updateRole) return { success: false, error: 'Base de données non initialisée ou requêtes non préparées.' };
  try {
    preparedStatements.updateRole.run(JSON.stringify(roleData.permissions || []), roleData.name);
    return { success: true };
  } catch (err) {
    logError('updateRole', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('deleteRole', async (event, roleName) => {
  logIPC('deleteRole', roleName);
  if (!db || !preparedStatements.deleteRole) return { success: false, error: 'Base de données non initialisée ou requêtes non préparées.' };
  try {
    preparedStatements.deleteRole.run(roleName);
    return { success: true };
  } catch (err) {
    logError('deleteRole', err);
    return { success: false, error: err.message };
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
        return { ...row, champs: [] };
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
  if (!db) return { success: false, error: 'Base de données non initialisée ou requêtes non préparées.' };
  try {
    let info;
    if (deleted === 0 || deleted === 1) {
      info = preparedStatements.updateCategory.run(nom, JSON.stringify(champs || []), ordre || 0, deleted, id);
    } else {
      info = preparedStatements.updateActiveCategory.run(nom, JSON.stringify(champs || []), ordre || 0, id);
    }
    return { success: info.changes > 0 };
  } catch (err) {
    logError('updateCategorie', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('deleteCategorie', async (event, id) => {
  logIPC('deleteCategorie (masquer)', id);
  if (!db || !preparedStatements.hideCategory) return { success: false, error: 'Base de données non initialisée ou requêtes non préparées.' };
  try {
    const info = preparedStatements.hideCategory.run(id);
    return { success: info.changes > 0 };
  } catch (err) {
    logError('deleteCategorie', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('getIndividus', async (event, { userId, role }) => {
  logIPC('getIndividus', userId, role);
  if (!db) return { success: false, error: 'Base de données non initialisée ou requêtes non préparées.', data: [] };
  try {
    let sql = `
      SELECT i.*, c.nom as categorie_nom, u.username as en_charge_username
      FROM individus i
      LEFT JOIN categories c ON i.categorie_id = c.id
      LEFT JOIN users u ON i.en_charge = u.id
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

function addOrUpdateIndividuLogicSync({ individu, userId, isImport = false, importFile = null }) {
  if (!db) throw new Error('DB non prête pour addOrUpdateIndividuLogicSync');

  const { id, numero_unique, en_charge, champs_supplementaires } = individu;

  const transaction = db.transaction(() => {
    if (id) { 
      const oldIndividu = preparedStatements.getIndividuById.get(id); 
      if (!oldIndividu) { 
        throw new Error('Individu à mettre à jour non trouvé ou supprimé.');
      }
      const oldChampsSupp = JSON.parse(oldIndividu.champs_supplementaires || '{}');
      const updatedNumeroUnique = numero_unique !== undefined ? String(numero_unique) : oldIndividu.numero_unique;
      const updatedEnCharge = en_charge !== undefined ? (isNaN(parseInt(en_charge,10)) ? null : parseInt(en_charge,10) ) : oldIndividu.en_charge;
      const updatedCategorieId = individu.categorie_id !== undefined ? (isNaN(parseInt(individu.categorie_id,10)) ? null : parseInt(individu.categorie_id,10) ) : oldIndividu.categorie_id;
      const updatedChampsSupp = JSON.stringify(champs_supplementaires || {});
      
      const updateInfo = preparedStatements.updateIndividu.run(updatedNumeroUnique, updatedEnCharge, updatedChampsSupp, updatedCategorieId, id);

      const auditEntries = [];
      const newValues = { numero_unique: updatedNumeroUnique, en_charge: updatedEnCharge, categorie_id: updatedCategorieId };
      if (String(oldIndividu.numero_unique || '') !== String(newValues.numero_unique || '')) {
        auditEntries.push({ champ: 'numero_unique', ancienne_valeur: String(oldIndividu.numero_unique || ''), nouvelle_valeur: String(newValues.numero_unique || '') });
      }
      if (String(oldIndividu.en_charge || '') !== String(newValues.en_charge || '')) {
         auditEntries.push({ champ: 'en_charge', ancienne_valeur: String(oldIndividu.en_charge || ''), nouvelle_valeur: String(newValues.en_charge || '') });
      }
      if (String(oldIndividu.categorie_id || '') !== String(newValues.categorie_id || '')) {
         auditEntries.push({ champ: 'categorie_id', ancienne_valeur: String(oldIndividu.categorie_id || ''), nouvelle_valeur: String(newValues.categorie_id || '') });
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
      if (auditEntries.length > 0 || (isImport && updateInfo.changes > 0) ) {
        const auditAction = isImport ? 'import_update' : 'update';
        for (const entry of auditEntries) {
            try { preparedStatements.insertAudit.run(id, entry.champ, entry.ancienne_valeur, entry.nouvelle_valeur, userId, auditAction, importFile); }
            catch (auditErr) { logError(`addOrUpdateIndividuLogicSync (audit update, champ ${entry.champ})`, auditErr); }
        }
      }
      return { success: true, id: id, changes: updateInfo.changes };
    } else { 
      const insertNumeroUnique = String(numero_unique || '');
      const insertEnCharge = en_charge !== undefined && !isNaN(parseInt(en_charge,10)) ? parseInt(en_charge,10) : null;
      const insertCategorieId = individu.categorie_id !== undefined && !isNaN(parseInt(individu.categorie_id,10)) ? parseInt(individu.categorie_id,10) : null;
      const insertChampsSupp = JSON.stringify(champs_supplementaires || {});
      
      const existingWithNumeroUnique = preparedStatements.getIndividuByNumeroUnique.get(insertNumeroUnique);
      if (existingWithNumeroUnique) {
          throw new Error(`Le numéro unique "${insertNumeroUnique}" existe déjà.`);
      }
      const insertInfo = preparedStatements.insertIndividu.run(insertNumeroUnique, insertEnCharge, insertChampsSupp, insertCategorieId);
      const newId = insertInfo.lastInsertRowid;
      const auditEntries = [];
      const auditAction = isImport ? 'import_create' : 'create';
      auditEntries.push({ champ: 'numero_unique', ancienne_valeur: null, nouvelle_valeur: insertNumeroUnique });
      auditEntries.push({ champ: 'en_charge', ancienne_valeur: null, nouvelle_valeur: String(insertEnCharge === null ? '' : insertEnCharge) });
      if (insertCategorieId !== null) {
          auditEntries.push({ champ: 'categorie_id', ancienne_valeur: null, nouvelle_valeur: String(insertCategorieId) });
      }
      Object.entries(champs_supplementaires || {}).forEach(([key, value]) => {
        auditEntries.push({ champ: key, ancienne_valeur: null, nouvelle_valeur: String(value || '') });
      });
      for (const entry of auditEntries) {
          try { preparedStatements.insertAudit.run(newId, entry.champ, entry.ancienne_valeur, entry.nouvelle_valeur, userId, auditAction, importFile); }
          catch (auditErr) { logError(`addOrUpdateIndividuLogicSync (audit create, champ ${entry.champ})`, auditErr); }
      }
      return { success: true, id: newId };
    }
  });
  try {
    return transaction();
  } catch (err) {
    logError('addOrUpdateIndividuLogicSync (transaction)', err);
    return { success: false, error: err.message };
  }
}

ipcMain.handle('importCSV', async (event, { fileContent, mapping, userId, importFileName }) => {
  logIPC('importCSV', { mapping: Object.keys(mapping), userId, importFileName, fileContent: `[contenu fichier ${fileContent?.length || 0} octets]` });
  if (!db) return { success: false, error: 'Base de données non initialisée.', insertedCount: 0, updatedCount: 0, errorCount: 0, errors: ['Base de données non initialisée.'] };
  
  let insertedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  const errorsDetailed = [];
  let jsonData = [];

  try {
    const workbook = xlsx.read(fileContent, { type: 'binary', cellDates: true, codepage: 65001 });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });

    if (jsonData.length < 2) { 
        return { success: false, error: 'Le fichier ne contient pas de données ou seulement des en-têtes.', insertedCount: 0, updatedCount: 0, errorCount: 0, errors: ['Données insuffisantes dans le fichier.'] };
    }
    const csvHeadersFromFile = jsonData[0].map(h => String(h || '').trim());
    const dataRows = jsonData.slice(1);
    const activeMapping = {};
    for (const [csvHeaderFromUserMapping, targetDbField] of Object.entries(mapping)) {
        if (targetDbField && targetDbField.trim() !== "") {
            activeMapping[targetDbField.trim()] = csvHeaderFromUserMapping.trim();
        }
    }
    if (!activeMapping['numero_unique']) { 
        return { success: false, error: 'Le champ de destination "numero_unique" doit être mappé.', insertedCount: 0, updatedCount: 0, errorCount: 0, errors: ['Mapping de "numero_unique" manquant.'] };
    }
    
    const BATCH_SIZE = 100;
    let currentBatch = [];

    for (let i = 0; i < dataRows.length; i++) {
      const rowArray = dataRows[i];
      const normalizedRowArray = [...rowArray];
      while(normalizedRowArray.length < csvHeadersFromFile.length) {
          normalizedRowArray.push(null);
      }
      const individuData = { numero_unique: null, en_charge: null, champs_supplementaires: {} };
      let hasNumeroUnique = false;

      for (const [targetDbField, csvHeaderMapped] of Object.entries(activeMapping)) {
        const csvHeaderIndex = csvHeadersFromFile.findIndex(h => h === csvHeaderMapped);
        if (csvHeaderIndex !== -1 && csvHeaderIndex < normalizedRowArray.length) {
          const rawValue = normalizedRowArray[csvHeaderIndex];
          const typedValue = inferType(rawValue);
          if (targetDbField === 'numero_unique') {
            individuData.numero_unique = typedValue !== null ? String(typedValue) : null;
            if (individuData.numero_unique && individuData.numero_unique.trim() !== '') hasNumeroUnique = true;
          } else if (targetDbField === 'en_charge') {
            individuData.en_charge = typedValue !== null && !isNaN(parseInt(typedValue, 10)) ? parseInt(typedValue, 10) : null;
          } else {
            individuData.champs_supplementaires[targetDbField] = typedValue;
          }
        }
      }

      if (!hasNumeroUnique) {
        errorCount++;
        errorsDetailed.push(`Ligne ${i + 2}: "numero_unique" manquant, vide ou non mappé correctement.`);
        continue; 
      }
      currentBatch.push(individuData); 

      if (currentBatch.length >= BATCH_SIZE || i === dataRows.length - 1) {
        log(`[importCSV] Traitement du lot de ${currentBatch.length} lignes.`);
        const batchTransaction = db.transaction((batchToProcess) => {
          for (const indData of batchToProcess) {
            try {
              const existingIndividu = preparedStatements.getIndividuByNumeroUnique.get(indData.numero_unique);
              let operationType = '';
              if (existingIndividu) {
                indData.id = existingIndividu.id;
                operationType = 'update';
              } else {
                operationType = 'create';
              }
              const result = addOrUpdateIndividuLogicSync({
                individu: indData, userId: userId, isImport: true, importFile: importFileName
              });
              if (result.success && result.id) {
                if (operationType === 'create') insertedCount++;
                else if (operationType === 'update') updatedCount++;
              } else {
                errorCount++;
                errorsDetailed.push(`Ligne (approx ${i + 2 - currentBatch.length + batchToProcess.indexOf(indData) +1}, NumUnique: ${indData.numero_unique || 'N/A'}): ${result.error || 'Erreur inconnue sauvegarde.'}`);
              }
            } catch (rowError) {
                errorCount++;
                errorsDetailed.push(`Ligne (approx ${i + 2 - currentBatch.length + batchToProcess.indexOf(indData) +1}, NumUnique: ${indData.numero_unique || 'N/A'}): Erreur interne - ${rowError.message}`);
            }
          }
        });
        try {
            batchTransaction(currentBatch); 
        } catch (batchError) {
            logError('importCSV (batch transaction)', batchError);
            errorsDetailed.push(`Erreur critique lors du traitement d'un lot: ${batchError.message}. Certaines lignes de ce lot pourraient ne pas avoir été traitées.`);
            errorCount += currentBatch.length; // Assume all in batch failed if transaction fails
        }
        currentBatch = []; 
      }
    }
    return { success: true, insertedCount, updatedCount, errorCount, errors: errorsDetailed };
  } catch (e) {
    logError('importCSV (critique)', e);
    errorsDetailed.push(`Erreur générale du processus d'import: ${e.message}`);
    const totalRowsToProcess = jsonData && jsonData.length > 1 ? jsonData.length - 1 : 0;
    return { success: false, error: `Erreur critique: ${e.message}`, insertedCount, updatedCount, errorCount: totalRowsToProcess - insertedCount - updatedCount, errors: errorsDetailed };
  }
});

ipcMain.handle('addOrUpdateIndividu', async (event, params) => {
  logIPC('addOrUpdateIndividu', {individuId: params.individu?.id, userId: params.userId, isImport: params.isImport, importFile: params.importFile});
  try {
    return addOrUpdateIndividuLogicSync(params);
  } catch (error) {
    logError('addOrUpdateIndividu IPC', error);
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

ipcMain.handle('attributionMasse', async (event, { ids, newUserId, currentUserId }) => {
  logIPC('attributionMasse', { numIds: ids ? ids.length : 0, newUserId, currentUserId });
  if (!db) return { success: false, error: 'Base de données non initialisée', count: 0 };
  if (!ids || ids.length === 0) return { success: false, error: 'Aucun individu sélectionné', count: 0 };
  if (newUserId === undefined) return { success: false, error: 'Aucun utilisateur sélectionné pour l\'attribution.', count: 0 };

  const actualNewUserId = newUserId === null || newUserId === '' ? null : parseInt(newUserId, 10);
  if (newUserId !== null && newUserId !== '' && isNaN(actualNewUserId)) {
    return { success: false, error: 'ID du nouvel utilisateur invalide.', count: 0 };
  }

  const attributionTransaction = db.transaction(() => {
    const selectStmt = db.prepare(`SELECT id, en_charge FROM individus WHERE id = ? AND deleted = 0`);
    const updateStmt = db.prepare( `UPDATE individus SET en_charge = ? WHERE id = ? AND deleted = 0`);
    
    let changesCount = 0;
    let auditsCount = 0;

    for (const id of ids) {
        const oldIndividu = selectStmt.get(id);
        if (oldIndividu) {
            if (String(oldIndividu.en_charge || null) !== String(actualNewUserId || null)) {
                const updateInfo = updateStmt.run(actualNewUserId, id);
                if (updateInfo.changes > 0) {
                    changesCount += updateInfo.changes;
                    try {
                        preparedStatements.insertAudit.run(id, 'en_charge', String(oldIndividu.en_charge || ''), String(actualNewUserId || ''), currentUserId, 'attribution_masse', null);
                        auditsCount++;
                    } catch (auditErr) {
                        logError(`attributionMasse (audit pour ID ${id})`, auditErr);
                    }
                }
            }
        }
    }
    return { success: true, count: changesCount, audits: auditsCount };
  });

  try {
    const result = attributionTransaction();
    if (result.count === 0 && result.audits === 0) {
        return { success: true, count: 0, message: 'Aucune mise à jour (individus déjà attribués correctement ou non trouvés/supprimés).' };
    }
    return result;
  } catch (err) {
    logError('attributionMasse (transaction)', err);
    return { success: false, error: err.message, count: 0 };
  }
});

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

    const activeDistribution = distribution ? distribution.filter(d => d.percentage > 0) : [];
    const shouldUnassign = !distribution || distribution.length === 0 || (distribution && distribution.every(d => d.percentage === 0));

    if (shouldUnassign) {
        log('[IPC-MAIN] attribuerIndividusEnMasse (distribution): Désassignation.');
        for (const individuId of actualIndividuIdsToProcess) {
            assignments.push({ individuId, newUserId: null });
        }
    } else if (activeDistribution.length > 0) {
        let totalPercentageForActive = activeDistribution.reduce((sum, d) => sum + d.percentage, 0);
        if (totalPercentageForActive > 0) {
            for (const rule of activeDistribution) {
                const userIdToAssign = rule.userId;
                const countForThisUser = Math.round((rule.percentage / totalPercentageForActive) * actualIndividuIdsToProcess.length);
                for (let i = 0; i < countForThisUser && currentIndexInIndividuList < actualIndividuIdsToProcess.length; i++) {
                    assignments.push({ individuId: actualIndividuIdsToProcess[currentIndexInIndividuList], newUserId: userIdToAssign });
                    currentIndexInIndividuList++;
                }
            }
        }
        let userIndexForRemainder = 0;
        while(currentIndexInIndividuList < actualIndividuIdsToProcess.length && activeDistribution.length > 0) {
            assignments.push({ individuId: actualIndividuIdsToProcess[currentIndexInIndividuList], newUserId: activeDistribution[userIndexForRemainder % activeDistribution.length].userId });
            currentIndexInIndividuList++;
            userIndexForRemainder++;
        }
    } else {
         log('[IPC-MAIN] attribuerIndividusEnMasse (distribution): Distribution fournie mais tous les pourcentages sont à 0. Aucune action.');
    }
    
    const singleAssignmentTransaction = db.transaction((individuId, newUserIdToAssign, oldEnChargeVal) => {
        const updateIndStmt = db.prepare('UPDATE individus SET en_charge = ? WHERE id = ? AND deleted = 0'); 
        const updateInfo = updateIndStmt.run(newUserIdToAssign, individuId);
        if (updateInfo.changes > 0) {
            const auditAction = shouldUnassign ? 'desattribution_masse_pourcentage' : 'attribution_masse_pourcentage';
            try { preparedStatements.insertAudit.run(individuId, 'en_charge', String(oldEnChargeVal || ''), String(newUserIdToAssign || ''), managerUserId, auditAction, null); }
            catch (auditErr) { logError(`attribuerIndividusEnMasse (audit pour ID ${individuId}, action ${auditAction})`, auditErr); }
            return true; 
        }
        return false; 
    });

    for (const assignment of assignments) {
      const { individuId, newUserId } = assignment;
      const oldEnCharge = oldEnChargeValues[individuId];
      if (String(oldEnCharge || null) !== String(newUserId || null)) {
        try {
          const success = singleAssignmentTransaction(individuId, newUserId, oldEnCharge);
          if (success) updatedCount++;
          else errorsDetailed.push(`Échec MAJ ou pas de changement pour individu ${individuId}.`);
        } catch (transactionError) {
          errorsDetailed.push(`Erreur transaction pour individu ${individuId}: ${transactionError.message}`);
          logError(`attribuerIndividusEnMasse (transaction pour ID ${individuId})`, transactionError);
        }
      }
    }

    if (errorsDetailed.length > 0) {
      return { success: updatedCount > 0, message: `Attribution terminée avec ${errorsDetailed.length} erreurs sur ${assignments.length} tentatives. ${updatedCount} succès.`, updatedCount, errors: errorsDetailed };
    }
    return { success: true, message: `${updatedCount} individu(s) traité(s) avec succès.`, updatedCount, errors: [] };

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
    if (userId) {
      stats.mesIndividus = db.prepare("SELECT COUNT(*) as count FROM individus WHERE en_charge = ? AND deleted = 0").get(userId).count;
    } else stats.mesIndividus = 0;
    if (role === 'manager' || role === 'admin') {
      stats.individusNonAttribues = db.prepare("SELECT COUNT(*) as count FROM individus WHERE (en_charge IS NULL OR en_charge = '') AND deleted = 0").get().count;
    } else stats.individusNonAttribues = 0;
    return { success: true, data: stats };
  } catch (err) {
    logError('getDashboardStats', err);
    return { success: false, error: 'Erreur stats: ' + err.message, data: {} };
  }
});

// --- Electron App Lifecycle ---
app.whenReady().then(() => {
  log('Application prête');
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.substring(6); 
    callback({ path: path.join(__dirname, 'dist', url) }); 
  });
  initDb(); 
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  try {
    if (db && db.open) {
      db.close();
      log('[DB] Base de données fermée avec succès.');
    }
  } catch (err) {
    logError('window-all-closed (DB close)', err);
  }
  if (process.platform !== 'darwin') app.quit();
});

function createWindow () {
  log('Création de la fenêtre...');
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
	autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: process.env.NODE_ENV !== 'development'
    },
    title: config.appTitle || "Indi-Suivi"
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      // win.webContents.openDevTools();
  }
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => log('Erreur chargement page:', errorCode, errorDescription));
  win.webContents.on('console-message', (event, level, message, line, sourceId) => log(`[Console Renderer] ${message}`));

  const indexPath = path.join(__dirname, 'dist', 'index.html'); 
  log(`[APP] Chemin de l'index.html pour la fenêtre: ${indexPath}`);

  if (app.isPackaged) {
    win.loadFile(indexPath).catch(err => {
        logError('createWindow (loadFile prod)', err);
        dialog.showErrorBox('Erreur Chargement Application', `Impossible de charger l'application: ${err.message}. Vérifiez que le chemin ${indexPath} est correct.`);
    });
  } else {
    const viteDevServerUrl = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL || process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    log(`[APP] Tentative de chargement de VITE_DEV_SERVER_URL: ${viteDevServerUrl}`);
    win.loadURL(viteDevServerUrl).catch(err => {
        logError(`createWindow (loadURL dev ${viteDevServerUrl})`, err);
        log(`[APP] Fallback: tentative de chargement de file://${indexPath}`);
        win.loadFile(indexPath).catch(fileErr => {
            logError('createWindow (loadFile dev fallback)', fileErr);
            dialog.showErrorBox('Erreur Chargement Développement', `Impossible de charger l'application depuis ${viteDevServerUrl} ou ${indexPath}: ${fileErr.message}.`);
        });
    });
  }
}

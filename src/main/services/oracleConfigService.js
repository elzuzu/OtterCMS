const Database = require('better-sqlite3');
const path = require('path');
const cryptoService = require('./cryptoService');

class OracleConfigService {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(__dirname, '../../db/app.sqlite');
    this.initTables();
  }

  get db() {
    return new Database(this.dbPath);
  }

  initTables() {
    const db = this.db;
    db.exec(`CREATE TABLE IF NOT EXISTS oracle_configurations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 1521,
      service_name TEXT NOT NULL,
      username TEXT NOT NULL,
      password_encrypted TEXT NOT NULL,
      password_iv TEXT NOT NULL,
      password_auth_tag TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id)
    );
    CREATE TABLE IF NOT EXISTS oracle_config_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      config_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (config_id) REFERENCES oracle_configurations(id)
    );`);
    db.close();
  }

  logConfigAccess(userId, configId, action) {
    const db = this.db;
    try {
      const stmt = db.prepare(`INSERT INTO oracle_config_audit (user_id, config_id, action) VALUES (?, ?, ?)`);
      stmt.run(userId, configId, action);
    } catch (err) {
      console.error('Erreur log audit:', err);
    } finally {
      db.close();
    }
  }

  saveConfig(config, userId) {
    const db = this.db;
    try {
      const enc = cryptoService.encrypt(config.password);
      if (!enc) throw new Error('Encryption failed');
      const stmt = db.prepare(`INSERT OR REPLACE INTO oracle_configurations (name, host, port, service_name, username, password_encrypted, password_iv, password_auth_tag, description, created_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`);
      const res = stmt.run(config.name, config.host, config.port, config.serviceName, config.username, enc.encrypted, enc.iv, enc.authTag, config.description || '', userId);
      this.logConfigAccess(userId, res.lastInsertRowid, 'save');
      return { success: true, id: res.lastInsertRowid };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      db.close();
    }
  }

  getConfigs() {
    const db = this.db;
    try {
      const stmt = db.prepare(`SELECT oc.*, u.username AS created_by_username FROM oracle_configurations oc LEFT JOIN users u ON oc.created_by = u.id WHERE oc.is_active = 1 ORDER BY oc.name`);
      const rows = stmt.all();
      return { success: true, data: rows.map(r => ({ id: r.id, name: r.name, host: r.host, port: r.port, serviceName: r.service_name, username: r.username, description: r.description, createdBy: r.created_by_username, createdAt: r.created_at })) };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      db.close();
    }
  }

  getConfigForConnection(id) {
    const db = this.db;
    try {
      const stmt = db.prepare(`SELECT * FROM oracle_configurations WHERE id = ? AND is_active = 1`);
      const config = stmt.get(id);
      if (!config) return { success: false, error: 'Configuration non trouvée' };
      const password = cryptoService.decrypt({ encrypted: config.password_encrypted, iv: config.password_iv, authTag: config.password_auth_tag });
      if (!password) return { success: false, error: 'Décryptage impossible' };
      this.logConfigAccess(config.created_by, id, 'read');
      return { success: true, data: { id: config.id, name: config.name, host: config.host, port: config.port, serviceName: config.service_name, username: config.username, password } };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      db.close();
    }
  }

  deleteConfig(id, userId) {
    const db = this.db;
    try {
      const stmt = db.prepare(`UPDATE oracle_configurations SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
      stmt.run(id);
      this.logConfigAccess(userId, id, 'delete');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      db.close();
    }
  }
}

module.exports = new OracleConfigService();

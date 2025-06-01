const EventEmitter = require('events');

class ConfigService extends EventEmitter {
  constructor(db) {
    super();
    this.db = db;
    this.tableExists = false;
    this.checkTableExists();
  }

  checkTableExists() {
    try {
      const stmt = this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='app_config'`);
      const result = stmt.get();
      this.tableExists = !!result;
      if (!this.tableExists) {
        console.warn('Table app_config non trouvée, mode dégradé');
      }
    } catch (err) {
      console.error('Erreur vérif table app_config:', err);
      this.tableExists = false;
    }
  }

  getDefaultTemplate() {
    return {
      template: 'default',
      color: 'transparent',
      width: '0px',
      name: 'Standard',
      environment: 'production',
      modifiedBy: null,
      modifiedAt: new Date().toISOString()
    };
  }

  async getBorderTemplate() {
    try {
      if (!this.tableExists) {
        return { success: true, data: this.getDefaultTemplate(), degradedMode: true };
      }
      const stmt = this.db.prepare(`SELECT config_value, modified_by, modified_at FROM app_config WHERE config_key = ?`);
      const res = stmt.get('window_border_template');
      if (!res) {
        return { success: true, data: this.getDefaultTemplate(), isDefault: true };
      }
      const cfg = JSON.parse(res.config_value);
      return { success: true, data: { ...cfg, modifiedBy: res.modified_by, modifiedAt: res.modified_at } };
    } catch (err) {
      console.error('Erreur getBorderTemplate:', err);
      return { success: true, data: this.getDefaultTemplate(), degradedMode: true, error: err.message };
    }
  }

  async setBorderTemplate(data, userId) {
    try {
      if (!this.tableExists) {
        try {
          await this.createConfigTable();
          this.tableExists = true;
        } catch (e) {
          return { success: false, error: 'Base de données non initialisée' };
        }
      }

      const required = ['template','color','width','name'];
      for (const f of required) {
        if (data[f] === undefined || data[f] === null) {
          return { success: false, error: `Champ manquant: ${f}` };
        }
      }
      if (data.color !== 'transparent' && !data.color.match(/^#[0-9A-Fa-f]{6}$/)) {
        return { success: false, error: 'Format de couleur invalide (ex: #ff0000 ou transparent)' };
      }
      if (!data.width.match(/^\d+px$/)) {
        return { success: false, error: 'Format de largeur invalide (ex: 2px)' };
      }
      const value = JSON.stringify({
        template: data.template,
        color: data.color,
        width: data.width,
        name: data.name.trim(),
        environment: data.environment || 'custom',
        glow: data.glow || null,
        updatedAt: new Date().toISOString()
      });
      const stmt = this.db.prepare(`INSERT OR REPLACE INTO app_config (config_key, config_value, modified_by, modified_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`);
      stmt.run('window_border_template', value, userId);
      const parsed = JSON.parse(value);
      this.emit('border-template-changed', parsed);
      return { success: true, message: 'Configuration de bordure mise à jour avec succès' };
    } catch (err) {
      console.error('Erreur setBorderTemplate:', err);
      return { success: false, error: `Erreur de sauvegarde: ${err.message}` };
    }
  }

  async createConfigTable() {
    try {
      this.db.exec(`CREATE TABLE IF NOT EXISTS app_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_key VARCHAR(50) UNIQUE NOT NULL,
        config_value TEXT NOT NULL,
        description TEXT,
        modified_by INTEGER,
        modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (modified_by) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(config_key);`);
      console.log('Table app_config créée');
      return true;
    } catch (err) {
      console.error('Erreur creation table app_config:', err);
      throw err;
    }
  }

  async getConfigHistory(limit = 10) {
    try {
      if (!this.tableExists) {
        return { success: true, data: [], degradedMode: true };
      }
      const stmt = this.db.prepare(`SELECT config_value, modified_at, (SELECT username FROM users u WHERE u.id = app_config.modified_by) AS modified_by_username FROM app_config WHERE config_key = ? ORDER BY modified_at DESC LIMIT ?`);
      const rows = stmt.all('window_border_template', limit);
      return { success: true, data: rows.map(r => ({ ...JSON.parse(r.config_value), modifiedAt: r.modified_at, modifiedBy: r.modified_by_username || 'Système' })) };
    } catch (err) {
      console.error('Erreur getConfigHistory:', err);
      return { success: true, data: [], error: err.message };
    }
  }

  async checkAndRepairConfig() {
    try {
      if (!this.tableExists) {
        await this.createConfigTable();
        this.tableExists = true;
        await this.setBorderTemplate(this.getDefaultTemplate(), 1);
      }
      return { success: true };
    } catch (err) {
      console.error('Erreur réparation config:', err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = ConfigService;

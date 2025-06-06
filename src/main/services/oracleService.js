let oracledb = null;
try {
  oracledb = require('oracledb');
  console.log('✅ oracledb chargé avec succès');
} catch (error) {
  console.warn('⚠️ oracledb non disponible:', error.message);
}

class OracleService {
  constructor() {
    this.connections = new Map();
    if (oracledb) {
      console.log('🔌 OracleDB mode Thin initialisé');
      console.log('📊 Version:', oracledb.versionString);
      console.log('⚡ Mode Thin actif:', oracledb.thin);
    }
  }

  async testConnection(config) {
    if (!oracledb) {
      return { success: false, error: 'Module oracledb non disponible' };
    }
    let connection;
    try {
      connection = await oracledb.getConnection({
        user: config.username,
        password: config.password,
        connectString: `${config.host}:${config.port}/${config.serviceName}`
      });
      await connection.execute('SELECT 1 FROM DUAL');
      await connection.close();
      return { success: true, message: 'Connexion r\u00e9ussie' };
    } catch (error) {
      if (connection) {
        try { await connection.close(); } catch (_) {}
      }
      return { success: false, error: error.message };
    }
  }

  async executeQuery(config, query, options = {}) {
    if (!oracledb) {
      return { success: false, error: 'Module oracledb non disponible' };
    }
    let connection;
    try {
      connection = await oracledb.getConnection({
        user: config.username,
        password: config.password,
        connectString: `${config.host}:${config.port}/${config.serviceName}`
      });
      const result = await connection.execute(query, [], {
        maxRows: options.maxRows || 1000,
        outFormat: oracledb.OUT_FORMAT_OBJECT
      });
      return { success: true, data: { metaData: result.metaData, rows: result.rows } };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      if (connection) {
        try { await connection.close(); } catch (_) {}
      }
    }
  }
}

module.exports = new OracleService();

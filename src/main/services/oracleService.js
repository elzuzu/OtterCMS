const oracledb = require('oracledb');

class OracleService {
  constructor() {
    this.connections = new Map();
    try {
      oracledb.initOracleClient({ libDir: null });
    } catch (_) {
      // ignore if already initialized or library not required
    }
  }

  async testConnection(config) {
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

import { invoke } from '@tauri-apps/api/core';

window.api = {
  testOracleConnection: (cfg) => invoke('test_oracle_connection', { cfg }),
  executeOracleQuery: (params) => invoke('execute_oracle_query', {
    cfg: params.config,
    query: params.query,
    maxRows: params.maxRows,
  }),
  getOracleConfigs: () => invoke('get_oracle_configs'),
  saveOracleConfig: (cfg) => invoke('save_oracle_config', { cfg }),
};


-- Migration for global border configuration
CREATE TABLE IF NOT EXISTS app_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key VARCHAR(50) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  modified_by INTEGER,
  modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (modified_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT OR IGNORE INTO app_config (config_key, config_value, description, modified_by)
VALUES (
  'window_border_template',
  '{"template":"default","color":"transparent","width":"0px","name":"Standard","environment":"production"}',
  'Configuration globale de la bordure d''application',
  1
);

CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(config_key);

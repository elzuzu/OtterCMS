-- Schema pour OtterCMS initial
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
  champs TEXT NOT NULL,
  ordre INTEGER DEFAULT 0,
  deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS roles (
  name TEXT PRIMARY KEY,
  permissions TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS individus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_unique TEXT,
  en_charge INTEGER REFERENCES users(id) ON DELETE SET NULL,
  categorie_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  champs_supplementaires TEXT NOT NULL DEFAULT '{}',
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

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_windows_login ON users(windows_login);
CREATE INDEX IF NOT EXISTS idx_individus_numero ON individus(numero_unique);
CREATE INDEX IF NOT EXISTS idx_individus_categorie ON individus(categorie_id);
CREATE INDEX IF NOT EXISTS idx_audit_individu ON individu_audit(individu_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON individu_audit(date_modif);

INSERT OR IGNORE INTO roles (name, permissions) VALUES
  ('admin', '["view_dashboard","view_individus","import_data","mass_attribution","manage_categories","manage_users","manage_roles","manage_columns","edit_all","edit_readonly_fields"]'),
  ('manager', '["view_dashboard","view_individus","import_data","mass_attribution","edit_all"]'),
  ('user', '["view_dashboard","view_individus","edit_assigned"]');

INSERT OR IGNORE INTO users (username, password_hash, role) VALUES
  ('admin', '$2b$10$eImiTXuWVxfM37uY4JANjOVpMdLmEyIKZJyAZppq.gGWheCgd0XLK', 'admin');

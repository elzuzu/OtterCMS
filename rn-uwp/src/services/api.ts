import SQLite from 'react-native-sqlite-storage';
import { User, Individu, Category, DashboardStats } from '../types';
import { hashPassword, verifyPassword } from '../utils/auth';

let db: SQLite.SQLiteDatabase;

export const initDatabase = async () => {
  try {
    db = await SQLite.openDatabase({ name: 'IndiSuivi.db', location: 'default' });
    await createTables();
  } catch (error) {
    console.error('Erreur init DB:', error);
  }
};

const createTables = async () => {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      windows_login TEXT,
      deleted INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      champs TEXT NOT NULL,
      ordre INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS individus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_unique TEXT,
      en_charge INTEGER REFERENCES users(id),
      categorie_id INTEGER REFERENCES categories(id),
      champs_supplementaires TEXT,
      deleted INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS individu_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      individu_id INTEGER NOT NULL,
      champ TEXT NOT NULL,
      ancienne_valeur TEXT,
      nouvelle_valeur TEXT,
      utilisateur_id INTEGER,
      date_modif DATETIME DEFAULT CURRENT_TIMESTAMP,
      action TEXT NOT NULL,
      fichier_import TEXT
    )`,
  ];
  for (const q of queries) {
    await db.executeSql(q);
  }
  const adminExists = await db.executeSql('SELECT COUNT(*) as count FROM users WHERE username = ?', ['admin']);
  if (adminExists[0].rows.item(0).count === 0) {
    const hash = await hashPassword('admin');
    await db.executeSql('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
  }
};

export const login = async (username: string, password: string): Promise<User | null> => {
  try {
    const result = await db.executeSql('SELECT * FROM users WHERE username = ? AND deleted = 0', [username]);
    if (result[0].rows.length > 0) {
      const user = result[0].rows.item(0);
      const isValid = await verifyPassword(password, user.password_hash);
      if (isValid) {
        return { id: user.id, username: user.username, role: user.role, windows_login: user.windows_login };
      }
    }
    return null;
  } catch (e) {
    console.error('Erreur login:', e);
    return null;
  }
};

export const getDashboardStats = async (userId: number, role: string): Promise<DashboardStats> => {
  try {
    const stats: DashboardStats = { totalIndividus: 0, mesIndividus: 0, individusNonAttribues: 0, totalCategories: 0, totalUsers: 0 };
    const totalResult = await db.executeSql('SELECT COUNT(*) as count FROM individus WHERE deleted = 0');
    stats.totalIndividus = totalResult[0].rows.item(0).count;
    const mesResult = await db.executeSql('SELECT COUNT(*) as count FROM individus WHERE en_charge = ? AND deleted = 0', [userId]);
    stats.mesIndividus = mesResult[0].rows.item(0).count;
    if (role === 'manager' || role === 'admin') {
      const nonAttribResult = await db.executeSql('SELECT COUNT(*) as count FROM individus WHERE en_charge IS NULL AND deleted = 0');
      stats.individusNonAttribues = nonAttribResult[0].rows.item(0).count;
    }
    const catResult = await db.executeSql('SELECT COUNT(*) as count FROM categories WHERE deleted = 0');
    stats.totalCategories = catResult[0].rows.item(0).count;
    if (role === 'admin') {
      const usersResult = await db.executeSql('SELECT COUNT(*) as count FROM users WHERE deleted = 0');
      stats.totalUsers = usersResult[0].rows.item(0).count;
    }
    return stats;
  } catch (e) {
    console.error('Erreur stats:', e);
    return { totalIndividus: 0, mesIndividus: 0, individusNonAttribues: 0, totalCategories: 0, totalUsers: 0 };
  }
};

export const getIndividus = async (userId: number, role: string): Promise<Individu[]> => {
  try {
    let query = `
      SELECT i.*, c.nom as categorie_nom, u.username as en_charge_username
      FROM individus i
      LEFT JOIN categories c ON i.categorie_id = c.id
      LEFT JOIN users u ON i.en_charge = u.id
      WHERE i.deleted = 0`;
    const params: any[] = [];
    if (role !== 'admin' && role !== 'manager') {
      query += ' AND i.en_charge = ?';
      params.push(userId);
    }
    query += ' ORDER BY i.id DESC';
    const result = await db.executeSql(query, params);
    const individus: Individu[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      const row = result[0].rows.item(i);
      individus.push({
        ...row,
        champs_supplementaires: row.champs_supplementaires ? JSON.parse(row.champs_supplementaires) : {},
      });
    }
    return individus;
  } catch (e) {
    console.error('Erreur getIndividus:', e);
    return [];
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const result = await db.executeSql('SELECT * FROM categories WHERE deleted = 0 ORDER BY ordre ASC, nom ASC');
    const categories: Category[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      const row = result[0].rows.item(i);
      categories.push({ ...row, champs: row.champs ? JSON.parse(row.champs) : [] });
    }
    return categories;
  } catch (e) {
    console.error('Erreur getCategories:', e);
    return [];
  }
};

export { initDatabase as initDb };

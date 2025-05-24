import SQLite from 'react-native-sqlite-storage';

let db: SQLite.SQLiteDatabase;

export const initDatabase = async () => {
  db = await SQLite.openDatabase({ name: 'IndiSuivi.db', location: 'default' });
  // tables are created in api.ts
};

export const getDb = () => db;

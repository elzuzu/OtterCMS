import React, { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import Database from '@tauri-apps/plugin-sql';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [dbPath, setDbPath] = useState<string>('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    invoke('get_db_path').then((p: any) => setDbPath(p as string)).catch(() => {});
  }, []);

  const login = async (username: string, password: string) => {
    if (!dbPath) throw new Error('Chemin DB non chargé');
    const db = await Database.load(`sqlite:${dbPath}`);
    const rows: any[] = await db.select(
      "SELECT id, password_hash, role FROM users WHERE username = ? AND deleted = 0",
      [username]
    );
    if (rows.length === 0) {
      await db.close();
      throw new Error('Utilisateur non trouvé');
    }
    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) {
      await db.close();
      throw new Error('Mot de passe incorrect');
    }
    const userForUI: User = {
      id: rows[0].id.toString(),
      name: username,
      email: '',
      isAdmin: rows[0].role === 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const genToken = btoa(`${rows[0].id}:${Date.now()}`);
    setUser(userForUI);
    setToken(genToken);
    localStorage.setItem('token', genToken);
    localStorage.setItem('user', JSON.stringify(userForUI));
    await db.close();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
}; 
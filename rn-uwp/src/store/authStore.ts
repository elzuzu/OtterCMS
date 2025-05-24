import { create } from 'zustand';
import { User } from '../types';
import { login as apiLogin } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAutoLogin: () => Promise<void>;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  isLoading: false,
  error: null,
  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await apiLogin(username, password);
      if (user) {
        set({ user, isLoading: false });
        await AsyncStorage.setItem('user', JSON.stringify(user));
        return true;
      } else {
        set({ error: 'Identifiants incorrects', isLoading: false });
        return false;
      }
    } catch (error) {
      set({ error: 'Erreur de connexion', isLoading: false });
      return false;
    }
  },
  logout: async () => {
    await AsyncStorage.removeItem('user');
    set({ user: null });
  },
  checkAutoLogin: async () => {
    try {
      const saved = await AsyncStorage.getItem('user');
      if (saved) {
        set({ user: JSON.parse(saved) });
      }
    } catch (e) {
      console.error('Erreur auto-login:', e);
    }
  },
}));

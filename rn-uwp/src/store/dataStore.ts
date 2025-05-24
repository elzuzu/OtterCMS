import { create } from 'zustand';
import { getIndividus, getCategories } from '../services/api';
import { Individu, Category } from '../types';
import { useAuthStore } from './authStore';

interface DataState {
  individus: Individu[];
  categories: Category[];
  loading: boolean;
  loadIndividus: () => Promise<void>;
  loadCategories: () => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  individus: [],
  categories: [],
  loading: false,
  loadIndividus: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;
    set({ loading: true });
    const data = await getIndividus(user.id, user.role);
    set({ individus: data, loading: false });
  },
  loadCategories: async () => {
    set({ loading: true });
    const data = await getCategories();
    set({ categories: data, loading: false });
  },
}));

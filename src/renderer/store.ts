import { create } from 'zustand';

export const useRows = create<{ rows: any[]; set: (r: any[]) => void }>((set) => ({
  rows: [],
  set: (rows) => set({ rows })
}));

window.api.on('db:refresh', (_, r) => useRows.getState().set(r));

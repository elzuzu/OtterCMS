import { create } from 'zustand';

// Purpose: Manages a generic list of rows, updated via 'db:refresh' event from main process.
// TODO: Specify the type of data these rows represent if known, instead of any[].
// Consider if this store is still actively used or if data is primarily fetched directly by components.
export const useRows = create<{ rows: any[]; set: (r: any[]) => void }>((set) => ({
  rows: [],
  set: (rows) => set({ rows })
}));

window.api.on('db:refresh', (_, r) => useRows.getState().set(r));

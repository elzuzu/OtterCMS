import { contextBridge, ipcRenderer } from 'electron';

// TODO: Consider defining shared TypeScript interfaces in src/shared/types.ts for IPC payloads to replace 'any' and improve type safety.
// For example, for createUser, updateUser, addCategorie, updateCategorie, addOrUpdateIndividu, etc.

// Expose l'API complète au renderer
contextBridge.exposeInMainWorld('api', {
  // Méthodes de fenêtre
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Test et configuration
  testConnection: () => ipcRenderer.invoke('test-ipc'),
  initDatabase: () => ipcRenderer.invoke('init-database'),
  getConfig: () => ipcRenderer.invoke('getConfig'),

  // Préférences utilisateur
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme: string) => ipcRenderer.invoke('set-theme', theme),

  // Authentification
  login: (username: string, password: string) => 
    ipcRenderer.invoke('auth-login', { username, password }),
  autoLoginWithWindows: (windowsUsername: string) => 
    ipcRenderer.invoke('auto-login-windows', windowsUsername),
  getWindowsUsername: async () =>
    ipcRenderer.invoke('get-windows-username'),

  // Gestion des utilisateurs
  getUsers: () => ipcRenderer.invoke('getUsers'),
  createUser: (userData: any) => ipcRenderer.invoke('create-user', userData),
  updateUser: (userData: any) => ipcRenderer.invoke('update-user', userData),
  deleteUser: (userId: number) => ipcRenderer.invoke('delete-user', userId),
  associerLoginWindows: (userId: number, loginWindows: string) => 
    ipcRenderer.invoke('associer-login-windows', { userId, loginWindows }),

  // Gestion des rôles
  getRoles: () => ipcRenderer.invoke('getRoles'),
  createRole: (roleData: any) => ipcRenderer.invoke('createRole', roleData),
  updateRole: (roleData: any) => ipcRenderer.invoke('updateRole', roleData),
  deleteRole: (roleName: string) => ipcRenderer.invoke('deleteRole', roleName),

  // Gestion des catégories
  getCategories: () => ipcRenderer.invoke('getCategories'),
  addCategorie: (categorieData: any) => ipcRenderer.invoke('addCategorie', categorieData),
  updateCategorie: (categorieData: any) => ipcRenderer.invoke('updateCategorie', categorieData),
  deleteCategorie: (id: number) => ipcRenderer.invoke('deleteCategorie', id),

  // Gestion des individus
  getIndividus: (userId: number, role: string) => 
    ipcRenderer.invoke('getIndividus', { userId, role }),
  getIndividu: (id: number) => ipcRenderer.invoke('getIndividu', id),
  addOrUpdateIndividu: (params: any) => ipcRenderer.invoke('addOrUpdateIndividu', params),
  deleteIndividu: (params: any) => ipcRenderer.invoke('deleteIndividu', params),
  getAuditIndividu: (individuId: number) => ipcRenderer.invoke('getAuditIndividu', individuId),

  // Import/Export
  importCSV: (params: any) => ipcRenderer.invoke('importCSV', params),

  // Attribution en masse
  attribuerIndividusEnMasse: (params: any) =>
    ipcRenderer.invoke('attribuerIndividusEnMasse', params),

  // Statistiques
  getDashboardStats: (params: any) => ipcRenderer.invoke('getDashboardStats', params),

  // === Configuration de bordure globale ===
  getBorderTemplate: () => ipcRenderer.invoke('get-border-template'),
  setBorderTemplate: (data: any) => ipcRenderer.invoke('set-border-template', data),
  getBorderTemplateHistory: (limit: number) => ipcRenderer.invoke('get-border-template-history', limit),
  repairBorderConfig: () => ipcRenderer.invoke('repair-border-config'),
  onBorderTemplateChanged: (callback: (event: any, data: any) => void) => {
    const handler = (_event: any, data: any) => {
      if (typeof callback === 'function') callback(data);
    };
    ipcRenderer.on('border-template-changed', handler);
    return () => ipcRenderer.removeListener('border-template-changed', handler);
  },

  // Événements
  onImportProgress: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('import-progress', callback);
  },
  removeImportProgressListener: (callback: (event: any, data: any) => void) => {
    ipcRenderer.removeListener('import-progress', callback);
  },

  // Méthodes génériques (gardées pour compatibilité)
  send: (channel: string, data?: any) => ipcRenderer.send(channel, data),
  on: (channel: string, callback: (event: any, data: any) => void) => 
    ipcRenderer.on(channel, callback),
});

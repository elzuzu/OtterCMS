import { contextBridge, ipcRenderer } from 'electron';

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

  // Authentification
  login: (username: string, password: string) => 
    ipcRenderer.invoke('auth-login', { username, password }),
  autoLoginWithWindows: (windowsUsername: string) => 
    ipcRenderer.invoke('auto-login-windows', windowsUsername),
  getWindowsUsername: async () => {
    // Simuler la récupération du nom d'utilisateur Windows
    // En production, vous pourriez utiliser os.userInfo() côté main
    return { success: false, username: null };
  },

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
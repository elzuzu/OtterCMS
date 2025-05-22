const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');

contextBridge.exposeInMainWorld('api', {
  testConnection: async () => {
    try {
      return await ipcRenderer.invoke('test-ipc', 'Test from renderer');
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  initDatabase: async () => {
    try {
      return await ipcRenderer.invoke('init-database');
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  login: async (username, password) => {
    try {
      return await ipcRenderer.invoke('auth-login', { username, password });
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  getWindowsUsername: async () => {
    try {
      const windowsUsername = os.userInfo().username;
      return {
        success: true,
        username: windowsUsername
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  autoLoginWithWindows: async (windowsUsername) => {
    try {
      return await ipcRenderer.invoke('auto-login-windows', windowsUsername);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },
  getUsers: async () => {
    try {
      return await ipcRenderer.invoke('getUsers');
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  createUser: async (userData) => {
    try {
      return await ipcRenderer.invoke('create-user', userData);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  updateUser: async (userData) => {
    try {
      return await ipcRenderer.invoke('update-user', userData);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  deleteUser: async (userId) => {
    try {
      return await ipcRenderer.invoke('delete-user', userId);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  getRoles: async () => {
    try {
      return await ipcRenderer.invoke('getRoles');
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  createRole: async (roleData) => {
    try {
      return await ipcRenderer.invoke('createRole', roleData);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  updateRole: async (roleData) => {
    try {
      return await ipcRenderer.invoke('updateRole', roleData);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  deleteRole: async (name) => {
    try {
      return await ipcRenderer.invoke('deleteRole', name);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  associerLoginWindows: async (userId, loginWindows) => {
    try {
      return await ipcRenderer.invoke('associer-login-windows', userId, loginWindows);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  getCategories: async () => {
    try {
      return await ipcRenderer.invoke('getCategories');
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  addCategorie: async (categorieData) => {
    try {
      return await ipcRenderer.invoke('addCategorie', categorieData);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  updateCategorie: async (categorieData) => {
    try {
      return await ipcRenderer.invoke('updateCategorie', categorieData);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  deleteCategorie: async (categorieId) => {
    try {
      return await ipcRenderer.invoke('deleteCategorie', categorieId);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  getIndividus: async (userId, role) => {
    try {
      return await ipcRenderer.invoke('getIndividus', { userId, role });
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  getIndividu: async (individuId) => {
    try {
      return await ipcRenderer.invoke('getIndividu', individuId);
    } catch (error) {
      return { success: false, error: error.message, data: null };
    }
  },
  addOrUpdateIndividu: async (data) => {
    try {
      return await ipcRenderer.invoke('addOrUpdateIndividu', data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  deleteIndividu: async (data) => {
    try {
      return await ipcRenderer.invoke('deleteIndividu', data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  getAuditIndividu: async (individuId) => {
    try {
      return await ipcRenderer.invoke('getAuditIndividu', individuId);
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  },
  importCSV: async (data) => {
    try {
      return await ipcRenderer.invoke('importCSV', data);
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  getDashboardStats: async (params) => {
    try {
      return await ipcRenderer.invoke('getDashboardStats', params);
    } catch (error) {
      return { success: false, error: error.message, data: {} };
    }
  },
  // API améliorée pour l'attribution de masse
  attribuerIndividusEnMasse: async (params) => {
    try {
      return await ipcRenderer.invoke('attribuerIndividusEnMasse', params);
    } catch (error) {
      console.error('Erreur dans attribuerIndividusEnMasse:', error);
      return { success: false, error: error.message };
    }
  },
  onImportProgress: (callback) => {
    ipcRenderer.on('import-progress', callback);
  },
  removeImportProgressListener: (callback) => {
    ipcRenderer.removeListener('import-progress', callback);
  }
});

import { VitePlugin } from '@electron-forge/plugin-vite';

export default {
  // Configuration du packager, incluant l'archivage ASAR et l'icône de l'application.
  packagerConfig: { asar: true, icon: 'build/icon.ico' },
  // Définition des "makers" pour créer des paquets d'installation.
  // Ici, un maker pour Squirrel.Windows est configuré.
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: { name: 'MonApp', setupIcon: 'build/icon.ico' }
    }
  ],
  // Configuration des plugins, ici le plugin Vite pour Electron Forge.
  plugins: [
    new VitePlugin({
      // Configuration du processus principal (main process) avec son fichier de configuration Vite.
      main: { config: 'vite.main.config.ts' },
      // Configuration du script de préchargement (preload script) avec son fichier de configuration Vite.
      preload: { config: 'vite.preload.config.ts' },
      // Configuration des processus de rendu (renderer processes).
      // 'main_window' est le nom du processus de rendu, et 'vite.config.js' est son fichier de configuration Vite.
      renderer: [{ name: 'main_window', config: 'vite.config.js' }]
    })
  ]
};

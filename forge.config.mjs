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
      // Fichiers à builder pour le processus principal et le script de préchargement
      build: [
        { entry: 'src/main.ts', config: 'vite.main.config.ts' },
        { entry: 'src/preload.ts', config: 'vite.preload.config.ts' }
      ],
      // Processus de rendu
      // 'main_window' est le nom du renderer et 'vite.config.js' son fichier de configuration Vite
      renderer: [{ name: 'main_window', config: 'vite.config.js' }]
    })
  ]
};

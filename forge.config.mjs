import { VitePlugin } from '@electron-forge/plugin-vite';

export default {
  packagerConfig: { asar: true, icon: 'build/icon.ico' },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: { name: 'MonApp', setupIcon: 'build/icon.ico' }
    }
  ],
  plugins: [
    new VitePlugin({
      main: { config: 'vite.main.config.ts' },
      preload: { config: 'vite.preload.config.ts' },
      renderer: [{ name: 'main_window', config: 'vite.config.js' }]
    })
  ]
};

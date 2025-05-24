import { VitePlugin } from '@electron-forge/plugin-vite';

export default {
  packagerConfig: {
    asar: true,
    icon: 'src/assets/app-icon',
    executableName: 'Indi-Suivi',
    asarUnpack: [
      '**/node_modules/better-sqlite3/**/*',
      '**/node_modules/electron-updater/**/*'
    ],
    extraResource: [
      './config'
    ]
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'IndiSuivi',
        setupIcon: 'src/assets/app-icon.ico',
        noMsi: true
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32']
    }
  ],
  plugins: [
    new VitePlugin({
      build: [
        { entry: 'src/main.js', config: 'vite.main.config.ts' },
        { entry: 'src/preload.ts', config: 'vite.preload.config.ts' }
      ],
      renderer: [{ name: 'main_window', config: 'vite.config.js' }]
    })
  ]
};

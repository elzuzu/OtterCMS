module.exports = {
  packagerConfig: {
    icon: "src/assets/app-icon.ico",
    asar: true,
    ignore: [/config\/app-config\.json$/],
    extraResource: [
      {
        from: "config/app-config.json",
        to: "config/app-config.json"
      }
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: "indi_suivi_nodejs"
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32']
    },
    {
      name: '@electron-forge/maker-deb',
      config: {}
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {}
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    },
    {
      name: '@electron-forge/plugin-vite',
      config: {
        build: [],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.config.js'
          }
        ]
      }
    }
  ]
};

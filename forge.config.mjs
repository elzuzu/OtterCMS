import { vitePlugin } from '@electron-forge/plugin-vite';

export default {
  packagerConfig: { asar: true, icon: 'build/icon.ico' },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: { name: 'MonApp', setupIcon: 'build/icon.ico' }
    }
  ],
  plugins: [vitePlugin({})]
};

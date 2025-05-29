import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/renderer',
  plugins: [
    react({
      // Configuration Babel sécurisée
      babel: {
        plugins: process.env.NODE_ENV === 'production' ? [
          // Utiliser le nom complet du package
          ['babel-plugin-transform-remove-console', { exclude: ['error', 'warn'] }]
        ] : []
      }
    }),
  ],
  base: './',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    sourcemap: false,
    assetsDir: 'assets',
    cssCodeSplit: false, // Réduire le nombre de fichiers CSS
    minify: 'terser', // Meilleure compression que esbuild
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug']
      }
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/renderer/index.html'),
      },
      output: {
        manualChunks: {
          // Grouper les vendors critiques ensemble
          'vendor-core': ['react', 'react-dom', 'zustand'],
          'vendor-ui': ['@mui/material', '@emotion/react', '@emotion/styled'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-icons': ['@tabler/icons-react'],
          'vendor-utils': ['xlsx', 'framer-motion']
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      external: [] // Ne pas externaliser pour l'app Electron
    },
    chunkSizeWarningLimit: 500, // Réduire la limite pour forcer l'optimisation
    reportCompressedSize: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
  },
  server: {
    port: 5173,
  },
  // Optimisations supplémentaires
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  }
});

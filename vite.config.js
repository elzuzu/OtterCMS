import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/renderer',
  // Assure l'inclusion correcte des fichiers statiques situés
  // dans le dossier "public" à la racine du projet
  publicDir: resolve(__dirname, 'public'),
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
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
        dead_code: true,
        unused: true,
        passes: 2
      },
      mangle: {
        safari10: true
      }
    },
    rollupOptions: {
      external: ['electron'],
      input: {
        main: resolve(__dirname, 'src/renderer/index.html'),
      },
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-mui': ['@mui/material', '@emotion/react', '@emotion/styled'],
          'vendor-data': ['xlsx', 'zustand'],
          'vendor-ui': ['@tabler/icons-react', 'framer-motion']
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          let extType = info[info.length - 1];
          if (assetInfo.name.includes('datta-able-assets')) {
            // Preserve subfolder structure for Datta Able assets
            const idx = assetInfo.name.indexOf('datta-able-assets/');
            const relativePath = assetInfo.name.substring(idx + 'datta-able-assets/'.length);
            return `datta-able-assets/${relativePath}`;
          }
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name)) {
            extType = 'media';
          } else if (/\.(png|jpe?g|gif|svg|webp|avif)(\?.*)?$/i.test(assetInfo.name)) {
            extType = 'img';
          } else if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name)) {
            extType = 'fonts';
          }
          return `${extType}/[name]-[hash].[ext]`;
        }
      },
      treeshake: {
        moduleSideEffects: false,
        pureExternalModules: true
      }
    },
    chunkSizeWarningLimit: 2000,
    reportCompressedSize: true
  },
  optimizeDeps: {
    exclude: ['electron']
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
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    legalComments: 'none'
  }
});

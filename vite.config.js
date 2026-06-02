import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: "./",

  plugins: [
    react({
      // Optimize React Fast Refresh
      babel: {
        plugins: ['@babel/plugin-syntax-dynamic-import'],
      },
    })
  ],

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    cssMinify: true,

    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },

    rollupOptions: {
      output: {
        // Improved chunk splitting for better caching
        manualChunks: (id) => {
          // Separate vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'react-vendor';
            }
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            if (id.includes('supabase')) {
              return 'supabase';
            }
            if (id.includes('lucide-react')) {
              return 'lucide';
            }
            return 'vendor';
          }
          
          // Separate component chunks
          if (id.includes('/components/')) {
            if (id.includes('/chat/')) {
              return 'chat-components';
            }
            if (id.includes('/layout/')) {
              return 'layout-components';
            }
            return 'components';
          }
          
          // Services chunk
          if (id.includes('/services/')) {
            return 'services';
          }

          // Utils chunk
          if (id.includes('/utils/')) {
            return 'utils';
          }
        },
      },
    },
  },

  server: {
    port: 5173,
    strictPort: true,
    host: "127.0.0.1",
  },

  // Optimization settings
  resolve: {
    alias: {},
  },

  // Enable caching for faster rebuilds
  cacheDir: '.vite-cache',
})
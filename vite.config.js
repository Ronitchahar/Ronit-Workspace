import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: "./",

  plugins: [react()],

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    cssMinify: false,

    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom')
          ) {
            return 'vendor'
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
})
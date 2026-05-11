import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  server: {
    watch: {
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      '/api': {
        target: 'http://alumco-backend:3000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/static': {
        target: 'http://alumco-backend:3000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
})

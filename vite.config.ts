import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:3001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})


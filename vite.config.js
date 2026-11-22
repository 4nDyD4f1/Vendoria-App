import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    // Backend Spring; same-origin di dev sehingga cookie sesi tidak kena aturan lintas-origin
    // /oauth2 memulai login Google; /login/oauth2 hanya untuk callback (jangan proxy '/login': itu halaman React)
    proxy: {
      '/api': 'http://localhost:8080',
      '/oauth2': 'http://localhost:8080',
      '/login/oauth2': 'http://localhost:8080',
    },
  },
})

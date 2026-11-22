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
    proxy: { '/api': 'http://localhost:8080' },
  },
})

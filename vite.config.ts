import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Forward /api calls to the backend during `npm run dev`
    proxy: { '/api': 'http://localhost:3001' },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})

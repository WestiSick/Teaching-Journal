import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'landing_assets', // Changed from 'assets' to 'landing_assets'
    emptyOutDir: true,
    rollupOptions: {
      output: {
        assetFileNames: 'landing_assets/[name]-[hash][extname]',
        chunkFileNames: 'landing_assets/[name]-[hash].js',
        entryFileNames: 'landing_assets/[name]-[hash].js',
      },
    },
  },
  server: {
    port: 3001
  }
})
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
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'favicon.ico' || assetInfo.name === 'apple-touch-icon.png') {
            return '[name].[ext]';
          }
          return 'landing_assets/[name]-[hash][extname]';
        },
        chunkFileNames: 'landing_assets/[name]-[hash].js',
        entryFileNames: 'landing_assets/[name]-[hash].js',
      },
    },
  },
  publicDir: 'public', // Ensure public directory is included
  server: {
    port: 3001
  }
})
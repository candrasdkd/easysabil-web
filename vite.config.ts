import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/firebase/')) return 'firebase'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router/')) return 'react-vendor'
          if (id.includes('/lucide-react/')) return 'icons'
          if (id.includes('/xlsx/')) return 'xlsx'
          if (id.includes('/jspdf/') || id.includes('/html-to-image/')) return 'reporting'
          return undefined
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'EasySabil',
        short_name: 'EasySabil',
        description: 'Easy giving with EasySabil',
        theme_color: '#065f46',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
})

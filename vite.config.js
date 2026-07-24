import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
      ],

      manifest: {
        id: '/',
        name: 'Timesheet Manager',
        short_name: 'Timesheet',
        description: 'Overtime & Task-Based Timesheet Management System',

        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',

        background_color: '#0f172a',
        theme_color: '#0f172a',

       icons: [
  {
    src: "/icons/icon-192.png",
    sizes: "192x192",
    type: "image/png"
  },
  {
    src: "/icons/icon-512.png",
    sizes: "512x512",
    type: "image/png"
  },
 
]
},

  workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,

        globPatterns: ['**/*.{js,css,html,png,svg,ico,json}'],

        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-firestore',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts'
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-static'
            }
          }
        ]
      },

      devOptions: {
        enabled: true
      }
    })
  ]
})
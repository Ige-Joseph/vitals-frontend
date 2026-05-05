import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg', 'icons/*.png', 'firebase-messaging-sw.js'],
      manifest: {
        name: 'Vitals — Your Health Companion',
        short_name: 'Vitals',
        description: 'Medication reminders, pregnancy tracking, AI health insights, and more.',
        theme_color: '#005bbf',
        background_color: '#f7f9ff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/dashboard',
        scope: '/',
        lang: 'en',
        categories: ['health', 'medical', 'lifestyle'],
        // SVG icons are placeholders — replace with PNG when you have real assets.
        // Required for full install: 192x192.png and 512x512.png (maskable).
        icons: [
          { src: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icons/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        shortcuts: [
          { name: 'Dashboard', url: '/dashboard', icons: [{ src: '/icons/icon-192x192.svg', sizes: '192x192' }] },
          { name: 'My Care',   url: '/care',      icons: [{ src: '/icons/icon-192x192.svg', sizes: '192x192' }] }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp}'],
        globIgnores: ['firebase-messaging-sw.js'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/admin/, /^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 31536000 } }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 31536000 } }
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 10, expiration: { maxEntries: 50, maxAgeSeconds: 300 } }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } }
})

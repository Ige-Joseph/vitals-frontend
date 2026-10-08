import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig(({ mode }) => ({
  // Keep production API requests on the app origin through Vercel's /api proxy.
  // A hosting environment override must not move OAuth cookies to the API host.
  define: mode === 'production'
    ? { 'import.meta.env.VITE_API_URL': JSON.stringify('') }
    : undefined,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
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
        // The PNG icons below are the install icons; SVG variants remain for shortcuts.
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
        ],
        shortcuts: [
          { name: 'Dashboard', url: '/dashboard', icons: [{ src: '/icons/icon-192x192.svg', sizes: '192x192' }] },
          { name: 'My Care',   url: '/care',      icons: [{ src: '/icons/icon-192x192.svg', sizes: '192x192' }] }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp}'],
        globIgnores: ['firebase-messaging-sw.js', '**/images/contextual/**'],
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
            urlPattern: /\/images\/contextual\//,
            handler: 'CacheFirst',
            options: { cacheName: 'vitals-context-images', expiration: { maxEntries: 30, maxAgeSeconds: 2592000 } }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } }
}))

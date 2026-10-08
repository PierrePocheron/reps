/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // No registerSW.js: it also ran in the Android app; src/utils/serviceWorker.ts registers on the web only
      injectRegister: null,
      includeAssets: ['favicon.ico', 'icons/pwa-192x192.png'],
      manifest: {
        name: 'reps',
        short_name: 'reps',
        description: 'Application de suivi d\'entraînements de musculation au poids du corps',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/pwa-48x48.png',
            sizes: '48x48',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-72x72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-96x96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-144x144.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-152x152.png',
            sizes: '152x152',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-256x256.png',
            sizes: '256x256',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Photos des exercices de base (public/exercises, 5,7 Mo : pas en précache) : gardées après le premier
            // affichage, sinon hors ligne elles manquaient (image cassée)
            urlPattern: /\/exercises\/[^/]+\.(?:jpg|jpeg|gif|png|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-photos',
              expiration: { maxEntries: 250, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Sound effects (1.3 MB, not precached): kept once played, otherwise silent offline
            urlPattern: /\/sounds\/[^/]+\.mp3$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sounds',
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true, // <audio> asks for byte ranges: served from the cached file
              // ...but the network answers a range with a 206, which cannot be cached: fetch the whole file
              plugins: [{ requestWillFetch: async ({ request }) => new Request(request.url) }],
            },
          },
          {
            // Médias de la bibliothèque d'exercices (CDN jsDelivr) :
            // cache-first pour être disponibles hors ligne après consultation
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/gh\/hasaneyldrm\/exercises-dataset@.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-media-cache',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 180 // 6 mois
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
          // No Firestore / Firebase route: the SDK's persistent cache works offline, every Listen URL is unique (never
          // served again), and the cached answers kept account data past sign-out and deletion
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    // agents' isolated worktrees live under .claude/: their copies of the tests ran too (old code, double load)
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**'], // not vitest/config: pwaConfig.test imports this file in jsdom
    env: {
      VITE_SENTRY_DSN: 'https://test@sentry.io/0', // Ensure Sentry is enabled in CI tests
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/setupTests.ts']
    }
  }
});


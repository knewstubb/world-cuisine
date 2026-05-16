/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { VitePWAOptions } from 'vite-plugin-pwa'

export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  manifest: {
    name: 'Cooking World Map',
    short_name: 'CookMap',
    description: 'Track the dishes you cook and visualize them on an interactive world map',
    theme_color: '#2e7d32',
    background_color: '#ffffff',
    display: 'standalone',
    icons: [
      {
        src: '/icons/icon-192x192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/icon-512x512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,geojson}'],
    runtimeCaching: [
      {
        // Cache Supabase REST API responses (general queries)
        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-api-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24, // 24 hours
          },
          networkTimeoutSeconds: 5,
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        // Cache popular_dishes responses for offline access
        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/popular_dishes.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'supabase-popular-dishes-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        // Cache Supabase Auth session/token responses
        urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-auth-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60, // 1 hour
          },
          networkTimeoutSeconds: 3,
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        // Cache Supabase Storage images with CacheFirst strategy
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'supabase-storage-images-cache',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA(pwaOptions),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})

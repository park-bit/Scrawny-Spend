import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.jpg'],
      manifest: {
        name: 'ScrawnySpend – Smart Expense Tracker',
        short_name: 'ScrawnySpend',
        description: 'AI-powered personal finance tracker',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'logo.jpg', sizes: '192x192', type: 'image/jpeg' },
          { src: 'logo.jpg', sizes: '512x512', type: 'image/jpeg', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache API responses for offline-first reads
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/(expenses|budgets|analytics)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      // Proxy /api calls to Node backend during development
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});

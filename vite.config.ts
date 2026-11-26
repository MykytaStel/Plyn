import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      // 0.22 (IMP-15): a new version waits instead of taking over open tabs.
      // src/services/pwa/registerApp.ts registers it and offers "Update now".
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Plyn — спокійне читання картками',
        short_name: 'Plyn',
        description: 'Читання тексту короткими картками без втоми очей та перевантаження.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#16181D',
        theme_color: '#16181D',
        lang: 'uk',
        share_target: {
          action: './',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        },
        icons: [
          { src: './icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: './icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: './icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: './icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // The first install controls the page at once (offline after the first
        // visit). A later version still waits: no skipWaiting in prompt mode.
        clientsClaim: true
      }
    })
  ]
});

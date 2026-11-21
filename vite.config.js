import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/pixel-ants/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Pixel Ants',
        short_name: 'Pixel Ants',
        display: 'fullscreen',
        orientation: 'portrait',
        background_color: '#17152a',
        theme_color: '#17152a',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}'],
      },
    }),
  ],
});

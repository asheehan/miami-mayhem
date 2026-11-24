import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/miami-mayhem/',
  // the deploy machine is several times slower than a laptop, and a few tests are long sweeps
  test: { testTimeout: 30000 },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: "Riley's Miami Mayhem",
        short_name: 'Miami Mayhem',
        display: 'fullscreen',
        orientation: 'portrait',
        background_color: '#2b1055',
        theme_color: '#2b1055',
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

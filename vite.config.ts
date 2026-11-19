import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

const safeDevPwaHmrPlugin = (): Plugin => {
  let isHmrEnabled = process.env.DISABLE_HMR !== 'true';
  return {
    name: 'safe-dev-pwa-hmr',
    apply: 'serve',
    enforce: 'post',
    configResolved(config) {
      isHmrEnabled = config.server.hmr !== false && process.env.DISABLE_HMR !== 'true';
    },
    transform(code, id) {
      if (!id.includes('@vite-plugin-pwa/pwa-entry-point-loaded')) {
        return null;
      }

      if (!isHmrEnabled) {
        return {
          code: `
export default function registerDevSW() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const doRegister = () => {
    navigator.serviceWorker.register('/dev-sw.js?dev-sw', { scope: '/' }).catch(() => {});
  };
  if (document.readyState === 'complete') {
    doRegister();
  } else {
    window.addEventListener('load', doRegister, { once: true });
  }
}
`,
          map: null,
        };
      }

      const patched = code.replace(
        /function registerDevSW\(\)\s*\{[\s\S]*?\n\}/,
        `function registerDevSW() {
  if (typeof import.meta.hot === 'undefined' || !import.meta.hot) return;
  let notified = false;
  const sendReady = () => {
    if (notified) return;
    notified = true;
    try {
      import.meta.hot.send('vite-pwa-plugin:dev-ready');
    } catch (e) {
      console.error('unable to send vite-pwa-plugin:dev-ready message to register service worker in dev mode!', e);
    }
  };
  import.meta.hot.on('vite:ws:connect', sendReady);
}`
      );
      return {code: patched, map: null};
    },
  };
};

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'Warung Pintar Pro - Kasir & Manajemen Toko',
          short_name: 'WarungPintar',
          description: 'Aplikasi Kasir POS & Inventori Toko Kelontong Cerdas Offline & Online.',
          theme_color: '#2563eb',
          background_color: '#f8fafc',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          prefer_related_applications: false,
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'product-images-cache',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
      safeDevPwaHmrPlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

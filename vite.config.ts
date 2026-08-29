import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { sep } from 'node:path'

const base = '/languagues_learning/'

export default defineConfig({
  base,
  build: {
    rollupOptions: {
      output: {
        // Un solo bundle de ~674 KB disparaba el aviso de Vite. Partirlo no baja el peso total
        // (la PWA precachea todo igual para funcionar sin internet), pero sí mejora el caché
        // entre despliegues: tocar una lectura ya no invalida React, y al revés. Son tres
        // cosas que cambian a ritmos muy distintos.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id))
              return 'vendor'
            if (/[\\/]node_modules[\\/]dexie/.test(id)) return 'dexie'
            return
          }
          // Los data packs de /data (no los de src/data, que son código).
          if (/[\\/]data[\\/][^\\/]+[\\/][^\\/]+\.json$/.test(id) && !id.includes(`src${sep}data`))
            return 'datos'
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Idiomas',
        short_name: 'Idiomas',
        description: 'Aprende inglés, nivel A1, a tu ritmo',
        lang: 'es',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,json,woff2}'],
        navigateFallback: base + 'index.html',
        // La IA (speaking / corrección de writing) siempre va por red, nunca cacheada.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.anthropic\.com\/.*/i,
            handler: 'NetworkOnly',
            method: 'POST'
          }
        ]
      }
    })
  ]
})

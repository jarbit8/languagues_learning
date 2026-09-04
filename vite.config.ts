import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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
            // Firebase solo entra en juego si el usuario conecta la cuenta, y se actualiza a
            // un ritmo distinto del resto: en su propio trozo para no invalidar el bundle
            // principal cada vez que cambia el SDK.
            if (/[\\/]node_modules[\\/](@firebase|firebase)[\\/]/.test(id)) return 'firebase'
            return
          }
          // Los data packs de /data. src/data queda fuera solo, porque ahí todo es .ts.
          // Ojo: nada de importar 'node:path' aquí para separar rutas — el repo no tiene
          // @types/node y tsc lo rechaza (el build local no lo cazó, el de Actions sí).
          if (/[\\/]data[\\/][^\\/]+[\\/][^\\/]+\.json$/.test(id)) return 'datos'
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
        // Sincronizar la cuenta siempre va por red y nunca se cachea: una respuesta guardada
        // de Firestore serviría progreso caducado. Sin internet la petición falla y la app
        // sigue funcionando con lo que tiene en Dexie, que es justo lo que se busca.
        // (Aquí había una regla para api.anthropic.com; se quedó huérfana al borrar la IA.)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(firestore|identitytoolkit|securetoken)\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ]
})

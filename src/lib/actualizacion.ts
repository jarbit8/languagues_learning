import { registerSW } from 'virtual:pwa-register'

// La PWA cacheaba tan bien que tras un deploy el usuario seguía viendo la versión vieja y había
// que decirle "cierra y reabre la app". Con esto la actualización es automática: se busca una
// versión nueva al abrir y cada 30 min mientras la app está abierta, y en cuanto hay una se
// recarga sola. `updateSW(true)` activa el service worker nuevo y recarga la página.
const CADA_30_MIN = 30 * 60 * 1000

let actualizar: ((recargar?: boolean) => Promise<void>) | null = null

export function iniciarAutoActualizacion() {
  actualizar = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Hay contenido nuevo esperando: aplicarlo y recargar sin preguntar.
      actualizar?.(true)
    },
    onRegisteredSW(_url, registro) {
      if (!registro) return
      // El navegador solo busca actualizaciones al navegar; en una PWA que se queda abierta
      // eso puede no pasar en días, así que se comprueba a mano cada rato.
      setInterval(() => registro.update().catch(() => {}), CADA_30_MIN)
    }
  })
}

/** Fuerza la búsqueda de una versión nueva (botón "Buscar actualización" en Ajustes). */
export async function buscarActualizacion(): Promise<'actualizando' | 'al-dia' | 'no-soportado'> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return 'no-soportado'
  const registros = await navigator.serviceWorker.getRegistrations()
  if (!registros.length) return 'no-soportado'
  let hayNueva = false
  for (const r of registros) {
    await r.update().catch(() => {})
    if (r.waiting || r.installing) hayNueva = true
  }
  if (hayNueva) {
    await actualizar?.(true)
    return 'actualizando'
  }
  return 'al-dia'
}

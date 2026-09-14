import { cuentaResuelta, detenerSincronizacion, reanudarSincronizacion } from './autosync'
import { reiniciarLocal, reiniciarRemoto } from './sync'

// Borra TODO el progreso y deja la app como recién instalada. No toca el contenido del curso,
// que vive en los data packs y no en la base.
//
// Con la cuenta conectada tiene que llegar a TODOS los aparatos, y la fusión de `sync.ts` no
// sabe borrar (ver la marca de reinicio allí). Dos intentos anteriores fallaron por eso:
// vaciar solo lo local lo resucitaba la nube (2026-09-09) y vaciar también la nube lo
// resucitaba el otro aparato (2026-09-14).
//
// Orden: la nube primero, porque sin red se queda todo como estaba en vez de dejar este
// aparato vacío y la nube llena.
export async function reiniciarCurso(): Promise<void> {
  const cuenta = await cuentaResuelta()
  await detenerSincronizacion()
  try {
    const fecha = cuenta ? await reiniciarRemoto(cuenta.uid) : undefined
    await reiniciarLocal(cuenta?.uid, fecha)
  } catch (e) {
    reanudarSincronizacion()
    throw e
  }
}

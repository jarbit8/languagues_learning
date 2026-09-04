import { observarCuenta, type Cuenta } from './cuenta'
import { sincronizar, ultimaSync } from './sync'

// El sincronizador vive en la APP, no en una pantalla. Antes estaba dentro del componente de
// Cuenta, que solo existe mientras se está en Progreso, y eso dejaba fuera justo el caso que
// motivó todo esto: abrir la app en el móvil, ponerse a estudiar sin pasar por Progreso y no
// bajarse nunca lo que se hizo en el PC. También dejaba sin efecto el empuje de después de
// cada examen, porque el uid se apuntaba desde ese mismo componente.
//
// Se sincroniza en tres momentos: al iniciar sesión (o al abrir la app con la sesión ya
// puesta), cada vez que la app vuelve a primer plano, y unos segundos después de terminar un
// examen (eso lo dispara `sincronizarPronto` desde progreso.ts). El botón de la tarjeta es
// solo para forzarlo.

export interface EstadoSync {
  cuenta: Cuenta | null
  cargando: boolean
  sincronizando: boolean
  ultima: number | null
  error: string | null
}

let estado: EstadoSync = {
  cuenta: null,
  cargando: true,
  sincronizando: false,
  ultima: ultimaSync(),
  error: null
}

const oyentes = new Set<() => void>()

function cambiar(parcial: Partial<EstadoSync>): void {
  estado = { ...estado, ...parcial }
  for (const avisar of oyentes) avisar()
}

// Para useSyncExternalStore: la referencia solo cambia cuando cambia algo de verdad.
export const leerEstado = (): EstadoSync => estado

export function suscribir(avisar: () => void): () => void {
  oyentes.add(avisar)
  return () => { oyentes.delete(avisar) }
}

export async function sincronizarAhora(): Promise<boolean> {
  const cuenta = estado.cuenta
  // Sin sesión no hay nada que subir, y si ya hay una sincronización en marcha la segunda
  // solo repetiría el mismo trabajo: la fusión es idempotente, pero no es gratis.
  if (!cuenta || estado.sincronizando) return false
  cambiar({ sincronizando: true })
  const r = await sincronizar(cuenta.uid)
  cambiar({
    sincronizando: false,
    error: r.ok ? null : (r.error ?? 'No se pudo sincronizar'),
    ultima: r.ok ? r.cuando : estado.ultima
  })
  return r.ok
}

let arrancado = false

export function arrancarSincronizacion(): void {
  if (arrancado) return
  arrancado = true

  observarCuenta((cuenta) => {
    cambiar({ cuenta, cargando: false, error: cuenta ? estado.error : null })
    if (cuenta) void sincronizarAhora()
  })

  // Volver a primer plano es lo que hace que pasar del móvil al PC funcione sin tocar nada.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void sincronizarAhora()
  })
}

// --- empuje después de cada examen ---
//
// Terminar un examen es el momento en el que el progreso cambia de verdad; entre examen y
// examen no hay casi nada que mandar. Lo llama `registrarHistorial`, por donde pasan los
// cuatro tipos de examen. Pasa por `sincronizarAhora` a propósito, para que la tarjeta de
// cuenta enseñe también esta sincronización y no solo las que dispara ella.

let temporizador: ReturnType<typeof setTimeout> | undefined

export function sincronizarPronto(): void {
  if (!estado.cuenta) return
  // Se espera un poco para no mandar tres veces seguidas si se encadenan escrituras.
  clearTimeout(temporizador)
  temporizador = setTimeout(() => { void sincronizarAhora() }, 4000)
}

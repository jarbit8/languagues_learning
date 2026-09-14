import { observarCuenta, type Cuenta } from './cuenta'
import { sincronizar, ultimaSync, type ResultadoSync } from './sync'

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

let enCurso: Promise<ResultadoSync> | null = null
let detenida = false

export async function sincronizarAhora(): Promise<boolean> {
  const cuenta = estado.cuenta
  // Sin sesión no hay nada que subir, y si ya hay una sincronización en marcha la segunda
  // solo repetiría el mismo trabajo: la fusión es idempotente, pero no es gratis.
  if (!cuenta || estado.sincronizando || detenida) return false
  cambiar({ sincronizando: true })
  enCurso = sincronizar(cuenta.uid)
  const r = await enCurso
  enCurso = null
  cambiar({
    sincronizando: false,
    error: r.ok ? null : (r.error ?? 'No se pudo sincronizar'),
    ultima: r.ok ? r.cuando : estado.ultima
  })
  // Se reinició desde el otro aparato: ninguna pantalla montada debe seguir pintando lo de antes.
  if (r.vaciado) location.reload()
  return r.ok
}

// Para el reinicio. Una sincronización que leyó antes de borrar escribiría después y
// devolvería lo borrado, así que se espera a que acabe la que esté en marcha y no se deja
// empezar ninguna más (tampoco la del temporizador de después de un examen).
export async function detenerSincronizacion(): Promise<void> {
  detenida = true
  clearTimeout(temporizador)
  await enCurso
}

export function reanudarSincronizacion(): void {
  detenida = false
}

// Al abrir la app la sesión tarda un momento en resolverse; reiniciar antes de eso borraría
// solo en local y la sincronización de arranque lo bajaría todo de vuelta.
export function cuentaResuelta(): Promise<Cuenta | null> {
  if (!estado.cargando) return Promise.resolve(estado.cuenta)
  return new Promise((listo, fallo) => {
    const espera = setTimeout(() => { quitar(); fallo(new Error('La sesión no respondió')) }, 10000)
    const quitar = suscribir(() => {
      if (estado.cargando) return
      clearTimeout(espera)
      quitar()
      listo(estado.cuenta)
    })
  })
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

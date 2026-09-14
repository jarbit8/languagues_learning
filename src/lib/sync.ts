import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore/lite'
import { db } from '../db'
import { getDbRemota } from './firebase'
import type {
  AbreviacionSabida,
  HistorialExamen,
  HojaVocab,
  NotasBloque,
  PalabraEstado,
  PlanEstudio,
  PracticaPron,
  ProgresoBloque,
  ProgresoNivel,
  ProgresoTema
} from '../types'

// Sincronización del progreso con la cuenta del usuario.
//
// REGLA DE ORO: sincronizar NUNCA puede hacer perder progreso. No es "gana el último que
// escribió", que borraría el trabajo del otro aparato si se estudió en los dos sin conectar.
// Cada tabla se fusiona quedándose con lo MÁS AVANZADO de cada lado: la palabra con la caja
// de SRS más alta, el tema aprobado por encima del que está en curso, la nota más alta, el
// historial de exámenes unido sin duplicados. En el peor caso se repite un examen; nunca se
// pierde uno aprobado.
//
// El orden es siempre: traer lo remoto → fusionar con lo local → guardar en las dos partes.
// Así da igual por dónde se empiece.

const RAMAS = ['palabras', 'progresoTema', 'progresoBloque', 'progresoNivel', 'historialExamenes', 'practicaPron', 'plan', 'abreviaciones', 'hojasVocab'] as const
type Rama = (typeof RAMAS)[number]

interface Paquete {
  palabras: PalabraEstado[]
  progresoTema: ProgresoTema[]
  progresoBloque: ProgresoBloque[]
  progresoNivel: ProgresoNivel[]
  historialExamenes: HistorialExamen[]
  practicaPron: PracticaPron[]
  abreviaciones: AbreviacionSabida[]
  plan: PlanEstudio[]
  hojasVocab: HojaVocab[]
}

const vacio = (): Paquete => ({
  palabras: [], progresoTema: [], progresoBloque: [], progresoNivel: [],
  historialExamenes: [], practicaPron: [], plan: [], abreviaciones: [], hojasVocab: []
})

// --- reglas de fusión, una por tabla ---

// `marcada` y `fallada` empatan a propósito: las dos son la caja 0 y lo que las separa es
// cuál se tocó más tarde, que es justo el desempate de abajo. Así un fallo en el móvil sigue
// ganándole a una marca vieja del PC, como pasaba con el `en_repaso` de antes.
const ORDEN_PALABRA = { nueva: 0, marcada: 1, fallada: 1, aprendida: 2, dominada: 3 } as const
const cuandoPalabra = (p: PalabraEstado) => Math.max(p.ultimoExamen ?? 0, p.fechaAprendida ?? 0)

function mezclaPalabra(a: PalabraEstado, b: PalabraEstado): PalabraEstado {
  // Gana la que está más adelante en el SRS; a igualdad, la que se tocó más tarde.
  const rangoA = ORDEN_PALABRA[a.estado] ?? 0
  const rangoB = ORDEN_PALABRA[b.estado] ?? 0
  const mejor = rangoA !== rangoB ? (rangoA > rangoB ? a : b)
    : a.cajaSRS !== b.cajaSRS ? (a.cajaSRS > b.cajaSRS ? a : b)
    : cuandoPalabra(a) >= cuandoPalabra(b) ? a : b
  const otra = mejor === a ? b : a
  return {
    ...mejor,
    // los contadores son acumulativos: se queda el mayor de los dos
    fallosTotales: Math.max(a.fallosTotales ?? 0, b.fallosTotales ?? 0),
    fechaAprendida: mejor.fechaAprendida ?? otra.fechaAprendida,
    ultimoExamen: Math.max(a.ultimoExamen ?? 0, b.ultimoExamen ?? 0) || undefined
  }
}

const ORDEN_TEMA = { bloqueado: 0, en_curso: 1, aprobado: 2 } as const

function mezclaNotas(a?: NotasBloque, b?: NotasBloque): NotasBloque | undefined {
  if (!a) return b
  if (!b) return a
  const claves = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof NotasBloque>
  const out: NotasBloque = {}
  for (const k of claves) out[k] = Math.max(a[k] ?? 0, b[k] ?? 0)
  return out
}

function mezclaTema(a: ProgresoTema, b: ProgresoTema): ProgresoTema {
  return {
    temaId: a.temaId,
    estado: (ORDEN_TEMA[a.estado] ?? 0) >= (ORDEN_TEMA[b.estado] ?? 0) ? a.estado : b.estado,
    notaExamenTema: Math.max(a.notaExamenTema ?? 0, b.notaExamenTema ?? 0) || undefined,
    intentos: Math.max(a.intentos ?? 0, b.intentos ?? 0),
    gramaticaCompletada: a.gramaticaCompletada || b.gramaticaCompletada || undefined,
    notas: mezclaNotas(a.notas, b.notas),
    // Las actividades hechas se UNEN: el listening puede haberlo hecho en el celular y la
    // lectura en el PC, y quedarse con una de las dos listas borraría media jornada. Ojo:
    // este objeto se construye campo a campo, así que todo lo que se añada a ProgresoTema
    // hay que fusionarlo aquí o la sincronización lo pierde en silencio.
    hechos: mezclaHechos(a.hechos, b.hechos)
  }
}

function mezclaHechos(a?: string[], b?: string[]): string[] | undefined {
  const unidos = [...new Set([...(a ?? []), ...(b ?? [])])]
  return unidos.length ? unidos : undefined
}

const mezclaBloque = (a: ProgresoBloque, b: ProgresoBloque): ProgresoBloque => ({
  bloqueId: a.bloqueId,
  estado: (ORDEN_TEMA[a.estado] ?? 0) >= (ORDEN_TEMA[b.estado] ?? 0) ? a.estado : b.estado,
  intentos: Math.max(a.intentos ?? 0, b.intentos ?? 0),
  notas: mezclaNotas(a.notas, b.notas)
})

const mezclaNivel = (a: ProgresoNivel, b: ProgresoNivel): ProgresoNivel => ({
  id: a.id,
  estado: (ORDEN_TEMA[a.estado] ?? 0) >= (ORDEN_TEMA[b.estado] ?? 0) ? a.estado : b.estado,
  intentos: Math.max(a.intentos ?? 0, b.intentos ?? 0),
  notaVocab: Math.max(a.notaVocab ?? 0, b.notaVocab ?? 0) || undefined,
  notaGramatica: Math.max(a.notaGramatica ?? 0, b.notaGramatica ?? 0) || undefined,
  notaHabilidades: Math.max(a.notaHabilidades ?? 0, b.notaHabilidades ?? 0) || undefined
})

const mezclaPron = (a: PracticaPron, b: PracticaPron): PracticaPron => ({
  id: a.id,
  fecha: a.fecha >= b.fecha ? a.fecha : b.fecha,
  ultimoPct: Math.max(a.ultimoPct ?? 0, b.ultimoPct ?? 0) || undefined,
  claro: a.claro || b.claro || undefined
})

// Une dos listas por clave aplicando la regla de fusión a los que coinciden.
function une<T>(local: T[], remoto: T[], clave: (x: T) => string | number, mezcla: (a: T, b: T) => T): T[] {
  const mapa = new Map<string | number, T>()
  for (const x of local) mapa.set(clave(x), x)
  for (const x of remoto) {
    const k = clave(x)
    const y = mapa.get(k)
    mapa.set(k, y ? mezcla(y, x) : x)
  }
  return [...mapa.values()]
}

// El historial es un registro, no un estado: se unen los dos y se quitan los repetidos.
// No se puede usar el `id` porque es autoincremental y el 5 de un aparato no es el 5 del
// otro; la identidad real de un examen es qué era, cuándo fue y qué nota sacó.
const claveExamen = (h: HistorialExamen) => `${h.tipo}|${h.ref}|${h.fecha}|${h.nota}`

function mezclaPaquetes(local: Paquete, remoto: Paquete): Paquete {
  return {
    palabras: une(local.palabras, remoto.palabras, (x) => x.id, mezclaPalabra),
    progresoTema: une(local.progresoTema, remoto.progresoTema, (x) => x.temaId, mezclaTema),
    progresoBloque: une(local.progresoBloque, remoto.progresoBloque, (x) => x.bloqueId, mezclaBloque),
    progresoNivel: une(local.progresoNivel, remoto.progresoNivel, (x) => x.id, mezclaNivel),
    practicaPron: une(local.practicaPron, remoto.practicaPron, (x) => x.id, mezclaPron),
    // Marcarla es avanzar y desmarcarla es retroceder, así que gana la marcada, igual que
    // con el resto: sincronizar no puede hacer perder trabajo.
    abreviaciones: une(local.abreviaciones, remoto.abreviaciones, (x) => x.id, (a, b) =>
      a.sabida ? a : b),
    historialExamenes: une(local.historialExamenes, remoto.historialExamenes, claveExamen, (a) => a)
      .map(({ id: _id, ...resto }) => resto as HistorialExamen),
    // El cronograma es una sola fila y se edita a mano: gana el que se guardó más tarde.
    plan: une(local.plan, remoto.plan, (x) => x.id, (a, b) =>
      (a.actualizado ?? 0) >= (b.actualizado ?? 0) ? a : b),
    // Una hoja calificada en un aparato no puede volver a quedar pendiente por la copia del
    // otro: se calificaría dos veces. Entre dos pendientes, la última que se imprimió.
    hojasVocab: une(local.hojasVocab, remoto.hojasVocab, (x) => x.id, (a, b) =>
      a.calificada ? a : b.calificada ? b : a.impresa >= b.impresa ? a : b)
  }
}

// --- lectura y escritura ---

async function leerLocal(): Promise<Paquete> {
  const [palabras, progresoTema, progresoBloque, progresoNivel, historialExamenes, practicaPron, plan,
    abreviaciones, hojasVocab] =
    await Promise.all([
      db.palabras.toArray(), db.progresoTema.toArray(), db.progresoBloque.toArray(),
      db.progresoNivel.toArray(), db.historialExamenes.toArray(), db.practicaPron.toArray(),
      db.plan.toArray(), db.abreviaciones.toArray(), db.hojasVocab.toArray()
    ])
  return { palabras, progresoTema, progresoBloque, progresoNivel, historialExamenes, practicaPron, plan,
    abreviaciones, hojasVocab }
}

async function escribirLocal(p: Paquete): Promise<void> {
  await db.transaction('rw', [db.palabras, db.progresoTema, db.progresoBloque, db.progresoNivel,
    db.historialExamenes, db.practicaPron, db.plan, db.abreviaciones, db.hojasVocab], async () => {
    await db.palabras.bulkPut(p.palabras)
    await db.progresoTema.bulkPut(p.progresoTema)
    await db.progresoBloque.bulkPut(p.progresoBloque)
    await db.progresoNivel.bulkPut(p.progresoNivel)
    await db.practicaPron.bulkPut(p.practicaPron)
    await db.plan.bulkPut(p.plan)
    await db.abreviaciones.bulkPut(p.abreviaciones)
    await db.hojasVocab.bulkPut(p.hojasVocab)
    // el historial se reescribe entero porque las claves se renumeran al unir
    await db.historialExamenes.clear()
    await db.historialExamenes.bulkAdd(p.historialExamenes)
  })
}

const ref = (uid: string, rama: Rama | 'reinicio') => doc(getDbRemota()!, 'usuarios', uid, 'estado', rama)

// --- reinicio ---
//
// La fusión es una UNIÓN que nunca borra, así que un reinicio no se puede propagar vaciando
// cosas: vaciar la nube no basta (2026-09-14, él: "no me reinició el curso"), porque el OTRO
// aparato sigue lleno y en su siguiente sincronización lo vuelve a subir todo. Por eso el
// reinicio deja una MARCA en la nube (`estado/reinicio`, con su fecha) y cada rama se escribe
// con la marca que conocía quien la escribió. Un aparato que encuentra una marca distinta a la
// suya se vacía antes de fusionar, y una rama escrita con una marca vieja —la sincronización
// que el otro aparato tenía a medias cuando se reinició— se ignora al leer.

const claveReinicio = (uid: string) => `idiomas:reinicio:${uid}`
const reinicioConocido = (uid: string) => Number(localStorage.getItem(claveReinicio(uid)) ?? 0)
const apuntarReinicio = (uid: string, fecha: number) => localStorage.setItem(claveReinicio(uid), String(fecha))

// Recorre `db.tables` en vez de nombrarlas: al añadir `abreviaciones` (v5) la lista escrita a
// mano se quedó atrás y el reinicio dejaba vivas las marcadas.
async function vaciarLocal(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
}

// Marca y ramas vacías en un solo lote: o se escribe todo o nada, y sin red no se toca nada.
export async function reiniciarRemoto(uid: string): Promise<number> {
  const fecha = Date.now()
  const lote = writeBatch(getDbRemota()!)
  lote.set(ref(uid, 'reinicio'), { fecha })
  for (const rama of RAMAS) lote.set(ref(uid, rama), { items: [], actualizado: fecha, reinicio: fecha })
  await lote.commit()
  return fecha
}

// La marca local se apunta DESPUÉS de vaciar: si el vaciado fallara, la siguiente
// sincronización vería una marca distinta y terminaría el trabajo.
export async function reiniciarLocal(uid?: string, fecha?: number): Promise<void> {
  await vaciarLocal()
  if (uid && fecha) apuntarReinicio(uid, fecha)
}

interface Remoto {
  paquete: Paquete
  reinicio: number
}

async function leerRemoto(uid: string): Promise<Remoto> {
  const out = vacio()
  const [marca, ...docs] = await Promise.all([getDoc(ref(uid, 'reinicio')), ...RAMAS.map((r) => getDoc(ref(uid, r)))])
  const reinicio = marca.exists() ? Number(marca.data().fecha ?? 0) : 0
  RAMAS.forEach((rama, i) => {
    const d = docs[i]
    if (d.exists() && Number(d.data().reinicio ?? 0) === reinicio) out[rama] = (d.data().items ?? []) as never[]
  })
  return { paquete: out, reinicio }
}

async function escribirRemoto(uid: string, p: Paquete, reinicio: number): Promise<void> {
  const ahora = Date.now()
  await Promise.all(
    RAMAS.map((rama) => setDoc(ref(uid, rama), { items: p[rama], actualizado: ahora, reinicio }))
  )
}

export interface ResultadoSync {
  ok: boolean
  cuando: number
  error?: string
  /** Se reinició el curso en otro aparato y aquí se acaba de vaciar la base. */
  vaciado?: boolean
}

// Sincroniza en los dos sentidos. Es segura de llamar varias veces: la fusión es
// idempotente, así que sincronizar dos veces seguidas da el mismo resultado.
export async function sincronizar(uid: string): Promise<ResultadoSync> {
  if (!getDbRemota()) return { ok: false, cuando: Date.now(), error: 'Firebase no está configurado' }
  let vaciado = false
  try {
    const remoto = await leerRemoto(uid)
    if (remoto.reinicio !== reinicioConocido(uid)) {
      // Sin marca en la nube no hay reinicio que aplicar (alguien la borró a mano): solo se adopta.
      if (remoto.reinicio) {
        await vaciarLocal()
        vaciado = true
      }
      apuntarReinicio(uid, remoto.reinicio)
    }
    const unido = mezclaPaquetes(await leerLocal(), remoto.paquete)
    await escribirLocal(unido)
    await escribirRemoto(uid, unido, remoto.reinicio)
    const cuando = Date.now()
    localStorage.setItem(CLAVE_ULTIMO, String(cuando))
    return { ok: true, cuando, vaciado }
  } catch (e) {
    return { ok: false, cuando: Date.now(), error: e instanceof Error ? e.message : String(e), vaciado }
  }
}

const CLAVE_ULTIMO = 'idiomas:ultimaSync'

export function ultimaSync(): number | null {
  const v = localStorage.getItem(CLAVE_ULTIMO)
  return v ? Number(v) : null
}

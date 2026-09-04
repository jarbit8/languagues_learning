import { doc, getDoc, setDoc } from 'firebase/firestore/lite'
import { db } from '../db'
import { getDbRemota } from './firebase'
import type {
  HistorialExamen,
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

const RAMAS = ['palabras', 'progresoTema', 'progresoBloque', 'progresoNivel', 'historialExamenes', 'practicaPron', 'plan'] as const
type Rama = (typeof RAMAS)[number]

interface Paquete {
  palabras: PalabraEstado[]
  progresoTema: ProgresoTema[]
  progresoBloque: ProgresoBloque[]
  progresoNivel: ProgresoNivel[]
  historialExamenes: HistorialExamen[]
  practicaPron: PracticaPron[]
  plan: PlanEstudio[]
}

const vacio = (): Paquete => ({
  palabras: [], progresoTema: [], progresoBloque: [], progresoNivel: [],
  historialExamenes: [], practicaPron: [], plan: []
})

// --- reglas de fusión, una por tabla ---

const ORDEN_PALABRA = { nueva: 0, aprendida: 1, en_repaso: 2, dominada: 3 } as const
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
    notas: mezclaNotas(a.notas, b.notas)
  }
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
    historialExamenes: une(local.historialExamenes, remoto.historialExamenes, claveExamen, (a) => a)
      .map(({ id: _id, ...resto }) => resto as HistorialExamen),
    // El cronograma es una sola fila y se edita a mano: gana el que se guardó más tarde.
    plan: une(local.plan, remoto.plan, (x) => x.id, (a, b) =>
      (a.actualizado ?? 0) >= (b.actualizado ?? 0) ? a : b)
  }
}

// --- lectura y escritura ---

async function leerLocal(): Promise<Paquete> {
  const [palabras, progresoTema, progresoBloque, progresoNivel, historialExamenes, practicaPron, plan] =
    await Promise.all([
      db.palabras.toArray(), db.progresoTema.toArray(), db.progresoBloque.toArray(),
      db.progresoNivel.toArray(), db.historialExamenes.toArray(), db.practicaPron.toArray(),
      db.plan.toArray()
    ])
  return { palabras, progresoTema, progresoBloque, progresoNivel, historialExamenes, practicaPron, plan }
}

async function escribirLocal(p: Paquete): Promise<void> {
  await db.transaction('rw', [db.palabras, db.progresoTema, db.progresoBloque, db.progresoNivel,
    db.historialExamenes, db.practicaPron, db.plan], async () => {
    await db.palabras.bulkPut(p.palabras)
    await db.progresoTema.bulkPut(p.progresoTema)
    await db.progresoBloque.bulkPut(p.progresoBloque)
    await db.progresoNivel.bulkPut(p.progresoNivel)
    await db.practicaPron.bulkPut(p.practicaPron)
    await db.plan.bulkPut(p.plan)
    // el historial se reescribe entero porque las claves se renumeran al unir
    await db.historialExamenes.clear()
    await db.historialExamenes.bulkAdd(p.historialExamenes)
  })
}

const ref = (uid: string, rama: Rama) => doc(getDbRemota()!, 'usuarios', uid, 'estado', rama)

async function leerRemoto(uid: string): Promise<Paquete> {
  const out = vacio()
  const docs = await Promise.all(RAMAS.map((r) => getDoc(ref(uid, r))))
  RAMAS.forEach((rama, i) => {
    const d = docs[i]
    if (d.exists()) out[rama] = (d.data().items ?? []) as never[]
  })
  return out
}

async function escribirRemoto(uid: string, p: Paquete): Promise<void> {
  const ahora = Date.now()
  await Promise.all(
    RAMAS.map((rama) => setDoc(ref(uid, rama), { items: p[rama], actualizado: ahora }))
  )
}

export interface ResultadoSync {
  ok: boolean
  cuando: number
  error?: string
}

// Sincroniza en los dos sentidos. Es segura de llamar varias veces: la fusión es
// idempotente, así que sincronizar dos veces seguidas da el mismo resultado.
export async function sincronizar(uid: string): Promise<ResultadoSync> {
  if (!getDbRemota()) return { ok: false, cuando: Date.now(), error: 'Firebase no está configurado' }
  try {
    const [local, remoto] = await Promise.all([leerLocal(), leerRemoto(uid)])
    const unido = mezclaPaquetes(local, remoto)
    await escribirLocal(unido)
    await escribirRemoto(uid, unido)
    const cuando = Date.now()
    localStorage.setItem(CLAVE_ULTIMO, String(cuando))
    return { ok: true, cuando }
  } catch (e) {
    return { ok: false, cuando: Date.now(), error: e instanceof Error ? e.message : String(e) }
  }
}

const CLAVE_ULTIMO = 'idiomas:ultimaSync'

export function ultimaSync(): number | null {
  const v = localStorage.getItem(CLAVE_ULTIMO)
  return v ? Number(v) : null
}

import { db } from '../db'
import type { HojaVocab } from '../types'
import { idsExamenDiario } from './examenDiario'
import { registrarResultado } from './srs'
import { inicioDeHoy } from './fechas'
import { baraja } from './preguntas'
import { fechaCorta } from './plan'
import { sincronizarPronto } from './autosync'
import { existeConcepto } from '../data/packs'

// EXAMEN DIARIO EN PAPEL (2026-09-13, él: "que se imprima una hoja del vocabulario... al día
// siguiente diré cuáles fallé"). Salen las mismas palabras que el examen diario de la app; se
// imprimen, las responde a mano y al día siguiente marca en la app cuáles falló.
//
// Los repasos se cuentan desde el DÍA DE LA HOJA y no desde el día en que se califica: si no,
// una fallada volvería pasado mañana en vez de salir esa misma noche junto con las nuevas, y
// una acertada ganaría un día de más.

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export function nombreDeHoja(fecha: number): string {
  return `${DIAS[new Date(fecha).getDay()]} ${fechaCorta(fecha)}`
}

// La más vieja sin calificar. Mientras haya una de un día anterior no se imprime otra: sus
// palabras siguen vencidas y saldrían repetidas en la hoja nueva.
export async function hojaPendiente(): Promise<HojaVocab | undefined> {
  const pendientes = (await db.hojasVocab.toArray()).filter((h) => !h.calificada)
  return pendientes.sort((a, b) => a.fecha - b.fecha)[0]
}

// Si hoy ya se imprimió, se respeta el orden de lo impreso y lo marcado después va al final.
export async function palabrasDeHojaDeHoy(): Promise<string[]> {
  const hoy = inicioDeHoy()
  const pool = await idsExamenDiario()
  const hoja = (await db.hojasVocab.toArray()).find((h) => h.fecha === hoy && !h.calificada)
  const previas = hoja ? hoja.ids.filter((id) => pool.includes(id)) : []
  return [...previas, ...baraja(pool.filter((id) => !previas.includes(id)))]
}

export async function guardarHoja(ids: string[]): Promise<void> {
  const hoy = inicioDeHoy()
  const ahora = Date.now()
  const hoja = (await db.hojasVocab.toArray()).find((h) => h.fecha === hoy && !h.calificada)
  await db.hojasVocab.put(hoja ? { ...hoja, ids, impresa: ahora } : { id: `h-${ahora}`, fecha: hoy, impresa: ahora, ids })
  sincronizarPronto()
}

// Una palabra que ya se respondió en la app después de imprimir no se vuelve a calificar:
// contaría dos veces el mismo repaso.
export async function filasParaCalificar(hoja: HojaVocab): Promise<{ id: string; yaRespondida: boolean }[]> {
  const ids = hoja.ids.filter(existeConcepto)
  const filas = await db.palabras.bulkGet(ids)
  return ids.map((id, i) => ({ id, yaRespondida: !filas[i] || (filas[i]!.ultimoExamen ?? 0) > hoja.impresa }))
}

export async function calificarHoja(hoja: HojaVocab, falladas: Set<string>): Promise<{ aciertos: number; total: number }> {
  const ahora = Date.now()
  let aciertos = 0
  let total = 0
  for (const { id, yaRespondida } of await filasParaCalificar(hoja)) {
    if (yaRespondida) continue
    const acierto = !falladas.has(id)
    await registrarResultado(id, acierto, hoja.fecha)
    await db.palabras.update(id, { ultimoExamen: ahora })
    total++
    if (acierto) aciertos++
  }
  await db.hojasVocab.update(hoja.id, { calificada: ahora })
  sincronizarPronto()
  return { aciertos, total }
}

export async function descartarHoja(hoja: HojaVocab): Promise<void> {
  await db.hojasVocab.update(hoja.id, { calificada: Date.now(), descartada: true })
  sincronizarPronto()
}

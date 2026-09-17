import { db } from '../db'
import { esHoy } from './fechas'
import { existeConcepto } from '../data/packs'

// IDs a evaluar: marcadas HOY aún no examinadas hoy + repasos SRS vencidos. Desde el
// 2026-09-13 el examen diario se hace solo en papel (lib/hojaVocab.ts); la versión en la app,
// con su constructor de preguntas, está en git hasta el commit e315b37.
export async function idsExamenDiario(): Promise<string[]> {
  const ahora = Date.now()
  const todas = await db.palabras.toArray()
  const ids = new Set<string>()
  for (const p of todas) {
    if (!existeConcepto(p.id)) continue
    const marcadaHoy = esHoy(p.fechaAprendida) && !esHoy(p.ultimoExamen)
    const repasoVencido = p.proximoRepaso !== undefined && p.proximoRepaso <= ahora
    if (marcadaHoy || repasoVencido) ids.add(p.id)
  }
  return [...ids]
}

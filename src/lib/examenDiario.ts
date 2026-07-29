import { db } from '../db'
import { conceptoPorId } from '../data/packs'
import { esHoy } from './fechas'
import { baraja, preguntaSignificadoEscrito } from './preguntas'
import type { Pregunta } from '../types'

// IDs a evaluar: marcadas HOY aún no examinadas hoy + repasos SRS vencidos.
export async function idsExamenDiario(): Promise<string[]> {
  const ahora = Date.now()
  const todas = await db.palabras.toArray()
  const ids = new Set<string>()
  for (const p of todas) {
    const marcadaHoy = esHoy(p.fechaAprendida) && !esHoy(p.ultimoExamen)
    const repasoVencido = p.proximoRepaso !== undefined && p.proximoRepaso <= ahora
    if (marcadaHoy || repasoVencido) ids.add(p.id)
  }
  return [...ids]
}

// Un solo tipo de pregunta (decisión del usuario): ve la palabra en el idioma que estudia
// y escribe su significado en español. Los exámenes de tema/bloque/final siguen variando tipos.
export async function construirExamenDiario(): Promise<Pregunta[]> {
  const ids = await idsExamenDiario()
  const preguntas: Pregunta[] = []
  for (const id of baraja(ids)) {
    const encontrado = conceptoPorId(id)
    if (encontrado) preguntas.push(preguntaSignificadoEscrito(encontrado.concepto))
  }
  return preguntas
}

// Marca que estas palabras ya se examinaron hoy (para no repetirlas en el mismo día).
export async function marcarExaminadasHoy(ids: string[]) {
  const ahora = Date.now()
  await Promise.all(ids.map((id) => db.palabras.update(id, { ultimoExamen: ahora })))
}

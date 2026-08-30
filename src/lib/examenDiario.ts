import { db } from '../db'
import { conceptoPorId } from '../data/packs'
import { esHoy } from './fechas'
import { baraja, preguntaPorCaja } from './preguntas'
import type { Pregunta } from '../types'

// Palabras a evaluar: marcadas HOY aún no examinadas + repasos SRS vencidos. Se devuelve
// también la caja, porque de ella depende CÓMO se pregunta (ver preguntaPorCaja).
async function palabrasDelDia(): Promise<{ id: string; caja: number }[]> {
  const ahora = Date.now()
  const todas = await db.palabras.toArray()
  const salida = new Map<string, number>()
  for (const p of todas) {
    const marcadaHoy = esHoy(p.fechaAprendida) && !esHoy(p.ultimoExamen)
    const repasoVencido = p.proximoRepaso !== undefined && p.proximoRepaso <= ahora
    if (marcadaHoy || repasoVencido) salida.set(p.id, p.cajaSRS)
  }
  return [...salida].map(([id, caja]) => ({ id, caja }))
}

export async function idsExamenDiario(): Promise<string[]> {
  return (await palabrasDelDia()).map((p) => p.id)
}

// La dificultad sube con la caja del SRS: reconocer (1), producir (2) y al oído (3).
// Antes se preguntaba siempre en la dirección fácil y eso daba falsa sensación de saber
// la palabra. Los exámenes de tema/bloque/final siguen mezclando sus 4 tipos.
export async function construirExamenDiario(): Promise<Pregunta[]> {
  const preguntas: Pregunta[] = []
  for (const { id, caja } of baraja(await palabrasDelDia())) {
    const encontrado = conceptoPorId(id)
    if (encontrado) preguntas.push(preguntaPorCaja(encontrado.concepto, caja))
  }
  return preguntas
}

// Marca que estas palabras ya se examinaron hoy (para no repetirlas en el mismo día).
export async function marcarExaminadasHoy(ids: string[]) {
  const ahora = Date.now()
  await Promise.all(ids.map((id) => db.palabras.update(id, { ultimoExamen: ahora })))
}

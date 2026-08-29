import { db } from '../db'
import { conceptoPorId, getVocabPack } from '../data/packs'
import { inicioDeHoy, UN_DIA } from './fechas'
import { baraja, preguntaSignificadoEscrito } from './preguntas'
import type { Pregunta } from '../types'

// Módulo de examen de VOCABULARIO. Dos ciclos, atados al TEMA y no al día de la semana
// (2026-08-29, corrección del usuario): un tema son 2 días, así que el segundo día toca
// examinarse de TODO su vocabulario. Antes esto iba por días fijos (martes/jueves/sábado)
// y había además uno semanal; se quitó el semanal porque el examen de bloque ya cierra el
// repaso largo, y ahora tiene su propio día entero en el plan.
//
//   diario   todos los días · lo que marcaste ese día
//   tema     el 2º día del tema · TODAS las palabras de ese tema
//
// Ninguno de los dos aprueba ni desbloquea nada: son entrenamiento. La puerta sigue siendo
// el examen de tema de 6 secciones.

export type CicloVocab = 'diario' | 'tema'

export const CICLOS: { id: CicloVocab; titulo: string; icono: string }[] = [
  { id: 'diario', titulo: 'Diario', icono: '📅' },
  { id: 'tema', titulo: 'Del tema', icono: '🔁' }
]

// Las palabras que marcaste HOY (el diario las cruza además con los repasos vencidos).
export async function idsDeHoy(): Promise<string[]> {
  const desde = inicioDeHoy()
  const hasta = desde + UN_DIA
  const palabras = await db.palabras.toArray()
  return palabras
    .filter((p) => p.fechaAprendida !== undefined && p.fechaAprendida >= desde && p.fechaAprendida < hasta)
    .map((p) => p.id)
}

// Todas las palabras del tema que ya estén marcadas como aprendidas. Se mira el TEMA y no
// una ventana de días: si un día se te tuerce y el tema te lleva tres, sigue funcionando.
export async function idsDelTema(tema: number): Promise<string[]> {
  const pack = getVocabPack(tema)
  if (!pack) return []
  const delTema = new Set(pack.conceptos.map((c) => c.id))
  const palabras = await db.palabras.toArray()
  return palabras.filter((p) => delTema.has(p.id) && p.estado === 'aprendida').map((p) => p.id)
}

export async function construirExamenDelTema(tema: number): Promise<Pregunta[]> {
  const ids = await idsDelTema(tema)
  const preguntas: Pregunta[] = []
  for (const id of baraja(ids)) {
    const encontrado = conceptoPorId(id)
    // Mismo tipo que el diario (decisión del usuario): ve la palabra en inglés y escribe
    // su significado en español.
    if (encontrado) preguntas.push(preguntaSignificadoEscrito(encontrado.concepto))
  }
  return preguntas
}

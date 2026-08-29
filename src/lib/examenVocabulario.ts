import { db } from '../db'
import { conceptoPorId } from '../data/packs'
import { UN_DIA, inicioDeHoy } from './fechas'
import { baraja, preguntaSignificadoEscrito } from './preguntas'
import type { Pregunta } from '../types'

// Módulo de examen de VOCABULARIO: tres ciclos sobre las palabras que marcaste "aprendida",
// según cuándo las marcaste.
//
//   diario     todos los días · lo de ESE día
//   2 días     martes (lun+mar) · jueves (mié+jue) · sábado (vie+sáb)
//   semanal    domingo · toda la semana, de lunes a domingo
//
// OJO, esto SÍ usa calendario, a diferencia del resto del curso (regla 1 de CLAUDE.md:
// la PROGRESIÓN es por dominio, sin fechas). Es deliberado y pedido por el usuario: aquí no
// se desbloquea nada ni se aprueba nada, es un calendario de REPASO, la misma idea que ya
// usa el SRS con sus +1/+3/+7 días. Ningún ciclo bloquea el avance del curso.

export type CicloVocab = 'diario' | 'dos_dias' | 'semanal'

export const CICLOS: { id: CicloVocab; titulo: string; icono: string; cuando: string }[] = [
  { id: 'diario', titulo: 'Diario', icono: '📅', cuando: 'todos los días' },
  { id: 'dos_dias', titulo: 'De 2 días', icono: '🔁', cuando: 'martes, jueves y sábado' },
  { id: 'semanal', titulo: 'Semanal', icono: '🗓️', cuando: 'domingo' }
]

// Lunes 00:00 de la semana en curso. El domingo cierra su semana, no abre la siguiente,
// así que cuenta como el día 7 y no como el día 1.
export function inicioSemana(t = Date.now()): number {
  const hoy = inicioDeHoy(t)
  const diaSemana = new Date(hoy).getDay() // 0 domingo … 6 sábado
  const desdeLunes = diaSemana === 0 ? 6 : diaSemana - 1
  return hoy - desdeLunes * UN_DIA
}

// Qué días toca cada ciclo. El diario siempre; los otros, en su día.
export function tocaHoy(ciclo: CicloVocab, t = Date.now()): boolean {
  const dia = new Date(inicioDeHoy(t)).getDay()
  if (ciclo === 'diario') return true
  if (ciclo === 'dos_dias') return dia === 2 || dia === 4 || dia === 6 // mar, jue, sáb
  return dia === 0 // domingo
}

export function proximoDia(ciclo: CicloVocab): string {
  if (ciclo === 'dos_dias') return 'martes, jueves y sábados'
  if (ciclo === 'semanal') return 'domingos'
  return 'hoy'
}

// Desde cuándo cuentan las palabras de cada ciclo.
function desde(ciclo: CicloVocab, t = Date.now()): number {
  if (ciclo === 'diario') return inicioDeHoy(t)
  if (ciclo === 'dos_dias') return inicioDeHoy(t) - UN_DIA // ayer y hoy
  return inicioSemana(t)
}

// Las palabras marcadas "aprendida" dentro de la ventana del ciclo. A diferencia del
// diario, los ciclos largos NO miran `ultimoExamen`: su gracia es volver a preguntar lo
// mismo unos días después, así que repetirlo es justo el objetivo.
export async function idsDelCiclo(ciclo: CicloVocab, t = Date.now()): Promise<string[]> {
  const inicio = desde(ciclo, t)
  const finDeHoy = inicioDeHoy(t) + UN_DIA
  const palabras = await db.palabras.toArray()
  return palabras
    .filter((p) => p.fechaAprendida !== undefined && p.fechaAprendida >= inicio && p.fechaAprendida < finDeHoy)
    .map((p) => p.id)
}

export async function construirExamenCiclo(ciclo: CicloVocab, t = Date.now()): Promise<Pregunta[]> {
  const ids = await idsDelCiclo(ciclo, t)
  const preguntas: Pregunta[] = []
  for (const id of baraja(ids)) {
    const encontrado = conceptoPorId(id)
    // Mismo tipo que el diario (decisión del usuario): ve la palabra en inglés y escribe
    // su significado en español. Es el módulo de vocabulario, no cambia de formato.
    if (encontrado) preguntas.push(preguntaSignificadoEscrito(encontrado.concepto))
  }
  return preguntas
}

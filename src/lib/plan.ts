import { db } from '../db'
import { vocabPacks } from '../data/packs'
import { UN_DIA, inicioDeHoy } from './fechas'
import type { PlanEstudio } from '../types'

// Cronograma del nivel: 2 días por tema → 48 días para los 24 temas.
//
// Es una GUÍA y nada más. Choca de frente con la regla 1 (ritmo libre, sin calendario), así
// que lo importante es lo que NO hace: no desbloquea temas, no los cierra, no caduca nada y
// no aparece si no lo activas. Solo responde a "¿voy al día?". Quien decide si avanzas sigue
// siendo el examen de tema.

export const ID_PLAN = 'a1'
export const DIAS_POR_TEMA = 2
export const TEMAS_POR_BLOQUE = 6
// Cada bloque son sus 6 temas (2 días cada uno) MÁS un día suelto solo para su examen:
// el de bloque son ~115 preguntas y no cabe pegado al final de un día de estudio.
export const DIAS_POR_BLOQUE = TEMAS_POR_BLOQUE * DIAS_POR_TEMA + 1 // 13

export const totalTemas = () => vocabPacks.length
export const totalBloques = () => Math.ceil(totalTemas() / TEMAS_POR_BLOQUE)
// El examen final ocupa 2 días: son 230 preguntas objetivas más writing y speaking, y
// pretender que eso entra en una tarde es cómo se acaba haciéndolo a medias.
export const DIAS_FINAL = 2
// 4 bloques x 13 días + 2 días de examen final.
export const diasDelPlan = () => totalBloques() * DIAS_POR_BLOQUE + DIAS_FINAL

export type Jornada =
  | { tipo: 'tema'; tema: number; diaDelTema: number }
  | { tipo: 'bloque'; bloque: number }
  | { tipo: 'final'; diaDelFinal: number }

// Qué toca el día N del plan. Los días van: 6 temas de 2 días, luego el examen de bloque,
// y así 4 veces; el último día es el examen final del nivel.
export function jornadaDelDia(dia: number): Jornada {
  const diasDeTemas = totalBloques() * DIAS_POR_BLOQUE
  if (dia > diasDeTemas) return { tipo: 'final', diaDelFinal: Math.min(DIAS_FINAL, dia - diasDeTemas) }
  const bloquesCerrados = Math.floor((dia - 1) / DIAS_POR_BLOQUE)
  const dentro = (dia - 1) % DIAS_POR_BLOQUE
  if (dentro === DIAS_POR_BLOQUE - 1) return { tipo: 'bloque', bloque: bloquesCerrados + 1 }
  const tema = bloquesCerrados * TEMAS_POR_BLOQUE + Math.floor(dentro / DIAS_POR_TEMA) + 1
  if (tema > totalTemas()) return { tipo: 'final', diaDelFinal: 1 }
  return { tipo: 'tema', tema, diaDelTema: (dentro % DIAS_POR_TEMA) + 1 }
}

// El primer día del plan que le toca a un tema (para pintar sus fechas en el temario).
export function primerDiaDeTema(tema: number): number {
  const bloque = Math.floor((tema - 1) / TEMAS_POR_BLOQUE)
  const dentro = (tema - 1) % TEMAS_POR_BLOQUE
  return bloque * DIAS_POR_BLOQUE + dentro * DIAS_POR_TEMA + 1
}

export function diaDeExamenDeBloque(bloque: number): number {
  return bloque * DIAS_POR_BLOQUE
}

export async function getPlan(): Promise<PlanEstudio | undefined> {
  return db.plan.get(ID_PLAN)
}

export async function empezarPlan(fechaInicio = Date.now()) {
  await db.plan.put({ id: ID_PLAN, fechaInicio: inicioDeHoy(fechaInicio), diasPorTema: DIAS_POR_TEMA })
}

export async function borrarPlan() {
  await db.plan.delete(ID_PLAN)
}

export interface EstadoPlan {
  dia: number
  totalDias: number
  jornada: Jornada
  fechaFin: number
  /** Diferencia entre el tema real y el que tocaría hoy: 0 al día, negativo atrasado. */
  desfase: number
  terminado: boolean
}

export function estadoDelPlan(plan: PlanEstudio, temaReal: number, ahora = Date.now()): EstadoPlan {
  const totalDias = diasDelPlan()
  const transcurridos = Math.floor((inicioDeHoy(ahora) - plan.fechaInicio) / UN_DIA)
  const dia = Math.max(1, transcurridos + 1)
  const jornada = jornadaDelDia(Math.min(dia, totalDias))
  const temaPlanificado = jornada.tipo === 'tema' ? jornada.tema : totalTemas()
  return {
    dia,
    totalDias,
    jornada,
    fechaFin: plan.fechaInicio + (totalDias - 1) * UN_DIA,
    desfase: temaReal - temaPlanificado,
    terminado: dia > totalDias
  }
}

// Los días que le tocan a un tema, para pintarlos en el temario.
export function diasDeTema(plan: PlanEstudio, tema: number): { desde: number; hasta: number } {
  const primero = primerDiaDeTema(tema)
  return {
    desde: plan.fechaInicio + (primero - 1) * UN_DIA,
    hasta: plan.fechaInicio + (primero - 2 + DIAS_POR_TEMA) * UN_DIA
  }
}

export function fechaExamenDeBloque(plan: PlanEstudio, bloque: number): number {
  return plan.fechaInicio + (diaDeExamenDeBloque(bloque) - 1) * UN_DIA
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function fechaCorta(t: number): string {
  const d = new Date(t)
  return `${d.getDate()} ${MESES[d.getMonth()]}`
}

export const cierraBloque = (tema: number) => tema % TEMAS_POR_BLOQUE === 0

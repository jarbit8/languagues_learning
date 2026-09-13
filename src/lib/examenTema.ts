import { getGramatica } from '../data/packs'
import { baraja, preguntaDeEjercicio } from './preguntas'
import type { Pregunta } from '../types'

export interface ExamenTema {
  gramatica: Pregunta[]
}

// Gramática COMPLETA (todos los ejercicios del pack del tema), puntuada por su cuenta.
// El vocabulario salió del examen de tema el 2026-09-13 (él: "ya no entra al examen de temas,
// entra nomás al examen del bloque"): las palabras van por el examen diario en papel.
export function construirExamenTema(tema: number): ExamenTema {
  return { gramatica: baraja((getGramatica(tema)?.ejercicios ?? []).map(preguntaDeEjercicio)) }
}

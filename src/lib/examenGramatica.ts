import { getGramatica } from '../data/packs'
import { baraja, preguntaDeEjercicio } from './preguntas'
import type { Pregunta } from '../types'

// Módulo de examen de GRAMÁTICA: un examen por cada tema, con TODOS sus ejercicios.
// No es una muestra — el pack de un tema trae hoy entre 15 y 25 ejercicios y entran todos,
// que es lo que pidió el usuario ("que sea muy completo").
//
// Convive con la sección de gramática del examen de tema y no la sustituye: aquella es la
// PUERTA para desbloquear el tema siguiente (80% y se registra), y esta es entrenamiento
// libre, repetible y sobre cualquier tema ya abierto, sin nota que se guarde.

export function ejerciciosDe(tema: number): number {
  return getGramatica(tema)?.ejercicios.length ?? 0
}

export function construirExamenGramaticaTema(tema: number): Pregunta[] {
  return baraja((getGramatica(tema)?.ejercicios ?? []).map(preguntaDeEjercicio))
}

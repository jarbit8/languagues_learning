import { getVocabPack, getGramatica } from '../data/packs'
import { baraja, preguntaDeConcepto, preguntaDeEjercicio } from './preguntas'
import type { Pregunta } from '../types'

export interface ExamenTema {
  vocab: Pregunta[]
  gramatica: Pregunta[]
}

// Examen de tema en dos secciones que se puntúan por separado.
// Gramática entra COMPLETA (los 15 ejercicios del pack del tema): antes se tomaban 10 al
// azar mezclados con vocabulario, así que se podía aprobar el tema con la gramática floja
// porque el vocabulario arrastraba la nota. Ahora cada sección se aprueba por su cuenta.
export function construirExamenTema(tema: number): ExamenTema {
  // Vocabulario COMPLETO del tema (~31-38 palabras), no una muestra de 20: para desbloquear
  // el tema hay que demostrar todas las palabras que se marcaron como aprendidas, no unas pocas.
  const pack = getVocabPack(tema)
  const vocab = baraja(pack?.conceptos ?? []).map(preguntaDeConcepto)

  const gramatica = baraja((getGramatica(tema)?.ejercicios ?? []).map(preguntaDeEjercicio))

  return { vocab, gramatica }
}

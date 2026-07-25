import { getVocabPack, getGramatica } from '../data/packs'
import { IDIOMAS_ACTIVOS } from '../config'
import { baraja, preguntaDeConcepto, preguntaDeEjercicio } from './preguntas'
import type { Pregunta } from '../types'

export interface ExamenTema {
  vocab: Pregunta[]
  gramatica: Pregunta[]
}

// Examen de tema en dos secciones que se puntúan por separado.
// Gramática entra COMPLETA (los 15 ejercicios de cada idioma activo): antes se tomaban 10 al
// azar mezclados con vocabulario, así que se podía aprobar el tema con la gramática floja
// porque el vocabulario arrastraba la nota. Ahora cada sección se aprueba por su cuenta.
export function construirExamenTema(tema: number): ExamenTema {
  const pack = getVocabPack(tema)
  const vocab = baraja(pack?.conceptos ?? [])
    .slice(0, 20)
    .map(preguntaDeConcepto)

  const gramatica = baraja(
    IDIOMAS_ACTIVOS.flatMap((idioma) =>
      (getGramatica(tema, idioma)?.ejercicios ?? []).map((e) => preguntaDeEjercicio(e, idioma))
    )
  )

  return { vocab, gramatica }
}

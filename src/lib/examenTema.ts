import { getVocabPack, getGramatica } from '../data/packs'
import { IDIOMAS_ACTIVOS } from '../config'
import { baraja, preguntaDeConcepto, preguntaDeEjercicio } from './preguntas'
import type { Pregunta } from '../types'

// Examen de tema: 20 preguntas de vocabulario + 10 de gramática, repartidas entre los
// idiomas activos (10 si solo hay uno; 5+5 si se estudian los dos en paralelo).
export function construirExamenTema(tema: number): Pregunta[] {
  const pack = getVocabPack(tema)
  const vocab = baraja(pack?.conceptos ?? [])
    .slice(0, 20)
    .map(preguntaDeConcepto)

  const porIdioma = Math.max(1, Math.round(10 / IDIOMAS_ACTIVOS.length))
  const gramatica = IDIOMAS_ACTIVOS.flatMap((idioma) =>
    baraja(getGramatica(tema, idioma)?.ejercicios ?? [])
      .slice(0, porIdioma)
      .map((e) => preguntaDeEjercicio(e, idioma))
  )

  return baraja([...vocab, ...gramatica])
}

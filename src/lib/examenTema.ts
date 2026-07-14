import { getVocabPack, getGramatica } from '../data/packs'
import { baraja, preguntaDeConcepto, preguntaDeEjercicio } from './preguntas'
import type { Pregunta } from '../types'

// Examen de tema: 20 preguntas de vocabulario + 10 de gramática (5 por idioma).
export function construirExamenTema(tema: number): Pregunta[] {
  const pack = getVocabPack(tema)
  const vocab = baraja(pack?.conceptos ?? [])
    .slice(0, 20)
    .map(preguntaDeConcepto)

  const gramEn = getGramatica(tema, 'en')
  const gramFr = getGramatica(tema, 'fr')
  const ejEn = baraja(gramEn?.ejercicios ?? [])
    .slice(0, 5)
    .map((e) => preguntaDeEjercicio(e, 'en'))
  const ejFr = baraja(gramFr?.ejercicios ?? [])
    .slice(0, 5)
    .map((e) => preguntaDeEjercicio(e, 'fr'))

  return baraja([...vocab, ...ejEn, ...ejFr])
}

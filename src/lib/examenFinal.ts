import type { Pregunta, ListeningPack, ReadingPack, DialogoConTema } from '../types'
import { vocabPacks, getListening, getReading, dialogosDe } from '../data/packs'
import { baraja, preguntaDeConcepto, preguntaDeListening } from './preguntas'

// 100 palabras aleatorias de todo el nivel A1 (skill exam-engine: examen final).
export function construirVocabFinal(): Pregunta[] {
  const todos = vocabPacks.flatMap((p) => p.conceptos)
  return baraja(todos)
    .slice(0, 100)
    .map(preguntaDeConcepto)
}

export interface SeccionListening {
  dialogos: DialogoConTema[]
  preguntas: Pregunta[]
}

// Versión extendida: un pack por bloque, alternando idioma.
export function construirListeningFinal(): SeccionListening {
  const pares: [number, 'en' | 'fr'][] = [
    [2, 'en'],
    [8, 'fr'],
    [14, 'en'],
    [20, 'fr']
  ]
  const packs = pares.map(([tema, idioma]) => getListening(tema, idioma)).filter((d): d is ListeningPack => !!d)
  const dialogos = packs.flatMap(dialogosDe)
  const preguntas = baraja(dialogos.flatMap((d) => d.preguntas.map((p) => preguntaDeListening(p, d.idioma))))
  return { dialogos, preguntas }
}

export interface SeccionReading {
  textos: ReadingPack[]
  preguntas: Pregunta[]
}

// Versión extendida: dos bloques de lectura (1 y 3), en ambos idiomas.
export function construirReadingFinal(): SeccionReading {
  const textos = [getReading(1, 'en'), getReading(1, 'fr'), getReading(3, 'en'), getReading(3, 'fr')].filter(
    (t): t is ReadingPack => !!t
  )
  const preguntas = baraja(
    textos.flatMap((t) =>
      t.preguntas.map((p) =>
        preguntaDeListening({ tipo: p.tipo, enunciado: p.enunciado, opciones: p.opciones, respuesta: p.respuesta }, t.idioma)
      )
    )
  )
  return { textos, preguntas }
}

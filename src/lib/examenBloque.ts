import type { Pregunta, ListeningPack, ReadingPack } from '../types'
import { temasDeBloque } from './curriculum'
import { getListening, getReading } from '../data/packs'
import { preguntaDeListening } from './preguntas'
import { baraja } from './preguntas'

export interface SeccionListening {
  dialogos: ListeningPack[]
  preguntas: Pregunta[]
}

// Un diálogo en inglés + uno en francés del bloque (formato IELTS Part 1 / TEF CO combinado).
export function construirListeningBloque(bloque: number): SeccionListening {
  const temas = temasDeBloque(bloque)
  const temaEn = temas[1] ?? temas[0]
  const temaFr = temas[4] ?? temas[0]
  const dialogos = [getListening(temaEn, 'en'), getListening(temaFr, 'fr')].filter(
    (d): d is ListeningPack => !!d
  )
  const preguntas = baraja(dialogos.flatMap((d) => d.preguntas.map((p) => preguntaDeListening(p, d.idioma))))
  return { dialogos, preguntas }
}

export interface SeccionReading {
  textos: ReadingPack[]
  preguntas: Pregunta[]
}

// Texto en inglés + texto en francés del bloque (anuncio/email/horario/menú, formato IELTS/TEF).
export function construirReadingBloque(bloque: number): SeccionReading {
  const en = getReading(bloque, 'en')
  const fr = getReading(bloque, 'fr')
  const textos = [en, fr].filter((t): t is ReadingPack => !!t)
  const preguntas = baraja(
    textos.flatMap((t) =>
      t.preguntas.map((p) =>
        preguntaDeListening(
          { tipo: p.tipo, enunciado: p.enunciado, opciones: p.opciones, respuesta: p.respuesta },
          t.idioma
        )
      )
    )
  )
  return { textos, preguntas }
}

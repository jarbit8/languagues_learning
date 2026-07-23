import type { Pregunta, ListeningPack, ReadingPack, DialogoConTema, TextoConIdioma } from '../types'
import { temasDeBloque } from './curriculum'
import { getListening, getReading, dialogosDe } from '../data/packs'
import { preguntaDeListening } from './preguntas'
import { baraja } from './preguntas'

export interface SeccionListening {
  dialogos: DialogoConTema[]
  preguntas: Pregunta[]
}

// Un diálogo en inglés + uno en francés del bloque (formato IELTS Part 1 / TEF CO combinado).
export function construirListeningBloque(bloque: number): SeccionListening {
  const temas = temasDeBloque(bloque)
  const temaEn = temas[1] ?? temas[0]
  const temaFr = temas[4] ?? temas[0]
  const packs = [getListening(temaEn, 'en'), getListening(temaFr, 'fr')].filter(
    (d): d is ListeningPack => !!d
  )
  const dialogos = packs.flatMap(dialogosDe)
  const preguntas = baraja(dialogos.flatMap((d) => d.preguntas.map((p) => preguntaDeListening(p, d.idioma))))
  return { dialogos, preguntas }
}

export interface SeccionReading {
  textos: TextoConIdioma[]
  preguntas: Pregunta[]
}

// Texto en inglés + texto en francés del bloque (anuncio/email/horario/menú, formato IELTS/TEF).
// Usa el PRIMER texto de cada pack; el resto son para práctica libre (pantalla Leer).
export function construirReadingBloque(bloque: number): SeccionReading {
  const packs = [getReading(bloque, 'en'), getReading(bloque, 'fr')].filter((p): p is ReadingPack => !!p)
  const textos: TextoConIdioma[] = packs.map((p) => ({ ...p.textos[0], idioma: p.idioma }))
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

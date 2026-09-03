import type { Pregunta, ListeningPack, ReadingPack, DialogoConTema, TextoReading } from '../types'
import { temasDeBloque } from './curriculum'
import { getListening, getReading, getVocabPack, getGramatica, dialogosDe } from '../data/packs'
import { preguntaDeListening, preguntaSignificadoEscrito, preguntaDeEjercicio } from './preguntas'
import { baraja } from './preguntas'

// El examen de bloque cierra 6 temas, pero solo medía las 4 destrezas: no repasaba ni el
// vocabulario ni la gramática acumulados, que es justo lo que se olvida entre bloques.
// Estas dos secciones mezclan los 6 temas para forzar el repaso a largo plazo.
export function construirVocabBloque(bloque: number, cuantas = 40): Pregunta[] {
  const conceptos = temasDeBloque(bloque).flatMap((t) => getVocabPack(t)?.conceptos ?? [])
  return baraja(conceptos).slice(0, cuantas).map(preguntaSignificadoEscrito)
}

export function construirGramaticaBloque(bloque: number, cuantas = 30): Pregunta[] {
  const ejercicios = temasDeBloque(bloque).flatMap((tema) =>
    (getGramatica(tema)?.ejercicios ?? []).map(preguntaDeEjercicio)
  )
  return baraja(ejercicios).slice(0, cuantas)
}

export interface SeccionListening {
  dialogos: DialogoConTema[]
  preguntas: Pregunta[]
}

// Listening del bloque (formato IELTS Part 1). Toma dos temas del bloque para que el examen
// tenga cuerpo y no dependa de un solo diálogo.
export function construirListeningBloque(bloque: number): SeccionListening {
  const temas = temasDeBloque(bloque)
  // 3 temas en vez de 2 (2026-08-29, "del bloque 1 igual pero mucho más amplio").
  const temasFuente = [temas[0], temas[2] ?? temas[0], temas[4] ?? temas[0]]
  const packs = temasFuente
    .map((tema) => getListening(tema))
    .filter((d): d is ListeningPack => !!d)
  const dialogos = packs.flatMap(dialogosDe)
  const preguntas = baraja(dialogos.flatMap((d) => d.preguntas.map(preguntaDeListening)))
  return { dialogos, preguntas }
}

export interface SeccionReading {
  textos: TextoReading[]
  preguntas: Pregunta[]
}

// Reading del bloque: las lecturas son POR TEMA, así que el examen toma las de dos temas
// del bloque (formato IELTS: varios textos cortos con preguntas).
export function construirReadingBloque(bloque: number): SeccionReading {
  const temas = temasDeBloque(bloque)
  const fuente = [temas[1] ?? temas[0], temas[3] ?? temas[0], temas[5] ?? temas[0]]
  const packs = fuente.map((tema) => getReading(tema)).filter((p): p is ReadingPack => !!p)
  const textos: TextoReading[] = packs.flatMap((p) => p.textos)
  const preguntas = baraja(
    textos.flatMap((t) =>
      t.preguntas.map((p) =>
        preguntaDeListening(p)
      )
    )
  )
  return { textos, preguntas }
}

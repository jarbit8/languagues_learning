import type { Pregunta, ListeningPack, ReadingPack, DialogoConTema, TextoConIdioma } from '../types'
import { temasDeBloque } from './curriculum'
import { IDIOMAS_ACTIVOS } from '../config'
import { getListening, getReading, getVocabPack, getGramatica, dialogosDe } from '../data/packs'
import { preguntaDeListening, preguntaDeConcepto, preguntaDeEjercicio } from './preguntas'
import { baraja } from './preguntas'

// El examen de bloque cierra 6 temas, pero solo medía las 4 destrezas: no repasaba ni el
// vocabulario ni la gramática acumulados, que es justo lo que se olvida entre bloques.
// Estas dos secciones mezclan los 6 temas para forzar el repaso a largo plazo.
export function construirVocabBloque(bloque: number, cuantas = 20): Pregunta[] {
  const conceptos = temasDeBloque(bloque).flatMap((t) => getVocabPack(t)?.conceptos ?? [])
  return baraja(conceptos).slice(0, cuantas).map(preguntaDeConcepto)
}

export function construirGramaticaBloque(bloque: number, cuantas = 15): Pregunta[] {
  const ejercicios = temasDeBloque(bloque).flatMap((tema) =>
    IDIOMAS_ACTIVOS.flatMap((idioma) =>
      (getGramatica(tema, idioma)?.ejercicios ?? []).map((e) => preguntaDeEjercicio(e, idioma))
    )
  )
  return baraja(ejercicios).slice(0, cuantas)
}

export interface SeccionListening {
  dialogos: DialogoConTema[]
  preguntas: Pregunta[]
}

// Listening del bloque (formato IELTS Part 1 / TEF CO). Toma dos temas del bloque; con dos
// idiomas activos va uno en cada idioma, con uno solo van ambos temas en ese idioma — así el
// examen mantiene el mismo tamaño en cualquier configuración.
export function construirListeningBloque(bloque: number): SeccionListening {
  const temas = temasDeBloque(bloque)
  const temasFuente = [temas[1] ?? temas[0], temas[4] ?? temas[0]]
  const packs = temasFuente
    .map((tema, i) => {
      const idioma = IDIOMAS_ACTIVOS[i % IDIOMAS_ACTIVOS.length]
      return getListening(tema, idioma)
    })
    .filter((d): d is ListeningPack => !!d)
  const dialogos = packs.flatMap(dialogosDe)
  const preguntas = baraja(dialogos.flatMap((d) => d.preguntas.map((p) => preguntaDeListening(p, d.idioma))))
  return { dialogos, preguntas }
}

export interface SeccionReading {
  textos: TextoConIdioma[]
  preguntas: Pregunta[]
}

// Reading del bloque: ahora las lecturas son POR TEMA, así que el examen toma las de dos temas
// del bloque (formato IELTS/TEF: varios textos cortos con preguntas).
export function construirReadingBloque(bloque: number): SeccionReading {
  const temas = temasDeBloque(bloque)
  const fuente = [temas[2] ?? temas[0], temas[5] ?? temas[1] ?? temas[0]]
  const packs = fuente
    .flatMap((tema) => IDIOMAS_ACTIVOS.map((i) => getReading(tema, i)))
    .filter((p): p is ReadingPack => !!p)
  const textos: TextoConIdioma[] = packs.flatMap((p) => p.textos.map((t) => ({ ...t, idioma: p.idioma })))
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

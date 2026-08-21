import type { Pregunta, ListeningPack, ReadingPack, DialogoConTema, TextoConIdioma } from '../types'
import { vocabPacks, getListening, getReading, getGramatica, dialogosDe } from '../data/packs'
import { IDIOMAS_ACTIVOS } from '../config'
import { baraja, preguntaDeConcepto, preguntaDeListening, preguntaDeEjercicio } from './preguntas'

// 100 palabras aleatorias de todo el nivel A1 (skill exam-engine: examen final).
export function construirVocabFinal(): Pregunta[] {
  const todos = vocabPacks.flatMap((p) => p.conceptos)
  return baraja(todos)
    .slice(0, 100)
    .map(preguntaDeConcepto)
}

// Gramática de TODO el nivel: mezcla los ejercicios de los 24 temas. El examen de bloque ya
// repasa la gramática de sus 6 temas; sin esta sección el examen final certificaba el A1 sin
// medir la gramática acumulada, que es justo lo que más se olvida.
export function construirGramaticaFinal(cuantas = 20): Pregunta[] {
  const ejercicios = vocabPacks.flatMap((p) =>
    IDIOMAS_ACTIVOS.flatMap((idioma) =>
      (getGramatica(p.tema, idioma)?.ejercicios ?? []).map((e) => preguntaDeEjercicio(e, idioma))
    )
  )
  return baraja(ejercicios).slice(0, cuantas)
}

export interface SeccionListening {
  dialogos: DialogoConTema[]
  preguntas: Pregunta[]
}

// Versión extendida: un pack por bloque (temas 2, 8, 14, 20), alternando entre idiomas activos.
export function construirListeningFinal(): SeccionListening {
  const packs = [2, 8, 14, 20]
    .map((tema, i) => getListening(tema, IDIOMAS_ACTIVOS[i % IDIOMAS_ACTIVOS.length]))
    .filter((d): d is ListeningPack => !!d)
  const dialogos = packs.flatMap(dialogosDe)
  const preguntas = baraja(dialogos.flatMap((d) => d.preguntas.map((p) => preguntaDeListening(p, d.idioma))))
  return { dialogos, preguntas }
}

export interface SeccionReading {
  textos: TextoConIdioma[]
  preguntas: Pregunta[]
}

// Versión extendida: los bloques de lectura 1 y 3 en cada idioma activo. Con un solo idioma
// usa los dos textos de cada bloque, para mantener el mismo número de lecturas.
export function construirReadingFinal(): SeccionReading {
  const packs = [1, 3]
    .flatMap((bloque) => IDIOMAS_ACTIVOS.map((i) => getReading(bloque, i)))
    .filter((p): p is ReadingPack => !!p)
  const textos: TextoConIdioma[] =
    IDIOMAS_ACTIVOS.length === 1
      ? packs.flatMap((p) => p.textos.map((t) => ({ ...t, idioma: p.idioma })))
      : packs.map((p) => ({ ...p.textos[0], idioma: p.idioma }))
  const preguntas = baraja(
    textos.flatMap((t) =>
      t.preguntas.map((p) =>
        preguntaDeListening({ tipo: p.tipo, enunciado: p.enunciado, opciones: p.opciones, respuesta: p.respuesta }, t.idioma)
      )
    )
  )
  return { textos, preguntas }
}

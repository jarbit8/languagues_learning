import type { Pregunta, ListeningPack, ReadingPack, DialogoConTema, TextoReading } from '../types'
import { vocabPacks, getListening, getReading, getGramatica, dialogosDe, piezaDeExamen } from '../data/packs'
import { baraja, preguntaSignificadoEscrito, preguntaDeListening, preguntaDeEjercicio } from './preguntas'

// 100 palabras aleatorias de todo el nivel A1 (skill exam-engine: examen final).
export function construirVocabFinal(): Pregunta[] {
  const todos = vocabPacks.flatMap((p) => p.conceptos)
  return baraja(todos)
    .slice(0, 100)
    .map(preguntaSignificadoEscrito)
}

// Gramática de TODO el nivel: mezcla los ejercicios de los 24 temas. El examen de bloque ya
// repasa la gramática de sus 6 temas; sin esta sección el examen final certificaba el A1 sin
// medir la gramática acumulada, que es justo lo que más se olvida.
export function construirGramaticaFinal(cuantas = 40): Pregunta[] {
  const ejercicios = vocabPacks.flatMap((p) =>
    (getGramatica(p.tema)?.ejercicios ?? []).map(preguntaDeEjercicio)
  )
  return baraja(ejercicios).slice(0, cuantas)
}

export interface SeccionListening {
  dialogos: DialogoConTema[]
  preguntas: Pregunta[]
}

// 6 temas repartidos por el nivel entero (2026-08-29, "el final que sea un súper examen que
// componga todo"), UN diálogo de cada uno: el reservado al examen.
//
// El comentario viejo decía "cada tema son 2 diálogos" y ya no era verdad: son 5, así que
// llevarse los packs enteros pedía escuchar 30 diálogos seguidos y responder 150 preguntas.
// Seis diálogos de seis temas distintos es lo que siempre quiso decir "seis temas".
export function construirListeningFinal(): SeccionListening {
  const packs = [2, 6, 10, 14, 18, 22]
    .map((tema) => getListening(tema))
    .filter((d): d is ListeningPack => !!d)
  const dialogos = packs.map((p) => piezaDeExamen(dialogosDe(p), 4))
  const preguntas = baraja(dialogos.flatMap((d) => d.preguntas.map(preguntaDeListening)))
  return { dialogos, preguntas }
}

export interface SeccionReading {
  textos: TextoReading[]
  preguntas: Pregunta[]
}

// 6 lecturas repartidas por todo el nivel: la de examen de cada uno de esos 6 temas. Con el
// pack entero eran 30 textos y 235 preguntas, dos horas y media solo de leer.
export function construirReadingFinal(): SeccionReading {
  const packs = [3, 7, 11, 15, 19, 24]
    .map((tema) => getReading(tema))
    .filter((p): p is ReadingPack => !!p)
  const textos: TextoReading[] = packs.map((p) => piezaDeExamen(p.textos, 4))
  const preguntas = baraja(
    textos.flatMap((t) =>
      t.preguntas.map((p) =>
        preguntaDeListening(p)
      )
    )
  )
  return { textos, preguntas }
}

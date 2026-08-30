import type { Pregunta, ListeningPack, ReadingPack, DialogoConTema, TextoReading } from '../types'
import { vocabPacks, getListening, getReading, getGramatica, dialogosDe } from '../data/packs'
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

// Versión extendida: 6 temas repartidos por el nivel entero (2026-08-29, "el final que sea
// un súper examen que componga todo"). Se quedó en 6 y no en los 8 que caben porque cada
// tema son 2 diálogos: con 8 el examen pedía escuchar 16 seguidos y no lo termina nadie.
export function construirListeningFinal(): SeccionListening {
  const packs = [2, 6, 10, 14, 18, 22]
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

// Versión extendida: 6 lecturas repartidas por todo el nivel.
export function construirReadingFinal(): SeccionReading {
  const packs = [3, 7, 11, 15, 19, 24]
    .map((tema) => getReading(tema))
    .filter((p): p is ReadingPack => !!p)
  const textos: TextoReading[] = packs.flatMap((p) => p.textos)
  const preguntas = baraja(
    textos.flatMap((t) =>
      t.preguntas.map((p) =>
        preguntaDeListening({
          tipo: p.tipo,
          enunciado: p.enunciado,
          opciones: p.opciones,
          respuesta: p.respuesta
        })
      )
    )
  )
  return { textos, preguntas }
}

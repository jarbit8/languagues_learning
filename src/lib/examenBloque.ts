import type { Pregunta, ListeningPack, ReadingPack, DialogoConTema, TextoReading } from '../types'
import { temasDeBloque } from './curriculum'
import { getListening, getReading, getVocabPack, getGramatica, dialogosDe, piezaDeExamen } from '../data/packs'
import { preguntaDeListening, preguntaSignificadoEscrito, preguntaDeEjercicio } from './preguntas'
import { baraja } from './preguntas'

// El examen de bloque cierra 6 temas, pero solo medía las 4 destrezas: no repasaba ni el
// vocabulario ni la gramática acumulados, que es justo lo que se olvida entre bloques.
// Estas dos secciones mezclan los 6 temas para forzar el repaso a largo plazo.
// TODAS las palabras del bloque, no una muestra (2026-09-09, él: "estaría genial el examen del
// bloque 1 todas, ya que el examen es un día completo"). Antes sorteaba 40 de las ~200, y el
// sorteo se rehacía en cada intento: no se podía estudiar para él, porque no había un "esto
// entra". Con el bloque entero sí lo hay, y el cronograma le da un día suelto para eso.
// Son 184-207 preguntas según el bloque.
export function construirVocabBloque(bloque: number): Pregunta[] {
  const conceptos = temasDeBloque(bloque).flatMap((t) => getVocabPack(t)?.conceptos ?? [])
  return baraja(conceptos).map(preguntaSignificadoEscrito)
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

// Listening del bloque (formato IELTS Part 1): UN diálogo de cada uno de 3 temas del bloque,
// y siempre el reservado al examen.
//
// Antes se llevaba los packs enteros. Eso venía de cuando un tema traía 2 diálogos: 3 temas
// eran 6 y salía un examen de tamaño normal. Al pasar los packs a 5 diálogos, el examen se
// convirtió sin avisar en 15 diálogos y 75 preguntas —38 minutos de solo escuchar— y encima
// preguntaba por los cuatro que acababa de practicar. Coger la pieza de examen arregla las
// dos cosas de una vez.
export function construirListeningBloque(bloque: number): SeccionListening {
  const temas = temasDeBloque(bloque)
  // 3 temas en vez de 2 (2026-08-29, "del bloque 1 igual pero mucho más amplio").
  const temasFuente = [temas[0], temas[2] ?? temas[0], temas[4] ?? temas[0]]
  const packs = temasFuente
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

// Reading del bloque: la lectura de examen de 3 temas del bloque (formato IELTS: varios
// textos cortos con sus preguntas). Mismo arreglo que en listening — con los packs enteros
// eran 15 textos y 120 preguntas, 80 minutos de lectura para cerrar seis temas de A1.
export function construirReadingBloque(bloque: number): SeccionReading {
  const temas = temasDeBloque(bloque)
  const fuente = [temas[1] ?? temas[0], temas[3] ?? temas[0], temas[5] ?? temas[0]]
  const packs = fuente.map((tema) => getReading(tema)).filter((p): p is ReadingPack => !!p)
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

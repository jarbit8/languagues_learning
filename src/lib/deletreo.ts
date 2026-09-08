import type { ItemDeletreo, Pregunta } from '../types'
import { deletreoPack } from '../data/packs'
import { baraja } from './preguntas'

// DICTADO DE DELETREO (2026-09-07). El abecedario estaba solo en Pronunciar: las 26 letras
// con audio y un entrenador de pares. Con eso reconoces una letra suelta, que no es la
// habilidad — la habilidad es oír una tanda seguida y escribir la palabra, que es la primera
// parte del listening de IELTS y lo que te toca al deletrear tu apellido por teléfono.
//
// No es un tema y no puede serlo: un tema son tarjetas que entran al SRS y a un examen que
// pregunta "¿qué significa X?", y eso con una letra no existe. Va como bloque de Escuchar.

// Un tema son DOS días y el dictado salía igual los dos (2026-09-07, él: "que sean por días
// también"). Ahora la jornada marca la dificultad, como en el resto del curso: el día 1 calienta
// el oído con letras sueltas y palabras, y el día 2 casi no gasta letras y mete las frases, que
// es donde de verdad hay que cazar el deletreo dentro del habla.
const REPARTO: Record<1 | 2, Record<1 | 2 | 3, number>> = {
  1: { 1: 4, 2: 5, 3: 0 },
  2: { 1: 2, 2: 4, 3: 3 }
}
const POR_SESION = 9

export function itemsDisponibles(tema: number): ItemDeletreo[] {
  return (deletreoPack?.items ?? []).filter((i) => i.tema <= tema)
}

export function preguntaDeletreo(item: ItemDeletreo): Pregunta {
  return {
    tipo: 'deletreo',
    // El enunciado no puede decir nada de la palabra: el material es el audio. Solo aclara
    // qué se espera escribir, porque una letra y una palabra se teclean distinto.
    enunciado:
      item.escalon === 1
        ? 'Escucha y escribe la letra.'
        : item.escalon === 3
          ? 'Escucha la frase y escribe la palabra que deletrean.'
          : 'Escucha y escribe la palabra.',
    audioTexto: item.texto,
    frase: item.frase,
    respuesta: item.texto,
    aceptadas: []
  }
}

export function sesionDeletreo(tema: number, dia: 1 | 2 = 1): Pregunta[] {
  const pool = itemsDisponibles(tema)
  const reparto = REPARTO[dia]
  const elegidos: ItemDeletreo[] = []
  for (const escalon of [1, 2, 3] as const) {
    elegidos.push(...baraja(pool.filter((i) => i.escalon === escalon)).slice(0, reparto[escalon]))
  }
  // Si un escalón se queda corto (los de frase llegan más tarde), se rellena con lo que haya
  // en vez de servir una sesión de cuatro preguntas.
  const faltan = POR_SESION - elegidos.length
  if (faltan > 0) {
    elegidos.push(...baraja(pool.filter((i) => !elegidos.includes(i))).slice(0, faltan))
  }
  return elegidos.map(preguntaDeletreo)
}

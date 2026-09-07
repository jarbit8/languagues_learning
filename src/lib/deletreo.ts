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

// Una sesión sube por escalones: unas letras sueltas para calentar el oído, el grueso en
// palabras y un par dentro de una frase, que es como llega de verdad.
const REPARTO: Record<1 | 2 | 3, number> = { 1: 3, 2: 4, 3: 2 }
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

export function sesionDeletreo(tema: number): Pregunta[] {
  const pool = itemsDisponibles(tema)
  const elegidos: ItemDeletreo[] = []
  for (const escalon of [1, 2, 3] as const) {
    elegidos.push(...baraja(pool.filter((i) => i.escalon === escalon)).slice(0, REPARTO[escalon]))
  }
  // Si un escalón se queda corto (los de frase llegan más tarde), se rellena con lo que haya
  // en vez de servir una sesión de cuatro preguntas.
  const faltan = POR_SESION - elegidos.length
  if (faltan > 0) {
    elegidos.push(...baraja(pool.filter((i) => !elegidos.includes(i))).slice(0, faltan))
  }
  return elegidos.map(preguntaDeletreo)
}

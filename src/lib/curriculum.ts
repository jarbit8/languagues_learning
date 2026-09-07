import type { NivelExpresion } from '../types'

// El curso es de UN nivel: A1. No hay dimensión de nivel en el código (progresoNivel está
// cableado a 'A1' y el temario sale de cuántos packs de vocabulario haya), así que esto es
// una constante, no un estado. Sirve para que el contenido que SÍ viene etiquetado por nivel
// —hoy solo las expresiones— enseñe lo del nivel en curso y calle lo demás. Al armar el A2
// esto deja de valer y hay que hacer el refactor de nivel de verdad.
export const NIVEL_DEL_CURSO: NivelExpresion = 'A1'

// 1 nivel = 4 bloques de 6 temas (skill curriculum).
export function bloqueDeTema(tema: number): number {
  return Math.ceil(tema / 6)
}

export function temasDeBloque(bloque: number): number[] {
  const inicio = (bloque - 1) * 6 + 1
  return Array.from({ length: 6 }, (_, i) => inicio + i)
}

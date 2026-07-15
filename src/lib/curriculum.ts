// 1 nivel = 4 bloques de 6 temas (skill curriculum).
export function bloqueDeTema(tema: number): number {
  return Math.ceil(tema / 6)
}

export function temasDeBloque(bloque: number): number[] {
  const inicio = (bloque - 1) * 6 + 1
  return Array.from({ length: 6 }, (_, i) => inicio + i)
}

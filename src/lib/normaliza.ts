// Corrección 100% offline: se normaliza para aceptar variantes razonables a nivel A1.
export function normaliza(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // quita tildes/acentos (marcas combinantes)
    .replace(/['’`´]/g, "'") // unifica apóstrofes
    .replace(/[¿?¡!.,;:]/g, '') // quita puntuación
    .replace(/\s+/g, ' ')
}

export function coincide(respuesta: string, correcta: string, aceptadas: string[] = []): boolean {
  const r = normaliza(respuesta)
  if (!r) return false
  return [correcta, ...aceptadas].some((a) => normaliza(a) === r)
}

export const UN_DIA = 24 * 60 * 60 * 1000

export function inicioDeHoy(t = Date.now()): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function esHoy(t?: number): boolean {
  if (!t) return false
  return inicioDeHoy(t) === inicioDeHoy()
}

export function enDias(n: number, desde = Date.now()): number {
  return inicioDeHoy(desde) + n * UN_DIA
}

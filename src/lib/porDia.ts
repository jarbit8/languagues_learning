// Reparte el material de un tema entre sus dos días de estudio.
//
// Escuchar y leer llevan DOS por día (2 diálogos ≈ 5 min, 2 lecturas ≈ 14 min, que es el
// presupuesto del usuario); escribir y hablar, uno. Mientras un tema no tenga las cuatro
// piezas, se reparte lo que haya en vez de dejar el día 2 en blanco: con 2 toca una por día,
// con 1 la misma los dos días.
export function porDia<T>(items: T[], dia: 1 | 2, porJornada = 2): T[] {
  if (items.length >= porJornada * 2) return items.slice((dia - 1) * porJornada, dia * porJornada)
  if (items.length === 2) return [items[dia - 1]]
  return items.slice(0, 1)
}

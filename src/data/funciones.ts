// Función comunicativa de cada tema (qué aprendes a hacer), para el temario completo.
export const funciones: Record<number, string> = {
  1: 'saludar, despedirte, presentarte, ser cortés',
  2: 'contar, decir tu edad, dar tu número de teléfono',
  3: 'decir de dónde eres, tu nacionalidad y qué idiomas hablas',
  4: 'hablar de tu familia y estado civil',
  5: 'describir cómo es alguien por fuera y por dentro',
  6: 'decir en qué trabajas o estudias y preguntarlo',
  7: 'decir el día, la fecha, tu cumpleaños y las estaciones',
  8: 'decir la hora y con qué frecuencia haces cosas',
  9: 'contar lo que haces cada día',
  10: 'describir dónde vives y qué hay en tu casa',
  11: 'nombrar objetos y sus colores, señalar cosas',
  12: 'describir qué lleva puesto alguien y qué haces ahora',
  13: 'hablar de comida y de lo que hay para comer',
  14: 'pedir de comer y beber en un restaurante',
  15: 'comprar cosas, preguntar precios y cantidades',
  16: 'nombrar lugares de la ciudad y decir qué se puede hacer',
  17: 'pedir y dar direcciones, hablar de transporte',
  18: 'hablar del clima y del entorno natural',
  19: 'nombrar partes del cuerpo y decir qué te duele',
  20: 'hablar de lo que te gusta hacer en tu tiempo libre',
  21: 'hablar de tu carrera, materias y por qué estudias',
  22: 'hablar de tecnología y contar algo que pasó',
  23: 'hablar de viajes y contar experiencias pasadas',
  24: 'hablar de tus planes futuros e integrar todo lo aprendido'
}

export const nombresBloque: Record<number, string> = {
  1: 'Yo y mi gente',
  2: 'Mi día a día',
  3: 'Comida y ciudad',
  4: 'Pasado, planes y gustos'
}

export function funcionDe(tema: number): string {
  return funciones[tema] ?? ''
}

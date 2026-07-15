// Escenario de speaking por tema, usado para interpolar el system prompt del tutor IA.
export const escenarios: Record<number, string> = {
  1: 'presentarte con tu nombre y saludar con cortesía a un compañero nuevo',
  2: 'decir tu edad y dar tu número de teléfono para una ficha de inscripción',
  3: 'contar de dónde eres, tu nacionalidad y qué idiomas hablas',
  4: 'hablar de tu familia mostrando una foto a un amigo',
  5: 'describir cómo es físicamente y de personalidad un familiar o amigo',
  6: 'hablar de tu profesión o estudios en una charla informal',
  7: 'acordar el día y la fecha de una reunión',
  8: 'preguntar y decir la hora, y con qué frecuencia haces algo',
  9: 'contar tu rutina diaria a un amigo',
  10: 'describir tu casa a alguien que la va a visitar',
  11: 'describir los objetos de tu mochila y sus colores',
  12: 'comprar ropa en una tienda describiendo lo que buscas',
  13: 'decir qué comes normalmente y qué hay en tu cocina',
  14: 'pedir de comer y beber en un restaurante',
  15: 'comprar algo en el mercado y preguntar el precio',
  16: 'recomendar lugares de tu ciudad a un turista',
  17: 'dar indicaciones para llegar a un lugar',
  18: 'comparar el clima de tu ciudad con el de Canadá según la estación',
  19: 'explicar un síntoma en la farmacia',
  20: 'proponerle a un amigo un plan según sus hobbies',
  21: 'hablar de tu carrera (Ciencia de la Computación) y por qué la elegiste',
  22: 'contarle a alguien un problema técnico con tu celular',
  23: 'hacer el check-in en un hotel contando un viaje',
  24: 'contar tu plan de emigrar a Canadá y tus metas a futuro'
}

export function escenarioDe(tema: number): string {
  return escenarios[tema] ?? escenarios[1]
}

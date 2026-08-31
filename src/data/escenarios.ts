// Escenario de speaking por tema, para interpolar el system prompt del tutor IA.
//
// DOS POR TEMA (2026-08-30): un tema son dos días de estudio y el usuario hace la zona de
// Practicar entera cada día, así que necesita un prompt distinto cada vez. El primero es la
// situación básica de la función comunicativa; el segundo la retuerce un poco —cambia de
// interlocutor, de registro o le mete una pega— para que no sea repetir la misma conversación.
export const escenarios: Record<number, [string, string]> = {
  1: [
    'presentarte con tu nombre y saludar con cortesía a un compañero nuevo',
    'despedirte de alguien que acabas de conocer y desearle un buen día'
  ],
  2: [
    'decir tu edad y dar tu número de teléfono para una ficha de inscripción',
    'preguntarle a otra persona su edad y su teléfono para apuntarlos'
  ],
  3: [
    'contar de dónde eres, tu nacionalidad y qué idiomas hablas',
    'preguntarle a alguien de qué país es y en qué ciudad vive'
  ],
  4: [
    'hablar de tu familia mostrando una foto a un amigo',
    'preguntarle a un amigo por sus hermanos y sus padres'
  ],
  5: [
    'describir cómo es físicamente y de personalidad un familiar o amigo',
    'describir a alguien para que otra persona lo reconozca entre varios'
  ],
  6: [
    'hablar de tu profesión o estudios en una charla informal',
    'preguntarle a alguien en qué trabaja y dónde está su oficina'
  ],
  7: [
    'acordar el día y la fecha de una reunión',
    'contar en qué mes es tu cumpleaños y qué estación te gusta más'
  ],
  8: [
    'preguntar y decir la hora, y con qué frecuencia haces algo',
    'quedar con alguien a una hora y decir si sueles llegar puntual'
  ],
  9: [
    'contar tu rutina diaria a un amigo',
    'preguntarle a alguien a qué hora se levanta y qué hace por la tarde'
  ],
  10: [
    'describir tu casa a alguien que la va a visitar',
    'decir dónde están los muebles de una habitación'
  ],
  11: [
    'describir los objetos de tu mochila y sus colores',
    'reclamar un objeto perdido describiendo cómo es y qué hay dentro'
  ],
  12: [
    'comprar ropa en una tienda describiendo lo que buscas',
    'decir qué ropa llevas hoy y cuál te pones según el clima'
  ],
  13: [
    'decir qué comes normalmente y qué hay en tu cocina',
    'contar qué desayunas, qué almuerzas y qué no te gusta comer'
  ],
  14: [
    'pedir de comer y beber en un restaurante',
    'reservar una mesa por teléfono y preguntar por el menú'
  ],
  15: [
    'comprar algo en el mercado y preguntar el precio',
    'pagar en el supermercado y preguntar si hay descuento'
  ],
  16: [
    'recomendar lugares de tu ciudad a un turista',
    'preguntar si un museo está abierto y qué se puede visitar cerca'
  ],
  17: [
    'dar indicaciones para llegar a un lugar',
    'preguntar cómo llegar a la estación y en qué transporte'
  ],
  18: [
    'comparar el clima de tu ciudad con el de otro país según la estación',
    'contar qué tiempo hace hoy y qué planes tienes si llueve'
  ],
  19: [
    'explicar un síntoma en la farmacia',
    'contarle al médico qué te duele y desde cuándo'
  ],
  20: [
    'proponerle a un amigo un plan según sus hobbies',
    'contar qué haces en tu tiempo libre y qué deporte practicas'
  ],
  21: [
    'hablar de tu carrera (Ciencia de la Computación) y por qué la elegiste',
    'contar cómo estudias para un examen y qué materia se te hace difícil'
  ],
  22: [
    'contarle a alguien un problema técnico con tu celular',
    'explicar cómo resolviste un problema con internet o una contraseña'
  ],
  23: [
    'hacer el check-in en un hotel contando un viaje',
    'contar un viaje que hiciste el año pasado y qué compraste'
  ],
  24: [
    'contar tu plan de emigrar a Estados Unidos y tus metas a futuro',
    'hablar de lo que vas a hacer el próximo año y de tu sueño'
  ]
}

// `dia` es 1 o 2: el tema se estudia en dos jornadas y cada una lleva su escenario.
export function escenarioDe(tema: number, dia = 1): string {
  const par = escenarios[tema] ?? escenarios[1]
  return par[dia === 2 ? 1 : 0]
}

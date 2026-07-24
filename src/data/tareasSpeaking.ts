// Las 8 tareas de speaking del examen CELPIP (y su espíritu en IELTS/TEF), adaptadas a nivel A1.
// La IA presenta la tarea y da feedback SIEMPRE en el idioma; `instruccion` es la descripción
// (para el prompt) de qué debe pedirle al estudiante. Ampliable a A2/B1 con más tareas.

export interface TareaSpeaking {
  id: string
  nombre: string // etiqueta corta en español para la UI
  tipoCELPIP: string // nombre de la tarea real, como referencia
  instruccion: string // qué tarea debe administrar la IA (se interpola en el prompt)
}

export const tareasSpeaking: TareaSpeaking[] = [
  {
    id: 'consejo',
    nombre: 'Dar un consejo',
    tipoCELPIP: 'CELPIP Tarea 1 · Giving Advice',
    instruccion:
      'plantéale un problema pequeño y cotidiano de un amigo (por ejemplo: está cansado, no sabe qué ropa ponerse, no sabe qué comer, no encuentra sus llaves) y pídele que le dé un consejo simple.'
  },
  {
    id: 'experiencia',
    nombre: 'Contar una experiencia',
    tipoCELPIP: 'CELPIP Tarea 2 · Personal Experience',
    instruccion:
      'pídele que cuente algo que hizo (su rutina de ayer, su último fin de semana, un viaje), usando el pasado; anímalo a dar 3 o 4 detalles.'
  },
  {
    id: 'describir',
    nombre: 'Describir una escena',
    tipoCELPIP: 'CELPIP Tarea 3 · Describing a Scene',
    instruccion:
      'pídele que describa un lugar o una escena cotidiana (su casa, su habitación, su ciudad, su familia, un restaurante): qué hay, dónde está cada cosa, de qué color.'
  },
  {
    id: 'planes',
    nombre: 'Hablar de planes',
    tipoCELPIP: 'CELPIP Tarea 4 · Making Predictions',
    instruccion:
      'pídele que hable de sus planes para el futuro (qué va a hacer mañana, el próximo fin de semana, el próximo año), usando going to / futur proche.'
  },
  {
    id: 'comparar',
    nombre: 'Comparar y convencer',
    tipoCELPIP: 'CELPIP Tarea 5 · Comparing and Persuading',
    instruccion:
      'dale dos opciones cotidianas (dos comidas, dos prendas de ropa, dos ciudades, dos hobbies) y pídele que diga cuál prefiere y por qué, intentando convencerte.'
  },
  {
    id: 'problema',
    nombre: 'Resolver una situación',
    tipoCELPIP: 'CELPIP Tarea 6 · Difficult Situation',
    instruccion:
      'plantea una situación cotidiana con un problema pequeño (en un restaurante trajeron el plato equivocado; en una tienda la ropa no es de su talla; el autobús no llega) y pídele que la resuelva de forma cortés.'
  },
  {
    id: 'opinion',
    nombre: 'Dar tu opinión',
    tipoCELPIP: 'CELPIP Tarea 7 · Expressing Opinions',
    instruccion:
      'pídele su opinión sobre algo simple (una comida, un deporte, una estación del año, vivir en la ciudad o en el campo) y que explique por qué, con al menos dos razones.'
  },
  {
    id: 'detalle',
    nombre: 'Describir algo en detalle',
    tipoCELPIP: 'CELPIP Tarea 8 · Describing an Unusual Situation',
    instruccion:
      'pídele que describa con detalle un objeto suyo o algo de su día (qué es, cómo es, de qué color, de qué tamaño, para qué sirve, cuándo lo usa).'
  }
]

export function tareaPorId(id: string): TareaSpeaking | undefined {
  return tareasSpeaking.find((t) => t.id === id)
}

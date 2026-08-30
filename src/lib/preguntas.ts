import type { Concepto, Ejercicio, Pregunta, PreguntaListening } from '../types'
import { vocabPacks } from '../data/packs'

export function baraja<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Variantes válidas de un significado en español, para no exigir tipear el texto exacto:
// "hola (informal)" acepta "hola"; "que tengas buena tarde/noche" acepta cada rama.
// La corrección ya ignora tildes, mayúsculas y puntuación (normaliza.ts).
function variantesEs(es: string): string[] {
  const sinParentesis = es.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
  // Una barra dentro de una frase ("...buena tarde/noche") genera la frase completa de
  // cada rama, no la palabra suelta: "noche" por sí sola no es la respuesta.
  const expandeBarras = (v: string): string[] => {
    const palabras = v.split(' ')
    const i = palabras.findIndex((w) => w.includes('/'))
    if (i === -1) return [v]
    return palabras[i]
      .split('/')
      .map((op) => [...palabras.slice(0, i), op, ...palabras.slice(i + 1)].join(' '))
  }
  const ramas = [es, sinParentesis].flatMap(expandeBarras)
  return [...new Set(ramas)].filter((v) => v && v !== es)
}

// EL ÚNICO TIPO DE PREGUNTA DE VOCABULARIO DE TODO EL CURSO (2026-08-30, pedido del usuario:
// "quiero que únicamente me dé la palabra y yo debo escribirla en español. solo eso"): ve la
// palabra en inglés y escribe qué significa. Antes el diario escalaba por caja del SRS y los
// exámenes de tema, bloque y final sorteaban entre cuatro tipos (audio→escribir, es→en y dos
// de opción múltiple); se quitó todo, con sus distractores. Si vuelve a pedirse variedad, está
// en el historial de git hasta el commit anterior a este.
export function preguntaSignificadoEscrito(concepto: Concepto): Pregunta {
  return {
    tipo: 'significado_escrito',
    enunciado: `¿Qué significa "${concepto.texto}" en español?`,
    audioTexto: concepto.texto,
    respuesta: concepto.es,
    aceptadas: variantesEs(concepto.es),
    palabraId: concepto.id
  }
}

// Convierte una pregunta de listening en una pregunta para el runner.
// 'vf' se traduce a opción múltiple Verdadero/Falso; el resto queda como texto libre.
export function preguntaDeListening(p: PreguntaListening): Pregunta {
  if (p.tipo === 'vf') {
    const respuesta = p.respuesta.toLowerCase() === 'verdadero' ? 'Verdadero' : 'Falso'
    return {
      tipo: 'opcion_multiple',
      enunciado: p.enunciado,
      opciones: ['Verdadero', 'Falso'],
      respuesta,
      aceptadas: []
    }
  }
  // Verdadero / Falso / No dice — el tipo insignia de IELTS: "No dice" cuando el texto no lo afirma ni lo niega.
  if (p.tipo === 'vfnd') {
    const r = p.respuesta.toLowerCase()
    const respuesta = r.startsWith('v') ? 'Verdadero' : r.startsWith('f') ? 'Falso' : 'No dice'
    return {
      tipo: 'opcion_multiple',
      enunciado: p.enunciado,
      opciones: ['Verdadero', 'Falso', 'No dice'],
      respuesta,
      aceptadas: []
    }
  }
  return {
    tipo: p.tipo,
    enunciado: p.enunciado,
    opciones: p.opciones,
    respuesta: p.respuesta,
    aceptadas: p.aceptadas ?? []
  }
}

// Convierte un ejercicio de gramática en una pregunta para el runner.
export function preguntaDeEjercicio(e: Ejercicio): Pregunta {
  return {
    tipo: e.tipo,
    enunciado: e.enunciado,
    audioTexto: null,
    opciones: e.tipo === 'ordenar' ? baraja(e.opciones ?? []) : e.opciones,
    respuesta: e.respuesta,
    aceptadas: e.aceptadas ?? [],
    pista: e.pista
  }
}

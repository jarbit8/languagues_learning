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

const poolEn = vocabPacks.flatMap((p) => p.conceptos.map((c) => c.texto))
const poolEs = vocabPacks.flatMap((p) => p.conceptos.map((c) => c.es))

function distractores(correcta: string, n = 3): string[] {
  const pool = poolEn.filter((t) => t !== correcta)
  return baraja([...new Set(pool)]).slice(0, n)
}

function distractoresEs(correcta: string, n = 3): string[] {
  const pool = poolEs.filter((t) => t !== correcta)
  return baraja([...new Set(pool)]).slice(0, n)
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

// Examen diario: ve la palabra en inglés y escribe qué significa en español.
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

// Producir: ve el significado en español y ESCRIBE la palabra en inglés (caja 2 del SRS).
export function preguntaProducir(concepto: Concepto): Pregunta {
  return {
    tipo: 'es_a_en',
    enunciado: `¿Cómo se dice "${concepto.es}" en inglés?`,
    audioTexto: null,
    respuesta: concepto.texto,
    aceptadas: [],
    palabraId: concepto.id
  }
}

// Al oído: escucha la palabra y la escribe (caja 3 del SRS).
export function preguntaAudio(concepto: Concepto): Pregunta {
  return {
    tipo: 'audio_escribir',
    enunciado: 'Escucha y escribe la palabra en inglés.',
    audioTexto: concepto.texto,
    respuesta: concepto.texto,
    aceptadas: [],
    palabraId: concepto.id
  }
}

// ESCALADA POR CAJA DEL SRS (2026-08-30). El examen diario preguntaba siempre en la dirección
// fácil (inglés → español), y reconocer una palabra no es saberla: da falsa sensación de
// dominio justo en el examen que alimenta el SRS. Ahora la dificultad sube con la caja:
//   caja 1  reconocer   hello → "hola"      (acabas de marcarla)
//   caja 2  producir    hola  → "hello"     (ya no te dan la palabra)
//   caja 3  al oído     🔊    → "hello"     (sin verla escrita)
// Fallar devuelve la palabra a la caja 1, así que también baja el tipo de pregunta.
export function preguntaPorCaja(concepto: Concepto, caja: number): Pregunta {
  if (caja >= 3) return preguntaAudio(concepto)
  if (caja === 2) return preguntaProducir(concepto)
  return preguntaSignificadoEscrito(concepto)
}

// Convierte un concepto de vocabulario en una pregunta (tipo aleatorio).
export function preguntaDeConcepto(concepto: Concepto): Pregunta {
  const tipos = ['audio_escribir', 'es_a_en', 'opcion_multiple', 'significado'] as const
  const tipo = tipos[Math.floor(Math.random() * tipos.length)]

  // No traduce: comprueba que entiende el significado, no solo que memorizó el par de palabras.
  if (tipo === 'significado') {
    return {
      tipo: 'opcion_multiple',
      enunciado: `¿Qué significa "${concepto.texto}" en inglés?`,
      audioTexto: null,
      opciones: baraja([concepto.es, ...distractoresEs(concepto.es)]),
      respuesta: concepto.es,
      aceptadas: [],
      palabraId: concepto.id
    }
  }
  if (tipo === 'opcion_multiple') {
    return {
      tipo,
      enunciado: `¿Cómo se dice "${concepto.es}" en inglés?`,
      audioTexto: null,
      opciones: baraja([concepto.texto, ...distractores(concepto.texto)]),
      respuesta: concepto.texto,
      aceptadas: [],
      palabraId: concepto.id
    }
  }
  if (tipo === 'audio_escribir') {
    return {
      tipo,
      enunciado: 'Escucha y escribe la palabra en inglés.',
      audioTexto: concepto.texto,
      respuesta: concepto.texto,
      aceptadas: [],
      palabraId: concepto.id
    }
  }
  return {
    tipo,
    enunciado: `Traduce al inglés: "${concepto.es}"`,
    audioTexto: null,
    respuesta: concepto.texto,
    aceptadas: [],
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

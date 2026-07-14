import type { Concepto, Ejercicio, Idioma, Pregunta } from '../types'
import { vocabPacks } from '../data/packs'

export function baraja<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const poolEn = vocabPacks.flatMap((p) => p.conceptos.map((c) => c.en.texto))
const poolFr = vocabPacks.flatMap((p) => p.conceptos.map((c) => c.fr.texto))

function distractores(correcta: string, idioma: Idioma, n = 3): string[] {
  const pool = (idioma === 'en' ? poolEn : poolFr).filter((t) => t !== correcta)
  return baraja([...new Set(pool)]).slice(0, n)
}

// Convierte un concepto de vocabulario en una pregunta (tipo aleatorio, idioma aleatorio).
export function preguntaDeConcepto(concepto: Concepto): Pregunta {
  const idioma: Idioma = Math.random() < 0.5 ? 'en' : 'fr'
  const lado = concepto[idioma]
  const nombreIdioma = idioma === 'en' ? 'inglés' : 'francés'
  const tipos = ['audio_escribir', idioma === 'en' ? 'es_a_en' : 'es_a_fr', 'opcion_multiple'] as const
  const tipo = tipos[Math.floor(Math.random() * tipos.length)]

  if (tipo === 'opcion_multiple') {
    return {
      tipo,
      idioma,
      enunciado: `¿Cómo se dice "${concepto.es}" en ${nombreIdioma}?`,
      audioTexto: null,
      opciones: baraja([lado.texto, ...distractores(lado.texto, idioma)]),
      respuesta: lado.texto,
      aceptadas: [],
      palabraId: concepto.id
    }
  }
  if (tipo === 'audio_escribir') {
    return {
      tipo,
      idioma,
      enunciado: `Escucha y escribe la palabra en ${nombreIdioma}.`,
      audioTexto: lado.texto,
      respuesta: lado.texto,
      aceptadas: [],
      palabraId: concepto.id
    }
  }
  return {
    tipo,
    idioma,
    enunciado: `Traduce al ${nombreIdioma}: "${concepto.es}"`,
    audioTexto: null,
    respuesta: lado.texto,
    aceptadas: [],
    palabraId: concepto.id
  }
}

// Convierte un ejercicio de gramática en una pregunta para el runner.
export function preguntaDeEjercicio(e: Ejercicio, idioma: Idioma): Pregunta {
  return {
    tipo: e.tipo,
    idioma,
    enunciado: e.enunciado,
    audioTexto: null,
    opciones: e.tipo === 'ordenar' ? baraja(e.opciones ?? []) : e.opciones,
    respuesta: e.respuesta,
    aceptadas: e.aceptadas ?? [],
    pista: e.pista
  }
}

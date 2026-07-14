import { db } from '../db'
import { vocabPacks, conceptoPorId } from '../data/packs'
import { esHoy } from './fechas'
import type { Concepto, Idioma } from '../types'

export type TipoPregunta = 'audio_escribir' | 'es_a_en' | 'es_a_fr' | 'opcion_multiple'

export interface Pregunta {
  tipo: TipoPregunta
  idioma: Idioma
  enunciado: string
  audioTexto: string | null
  opciones?: string[]
  respuesta: string
  aceptadas: string[]
  palabraId: string
}

function baraja<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Pool de traducciones por idioma para distractores de opción múltiple.
const poolEn = vocabPacks.flatMap((p) => p.conceptos.map((c) => c.en.texto))
const poolFr = vocabPacks.flatMap((p) => p.conceptos.map((c) => c.fr.texto))

function distractores(correcta: string, idioma: Idioma, n = 3): string[] {
  const pool = (idioma === 'en' ? poolEn : poolFr).filter((t) => t !== correcta)
  return baraja(pool).slice(0, n)
}

function preguntaDe(concepto: Concepto): Pregunta {
  const idioma: Idioma = Math.random() < 0.5 ? 'en' : 'fr'
  const lado = concepto[idioma]
  const tipos: TipoPregunta[] = ['audio_escribir', idioma === 'en' ? 'es_a_en' : 'es_a_fr', 'opcion_multiple']
  const tipo = tipos[Math.floor(Math.random() * tipos.length)]
  const nombreIdioma = idioma === 'en' ? 'inglés' : 'francés'

  if (tipo === 'opcion_multiple') {
    const opciones = baraja([lado.texto, ...distractores(lado.texto, idioma)])
    return {
      tipo,
      idioma,
      enunciado: `¿Cómo se dice "${concepto.es}" en ${nombreIdioma}?`,
      audioTexto: null,
      opciones,
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

  // es_a_en / es_a_fr
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

// IDs a evaluar: marcadas HOY aún no examinadas hoy + repasos SRS vencidos.
export async function idsExamenDiario(): Promise<string[]> {
  const ahora = Date.now()
  const todas = await db.palabras.toArray()
  const ids = new Set<string>()
  for (const p of todas) {
    const marcadaHoy = esHoy(p.fechaAprendida) && !esHoy(p.ultimoExamen)
    const repasoVencido = p.proximoRepaso !== undefined && p.proximoRepaso <= ahora
    if (marcadaHoy || repasoVencido) ids.add(p.id)
  }
  return [...ids]
}

export async function construirExamenDiario(): Promise<Pregunta[]> {
  const ids = await idsExamenDiario()
  const preguntas: Pregunta[] = []
  for (const id of baraja(ids)) {
    const encontrado = conceptoPorId(id)
    if (encontrado) preguntas.push(preguntaDe(encontrado.concepto))
  }
  return preguntas
}

// Marca que estas palabras ya se examinaron hoy (para no repetirlas en el mismo día).
export async function marcarExaminadasHoy(ids: string[]) {
  const ahora = Date.now()
  await Promise.all(ids.map((id) => db.palabras.update(id, { ultimoExamen: ahora })))
}

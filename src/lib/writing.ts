import type { FeedbackSpeaking, Idioma } from '../types'
import { corregirTexto, AnthropicError } from './anthropic'
import { parseFeedback } from './speaking'

function systemPromptWriting(idioma: Idioma, consigna: string): string {
  const nombreIdioma = idioma === 'en' ? 'inglés' : 'francés'
  return `Eres un corrector de textos en ${nombreIdioma} de un estudiante A1. El estudiante escribió un texto para esta consigna: "${consigna}". Corrige como máximo 3 errores, a nivel A1 la sobrecorrección desmotiva. Responde en español, SOLO con este JSON: {"tipo":"feedback","bien":"una cosa buena del texto","errores":[{"dijo":"...","correcto":"...","porque":"explicación breve"}],"nota":0-100}.`
}

export type ResultadoCorreccion = { ok: true; feedback: FeedbackSpeaking } | { ok: false; mensaje: string }

// Corrige el texto vía IA. Si falla (sin key, sin red, error), el llamador debe usar el
// fallback offline: respuesta modelo + checklist de autoevaluación (nunca bloquear el examen).
export async function corregirWriting(idioma: Idioma, consigna: string, texto: string): Promise<ResultadoCorreccion> {
  try {
    const respuesta = await corregirTexto(systemPromptWriting(idioma, consigna), texto)
    const feedback = parseFeedback(respuesta)
    if (!feedback) return { ok: false, mensaje: 'La IA no devolvió una corrección válida.' }
    return { ok: true, feedback }
  } catch (e) {
    const err = e as AnthropicError
    return { ok: false, mensaje: err.info?.mensaje ?? 'No se pudo corregir automáticamente.' }
  }
}

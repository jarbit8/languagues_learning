import type { FeedbackSpeaking, Idioma } from '../types'

// System prompt literal del tutor (skill speaking-ai), interpolando variables.
export function construirSystemPrompt(
  idioma: Idioma,
  escenario: string,
  temasDesbloqueados: string,
  modoExamen = false
): string {
  const nombreIdioma = idioma === 'en' ? 'inglés' : 'francés'
  const base = `Eres un tutor de ${nombreIdioma} conversando con un estudiante A1. Escenario: ${escenario}. Responde SOLO en ${nombreIdioma}, frases de máx 8 palabras, vocabulario A1 de ${temasDesbloqueados}. Una pregunta por turno, cálido y natural. Si el estudiante escribe en español, dale la frase en ${nombreIdioma} y retoma. Si comete error, NO corrijas en el momento, recuérdalo para el final. En francés usa vous salvo que el estudiante use tu primero. Al escribir 'terminar' o a los 12 turnos, cierra con feedback en español: 1 cosa buena + máx 3 errores con corrección y explicación breve, formato JSON {"tipo":"feedback","bien":"...","errores":[{"dijo":"...","correcto":"...","porque":"..."}]}.`
  if (!modoExamen) return base
  return `${base} Como esto es un examen de bloque, además de "bien" y "errores" incluye en el mismo JSON un campo "nota" de 0 a 100 según una rúbrica A1 (pronunciación no evaluable por texto, evalúa vocabulario, gramática básica y fluidez de las respuestas).`
}

// Intenta interpretar la última respuesta del modelo como el JSON de cierre.
export function parseFeedback(texto: string): FeedbackSpeaking | null {
  const match = texto.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const data = JSON.parse(match[0])
    if (data && data.tipo === 'feedback') return data as FeedbackSpeaking
  } catch {
    // no era JSON válido, es un turno de conversación normal
  }
  return null
}

export function debeCerrar(mensajeUsuario: string, turnos: number): boolean {
  return mensajeUsuario.trim().toLowerCase() === 'terminar' || turnos >= 12
}

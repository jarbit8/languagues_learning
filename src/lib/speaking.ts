import type { FeedbackSpeaking, Idioma } from '../types'
import { vocabPacks } from '../data/packs'

// Vocabulario REAL desbloqueado (todas las palabras de los temas 1..tema, no solo los títulos),
// en el idioma que se va a hablar. La IA se restringe a esta lista para que el estudiante entienda
// todo — sin esto, "vocabulario A1" es una sugerencia vaga y la IA mete palabras que no ha visto.
export function vocabularioDesbloqueado(tema: number, idioma: Idioma): string {
  const palabras = vocabPacks.filter((p) => p.tema <= tema).flatMap((p) => p.conceptos.map((c) => c[idioma].texto))
  return palabras.join(', ')
}

// System prompt literal del tutor (skill speaking-ai), interpolando variables.
// Inmersión total: el tutor NUNCA usa español, ni para traducir ni para explicar,
// tampoco en el feedback de cierre — como le hablaría a un niño bilingüe.
export function construirSystemPrompt(
  idioma: Idioma,
  escenario: string,
  vocabulario: string,
  modoExamen = false
): string {
  const nombreIdioma = idioma === 'en' ? 'inglés' : 'francés'
  const base = `Eres un tutor de ${nombreIdioma} conversando con un estudiante A1 sobre: ${escenario}. Responde SIEMPRE en ${nombreIdioma}, nunca en español, ni para traducir ni para explicar — háblale como a un niño bilingüe que ya te entiende. Frases de máx 8 palabras. MUY IMPORTANTE — el estudiante SOLO conoce estas palabras de contenido (sustantivos, verbos, adjetivos), además de pronombres/artículos/preposiciones básicas y el verbo to be/avoir-être: ${vocabulario}. No uses NINGÚN sustantivo, verbo o adjetivo fuera de esa lista — si no está ahí, el estudiante no lo va a entender. Una pregunta por turno, cálido y natural. Si el estudiante escribe en español, respóndele solo en ${nombreIdioma} y sigue la conversación, sin traducir lo que dijo. Si comete un error, NO corrijas en el momento, recuérdalo para el cierre. En francés usa vous salvo que el estudiante use tu primero. Al escribir 'terminar' o a los 12 turnos, cierra TAMBIÉN en ${nombreIdioma} con frases simples A1 (nada de español): 1 cosa buena + máx 3 errores con corrección y una explicación breve, formato JSON {"tipo":"feedback","bien":"...","errores":[{"dijo":"...","correcto":"...","porque":"..."}]}.`
  if (!modoExamen) return base
  return `${base} Como esto es un examen de bloque, además de "bien" y "errores" incluye en el mismo JSON un campo "nota" de 0 a 100 según una rúbrica A1 (pronunciación no evaluable por texto, evalúa vocabulario, gramática básica y fluidez de las respuestas).`
}

// Prompt listo para copiar y pegar como primer mensaje en cualquier otra app de IA
// (Claude, ChatGPT...), para quien prefiera hablar ahí en vez de pegar su API key en Ajustes.
export function construirPromptCopiable(idioma: Idioma, escenario: string, vocabulario: string): string {
  const nombreIdioma = idioma === 'en' ? 'inglés' : 'francés'
  const system = construirSystemPrompt(idioma, escenario, vocabulario)
  return `${system}\n\nEmpieza tú: salúdame y hazme la primera pregunta sobre el escenario. Recuerda: todo el rato en ${nombreIdioma}, nunca en español, y solo con las palabras que ya conozco.`
}

// Prompt de listening: la IA cuenta una historia y luego pregunta por ella en el mismo chat,
// para usar en cualquier app de IA con voz (ChatGPT modo voz, Gemini Live...) — mismo espíritu
// que construirPromptCopiable, pero el ejercicio es "escuchar y responder", no conversar libre.
export function construirPromptListening(idioma: Idioma, escenario: string, vocabulario: string): string {
  const nombreIdioma = idioma === 'en' ? 'inglés' : 'francés'
  return `Eres un tutor de ${nombreIdioma} haciendo un ejercicio de listening con un estudiante A1. Primero cuenta una historia corta (6-10 frases) en ${nombreIdioma} sobre: ${escenario}, frases simples y claras — nunca en español, como le hablarías a un niño bilingüe. MUY IMPORTANTE — el estudiante SOLO conoce estas palabras de contenido (sustantivos, verbos, adjetivos), además de pronombres/artículos/preposiciones básicas y el verbo to be/avoir-être: ${vocabulario}. No uses NINGÚN sustantivo, verbo o adjetivo fuera de esa lista en la historia ni en las preguntas — si no está ahí, no lo va a entender. Cuando termines la historia, hazme preguntas de comprensión sobre ella UNA A LA VEZ (entre 3 y 5 en total, estilo IELTS/TEF: qué pasó, quién, cuándo, dónde, cuánto), todas en ${nombreIdioma}, esperando mi respuesta antes de pasar a la siguiente. No corrijas cada respuesta en el momento. Cuando termines todas las preguntas, cierra con un resumen en ${nombreIdioma}: cuántas acerté de cuántas en total, y para cada una que fallé, la respuesta correcta con una explicación breve — todo en ${nombreIdioma}, nunca en español. Si tienes modo de voz, cuenta la historia y haz las preguntas habladas; yo puedo responder por voz o por texto.\n\nEmpieza tú: cuenta la historia.`
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

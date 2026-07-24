import type { FeedbackSpeaking, Idioma } from '../types'
import type { TareaSpeaking } from '../data/tareasSpeaking'
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

// Prompt de una TAREA de speaking estilo CELPIP/IELTS (ver data/tareasSpeaking.ts): la IA
// presenta la tarea, deja responder sin interrumpir y da feedback con puntaje — todo en el idioma.
export function construirPromptTarea(idioma: Idioma, tarea: TareaSpeaking, vocabulario: string): string {
  const nombreIdioma = idioma === 'en' ? 'inglés' : 'francés'
  return `Eres un examinador de ${nombreIdioma} tipo CELPIP/IELTS con un estudiante A1. Vas a administrarle UNA tarea de speaking (${tarea.tipoCELPIP}). LA TAREA: ${tarea.instruccion}\n\nReglas: presenta la tarea en ${nombreIdioma} con frases simples y claras de nivel A1, NUNCA en español. El estudiante SOLO conoce estas palabras de contenido (además de pronombres/artículos/preposiciones básicas y to be/avoir-être): ${vocabulario}. No uses ningún sustantivo, verbo o adjetivo fuera de esa lista. Después de plantear la tarea, dile que tiene unos segundos para pensar y luego que responda (puede hablar por voz o escribir). NO lo interrumpas mientras responde ni corrijas en medio. Cuando termine su respuesta, dale feedback en ${nombreIdioma}, en frases A1 (nada de español): primero una cosa que hizo bien, luego máximo 3 correcciones (qué dijo → cómo se dice mejor → por qué, muy breve), y una nota de 0 a 100 según claridad, vocabulario y gramática A1. Si tienes modo de voz, plantea la tarea hablada; el estudiante puede responder por voz.\n\nEmpieza tú: plantéale la tarea.`
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

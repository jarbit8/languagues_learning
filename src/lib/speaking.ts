import type { FeedbackSpeaking } from '../types'
import type { TareaSpeaking } from '../data/tareasSpeaking'
import { vocabPacks } from '../data/packs'

// Vocabulario REAL desbloqueado (todas las palabras de los temas 1..tema, no solo los títulos).
// La IA se restringe a esta lista para que el estudiante entienda todo — sin esto, "vocabulario
// A1" es una sugerencia vaga y la IA mete palabras que no ha visto.
export function vocabularioDesbloqueado(tema: number): string {
  const palabras = vocabPacks.filter((p) => p.tema <= tema).flatMap((p) => p.conceptos.map((c) => c.texto))
  return palabras.join(', ')
}

// System prompt literal del tutor (skill speaking-ai), interpolando variables.
// Inmersión total: el tutor NUNCA usa español, ni para traducir ni para explicar,
// tampoco en el feedback de cierre — como le hablaría a un niño bilingüe.
export function construirSystemPrompt(
  escenario: string,
  vocabulario: string,
  modoExamen = false,
  meta = 'si ya puede avanzar al siguiente bloque del nivel'
): string {
  const base = `Eres un tutor de inglés conversando con un estudiante A1 sobre: ${escenario}. Responde SIEMPRE en inglés, nunca en español, ni para traducir ni para explicar — háblale como a un niño bilingüe que ya te entiende. Frases de máx 8 palabras. MUY IMPORTANTE — el estudiante SOLO conoce estas palabras de contenido (sustantivos, verbos, adjetivos), además de pronombres/artículos/preposiciones básicas y el verbo to be: ${vocabulario}. No uses NINGÚN sustantivo, verbo o adjetivo fuera de esa lista — si no está ahí, el estudiante no lo va a entender. Una pregunta por turno, cálido y natural. Si el estudiante escribe en español, respóndele solo en inglés y sigue la conversación, sin traducir lo que dijo. Si comete un error, NO corrijas en el momento, recuérdalo para el cierre. Al escribir 'terminar' o a los 12 turnos, cierra TAMBIÉN en inglés con frases simples A1 (nada de español): 1 cosa buena + máx 3 errores con corrección y una explicación breve, formato JSON {"tipo":"feedback","bien":"...","errores":[{"dijo":"...","correcto":"...","porque":"..."}]}.`
  if (!modoExamen) return base
  // El veredicto va en español a propósito (ver bloqueVeredicto): es una decisión, no práctica.
  return `${base} Como esto es un examen de bloque, además de "bien" y "errores" incluye en el mismo JSON: un campo "nota" de 0 a 100 según una rúbrica A1 (pronunciación no evaluable por texto, evalúa vocabulario, gramática básica y fluidez), un campo "listo" (true/false) que decida ${meta}, y un campo "veredicto" con UNA frase EN ESPAÑOL — la única en español de toda la sesión — que diga qué domina ya si es true, o exactamente qué le falta practicar si es false. Sé honesto y exigente con "listo": pon true solo si responde lo que se le pide en frases completas, se le entiende a la primera y no se pasa al español. Aprobarlo antes de tiempo no le ayuda.`
}

// Prompt listo para copiar y pegar como primer mensaje en cualquier otra app de IA
// (Claude, ChatGPT...), para quien prefiera hablar ahí en vez de pegar su API key en Ajustes.
export function construirPromptCopiable(escenario: string, vocabulario: string): string {
  const system = construirSystemPrompt(escenario, vocabulario)
  return `${system}\n\nEmpieza tú: salúdame y hazme la primera pregunta sobre el escenario. Recuerda: todo el rato en inglés, nunca en español, y solo con las palabras que ya conozco.`
}

// El speaking es la prueba que decide si el estudiante avanza, así que la IA tiene que dar un
// veredicto explícito. Ese veredicto (y SOLO él) va en español: es metalenguaje administrativo,
// no práctica del idioma — mismo criterio por el que la pantalla de Gramática sigue en español.
// El aviso anti-complacencia importa: si no se le pide, el modelo tiende a aprobar por cortesía.
function bloqueVeredicto(meta: string): string {
  return `\n\nDECISIÓN FINAL — es la parte más importante: esta tarea es la prueba que decide ${meta}. Después del feedback, cierra SIEMPRE con el veredicto. Esta última parte, y solo esta, va en ESPAÑOL, porque es una decisión que el estudiante tiene que entender sin ninguna duda. Formato exacto:\nVEREDICTO: LISTO ✅   (o bien)   VEREDICTO: AÚN NO ⏳\ny debajo UNA sola frase en español: si es LISTO, qué es lo que ya domina; si es AÚN NO, exactamente qué tiene que practicar antes de volver a intentarlo.\nDi LISTO solo si cumple casi todo esto: responde lo que la tarea pide sin irse por las ramas, habla en frases completas y no en palabras sueltas, se le entiende a la primera, usa el vocabulario y la gramática de su nivel, y no se pasa al español. Sé honesto y exigente: si todavía no está, dile AÚN NO. Aprobarlo antes de tiempo no le hace ningún favor, porque se va a encontrar el problema más adelante.`
}

// Examen de HABLAR de un tema: el mismo roleplay del escenario que en Practicar, pero la
// IA cierra decidiendo si lo da por dominado. No usa el modoExamen del JSON porque este
// prompt se copia y se pega en una IA cualquiera: el veredicto tiene que leerse, no parsearse.
export function construirPromptHablarExamen(escenario: string, vocabulario: string, meta: string): string {
  const system = construirSystemPrompt(escenario, vocabulario)
  return `${system}${bloqueVeredicto(meta)}

Empieza tú: salúdame y hazme la primera pregunta sobre el escenario. Al final dame el veredicto.`
}

// Prompt de una TAREA de speaking estilo CELPIP/IELTS (ver data/tareasSpeaking.ts): la IA
// presenta la tarea, deja responder sin interrumpir y da feedback con puntaje — todo en el idioma.
// `meta` solo se pasa cuando la tarea es un examen (bloque/final): añade el veredicto de avance.
// En la práctica libre de Hablar se omite, porque ahí no hay nada que aprobar.
export function construirPromptTarea(tarea: TareaSpeaking, vocabulario: string, meta?: string): string {
  const base = `Eres un examinador de inglés tipo CELPIP/IELTS con un estudiante A1. Vas a administrarle UNA tarea de speaking (${tarea.tipoCELPIP}). LA TAREA: ${tarea.instruccion}\n\nReglas: presenta la tarea en inglés con frases simples y claras de nivel A1, NUNCA en español. El estudiante SOLO conoce estas palabras de contenido (además de pronombres/artículos/preposiciones básicas y to be): ${vocabulario}. No uses ningún sustantivo, verbo o adjetivo fuera de esa lista. Después de plantear la tarea, dile que tiene unos segundos para pensar y luego que responda (puede hablar por voz o escribir). NO lo interrumpas mientras responde ni corrijas en medio. Cuando termine su respuesta, dale feedback en inglés, en frases A1 (nada de español): primero una cosa que hizo bien, luego máximo 3 correcciones (qué dijo → cómo se dice mejor → por qué, muy breve), y una nota de 0 a 100 según claridad, vocabulario y gramática A1. Si tienes modo de voz, plantea la tarea hablada; el estudiante puede responder por voz.`
  const cierre = `\n\nEmpieza tú: plantéale la tarea.`
  return meta ? `${base}${bloqueVeredicto(meta)}${cierre}` : `${base}${cierre}`
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

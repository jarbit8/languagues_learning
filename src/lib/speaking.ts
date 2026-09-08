import type { TareaSpeaking } from '../data/tareasSpeaking'
import { vocabPacks, getGramatica, getVocabPack } from '../data/packs'

// Vocabulario REAL desbloqueado (todas las palabras de los temas 1..tema, no solo los títulos).
// La IA se restringe a esta lista para que el estudiante entienda todo — sin esto, "vocabulario
// A1" es una sugerencia vaga y la IA mete palabras que no ha visto.
export function vocabularioDesbloqueado(tema: number): string {
  const palabras = vocabPacks.filter((p) => p.tema <= tema).flatMap((p) => p.conceptos.map((c) => c.texto))
  return palabras.join(', ')
}

// REPASO DEL TEMA (2026-09-08, él: "el prompt que le diste a la IA es muy poco, me hace un par
// de preguntas y para; quiero que me pregunte más sobre el tema 1, de todo lo que aprendí, la
// gramática y el vocabulario"). El prompt anterior daba un escenario suelto y un tope de 12
// turnos, así que la IA cerraba en cuanto se agotaba la situación: cuatro o cinco preguntas y
// feedback. Ahora lleva el TEMARIO del tema —sus palabras y sus reglas— y un criterio de cierre
// por COBERTURA, no por número de turnos: no termina hasta haber pasado por todo.
export interface RepasoTema {
  tema: number
  titulo: string
  palabras: string
  gramatica: string
}

// Solo las palabras del tema EN CURSO. `vocabularioDesbloqueado` es la lista de lo que la IA
// puede USAR (temas 1..N); esta es la de lo que tiene que hacerle PRODUCIR a él.
export function palabrasDelTema(tema: number): string {
  const pack = getVocabPack(tema)
  if (!pack) return ''
  return pack.conceptos.map((c) => `${c.texto} (${c.es})`).join(', ')
}

// La regla que ya vio: el día 1 solo la mitad de la lección, el día 2 las dos. Sin `dias` (los
// 23 temas que aún no están repartidos) va la regla entera desde el primer día. Se limpian los
// ** de resaltado, que en la pantalla pintan negritas y en un prompt son ruido.
export function gramaticaDelTema(tema: number, dia: 1 | 2): string {
  const pack = getGramatica(tema)
  if (!pack) return ''
  const limpia = (s: string) => s.replace(/\*\*/g, '')
  if (!pack.dias?.length) return `${pack.titulo}: ${limpia(pack.regla)}`
  return pack.dias
    .slice(0, dia)
    .map((d) => `${d.titulo}: ${limpia(d.regla)}`)
    .join(' | ')
}

export function repasoDelTema(tema: number, dia: 1 | 2): RepasoTema {
  return {
    tema,
    titulo: getVocabPack(tema)?.titulo ?? '',
    palabras: palabrasDelTema(tema),
    gramatica: gramaticaDelTema(tema, dia)
  }
}

// El bloque que convierte la charla en el repaso del tema. Va aparte del system prompt porque
// los exámenes de bloque y final NO lo llevan: ahí se mide una tarea, no se repasa un temario.
function bloqueRepaso(r: RepasoTema): string {
  return `\n\nESTO NO ES UNA CHARLA CORTA, ES EL REPASO ORAL DEL TEMA ${r.tema} (${r.titulo}). Tu trabajo es hacerme hablar de TODO lo que ese tema enseña, no solo del escenario. Reglas del repaso:\n1) HAZ AL MENOS 15 PREGUNTAS antes de cerrar. Si respondo con una palabra suelta, repregunta hasta que conteste con una frase completa; esa repregunta no cuenta como pregunta nueva.\n2) TIENES QUE HACERME USAR ESTAS PALABRAS DEL TEMA, todas, sin excepción (el español entre paréntesis es para ti, NO me lo escribas): ${r.palabras}. Ve tachándolas mentalmente y, cuando queden pocas, pregunta justo por esas.\n3) TIENES QUE HACERME PRODUCIR ESTA GRAMÁTICA, varias veces cada cosa: ${r.gramatica}. No me la expliques: hazme preguntas que me obliguen a usarla.\n4) Varía el tipo de pregunta para que no parezca un cuestionario: pregunta directa, pregunta sobre otra persona, pídeme que te pregunte yo a ti, dame una situación y pregúntame qué diría.\n5) NO CIERRES por número de turnos ni porque se agote el escenario. Cierra solo cuando hayas cubierto las palabras y la gramática de arriba, o cuando yo escriba 'terminar'. Si intento despedirme antes, dime en inglés que aún faltan cosas y sigue preguntando.`
}

// System prompt literal del tutor (skill speaking-ai), interpolando variables.
// Inmersión total: el tutor NUNCA usa español, ni para traducir ni para explicar,
// tampoco en el feedback de cierre — como le hablaría a un niño bilingüe.
export function construirSystemPrompt(escenario: string, vocabulario: string): string {
  return `Eres un tutor de inglés conversando con un estudiante A1 sobre: ${escenario}. Responde SIEMPRE en inglés, nunca en español, ni para traducir ni para explicar — háblale como a un niño bilingüe que ya te entiende. Frases de máx 8 palabras. MUY IMPORTANTE — el estudiante SOLO conoce estas palabras de contenido (sustantivos, verbos, adjetivos), además de pronombres/artículos/preposiciones básicas y el verbo to be: ${vocabulario}. No uses NINGÚN sustantivo, verbo o adjetivo fuera de esa lista — si no está ahí, el estudiante no lo va a entender. Una pregunta por turno, cálido y natural. Si el estudiante escribe en español, respóndele solo en inglés y sigue la conversación, sin traducir lo que dijo. Si comete un error, NO corrijas en el momento, recuérdalo para el cierre. Al cerrar, hazlo TAMBIÉN en inglés con frases simples A1 (nada de español): 1 cosa buena + máx 5 errores con corrección y una explicación breve.`
}

// Prompt listo para copiar y pegar como primer mensaje en cualquier otra app de IA
// (Claude, ChatGPT...): la app nunca habla con ninguna IA por su cuenta.
export function construirPromptCopiable(escenario: string, vocabulario: string, repaso?: RepasoTema): string {
  const system = construirSystemPrompt(escenario, vocabulario)
  return `${system}${repaso ? bloqueRepaso(repaso) : ''}\n\nEmpieza tú: salúdame y hazme la primera pregunta sobre el escenario. Recuerda: todo el rato en inglés, nunca en español, y solo con las palabras que ya conozco.`
}

// El speaking es la prueba que decide si el estudiante avanza, así que la IA tiene que dar un
// veredicto explícito. Ese veredicto (y SOLO él) va en español: es metalenguaje administrativo,
// no práctica del idioma — mismo criterio por el que la pantalla de Gramática sigue en español.
// El aviso anti-complacencia importa: si no se le pide, el modelo tiende a aprobar por cortesía.
function bloqueVeredicto(meta: string): string {
  return `\n\nDECISIÓN FINAL — es la parte más importante: esta tarea es la prueba que decide ${meta}. Después del feedback, cierra SIEMPRE con el veredicto. Esta última parte, y solo esta, va en ESPAÑOL, porque es una decisión que el estudiante tiene que entender sin ninguna duda. Formato exacto:\nVEREDICTO: LISTO ✅   (o bien)   VEREDICTO: AÚN NO ⏳\ny debajo UNA sola frase en español: si es LISTO, qué es lo que ya domina; si es AÚN NO, exactamente qué tiene que practicar antes de volver a intentarlo.\nDi LISTO solo si cumple casi todo esto: responde lo que la tarea pide sin irse por las ramas, habla en frases completas y no en palabras sueltas, se le entiende a la primera, usa el vocabulario y la gramática de su nivel, y no se pasa al español. Sé honesto y exigente: si todavía no está, dile AÚN NO. Aprobarlo antes de tiempo no le hace ningún favor, porque se va a encontrar el problema más adelante.`
}

// Examen de HABLAR de un tema: el mismo roleplay del escenario que en Practicar, pero la
// IA cierra decidiendo si lo da por dominado. El veredicto se lee, no se parsea: este prompt
// se copia y se pega en una IA cualquiera.
export function construirPromptHablarExamen(
  escenario: string,
  vocabulario: string,
  meta: string,
  repaso?: RepasoTema
): string {
  const system = construirSystemPrompt(escenario, vocabulario)
  return `${system}${repaso ? bloqueRepaso(repaso) : ''}${bloqueVeredicto(meta)}

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

import { getListening, getReading, getWriting, dialogosDe } from '../data/packs'
import { bloqueDeTema } from './curriculum'
import { preguntaDeListening } from './preguntas'
import { escenarioDe } from '../data/escenarios'
import { construirPromptHablarExamen, vocabularioDesbloqueado } from './speaking'
import type { ConsignaWriting, LineaDialogo, Pregunta, TextoReading } from '../types'

// Examen POR TEMA de las cuatro habilidades.
//
// CONTENIDO PROPIO (2026-08-30, pedido del usuario): el examen NO reutiliza el material que
// acaba de practicar. Si la lectura del examen es la misma que leyó ayer, mide memoria y no
// comprensión. Por eso cada tema lleva una pieza de más, la ÚLTIMA de cada lista, reservada
// para el examen: 5 diálogos (4 de práctica + 1), 5 lecturas (4 + 1), 3 consignas (2 + 1) y
// 3 escenarios de hablar (2 + 1). `porDia` reparte solo las de práctica, así que nunca se
// cruzan. Mientras un tema no tenga su pieza de examen, se cae en la primera y no se rompe.
//
// Y además cambian las condiciones: escuchar va sin transcripción, leer va cronometrado y
// hablar cierra con un veredicto de la IA en vez de una charla libre.

// La pieza de examen es la última de la lista; si el tema aún no la tiene, la primera.
const deExamen = <T>(items: T[], conPractica: number): T =>
  items.length > conPractica ? items[items.length - 1] : items[0]

// --- Escuchar: los diálogos del tema seguidos, como un audio largo, y luego TODAS sus
// preguntas. En Practicar se oyen de uno en uno, con transcripción y repeticiones.
export interface ExamenListeningTema {
  lineas: LineaDialogo[]
  preguntas: Pregunta[]
  cuantosDialogos: number
}

export function listeningDeTema(tema: number): ExamenListeningTema | undefined {
  const pack = getListening(tema)
  if (!pack) return undefined
  const dialogos = dialogosDe(pack)
  // Uno solo: el del examen. Antes encadenaba los del tema, que son los que ya practicó.
  const d = deExamen(dialogos, 4)
  return {
    lineas: d.lineas,
    preguntas: d.preguntas.map(preguntaDeListening),
    cuantosDialogos: 1
  }
}

// --- Leer: el texto del tema con sus preguntas, cronometrado.
export interface ExamenReadingTema {
  texto: TextoReading
  preguntas: Pregunta[]
}

export function readingDeTema(tema: number): ExamenReadingTema | undefined {
  const textos = getReading(tema)?.textos ?? []
  const texto = textos.length ? deExamen(textos, 4) : undefined
  if (!texto) return undefined
  return {
    texto,
    preguntas: texto.preguntas.map((p) =>
      preguntaDeListening({ tipo: p.tipo, enunciado: p.enunciado, opciones: p.opciones, respuesta: p.respuesta })
    )
  }
}

// --- Escribir: la consigna de ESE tema (desde 2026-08-29 hay una por tema).
export function consignaDeTema(tema: number): ConsignaWriting | undefined {
  const pack = getWriting(bloqueDeTema(tema))
  const delTema = pack?.consignas.filter((c) => c.tema === tema) ?? []
  return delTema.length ? deExamen(delTema, 2) : pack?.consignas[0]
}

// --- Hablar: el mismo roleplay del tema que en Practicar, pero pidiéndole a la IA que
// decida si aprueba. Reutiliza el bloque de veredicto que ya usan bloque y final.
export function promptHablarExamen(tema: number): string {
  const meta = `si ya domina hablando el tema ${tema}, o si necesita practicarlo más antes de darlo por visto`
  return construirPromptHablarExamen(escenarioDe(tema, 3), vocabularioDesbloqueado(tema), meta)
}

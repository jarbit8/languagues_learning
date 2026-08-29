import { getListening, getReading, getWriting, dialogosDe } from '../data/packs'
import { bloqueDeTema } from './curriculum'
import { preguntaDeListening } from './preguntas'
import { escenarios } from '../data/escenarios'
import { construirPromptHablarExamen, vocabularioDesbloqueado } from './speaking'
import type { ConsignaWriting, LineaDialogo, Pregunta, TextoReading } from '../types'

// Examen POR TEMA de las cuatro habilidades. Es la versión de examen de lo que en Practicar
// se hace suelto y sin presión; la diferencia no es el contenido sino las condiciones:
// escuchar va sin transcripción y de un tirón, leer va cronometrado, y hablar cierra con
// un veredicto de la IA en vez de una charla libre.

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
  return {
    lineas: dialogos.flatMap((d) => d.lineas),
    preguntas: dialogos.flatMap((d) => d.preguntas.map(preguntaDeListening)),
    cuantosDialogos: dialogos.length
  }
}

// --- Leer: el texto del tema con sus preguntas, cronometrado.
export interface ExamenReadingTema {
  texto: TextoReading
  preguntas: Pregunta[]
}

export function readingDeTema(tema: number): ExamenReadingTema | undefined {
  const texto = getReading(tema)?.textos[0]
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
  return pack?.consignas.find((c) => c.tema === tema) ?? pack?.consignas[0]
}

// --- Hablar: el mismo roleplay del tema que en Practicar, pero pidiéndole a la IA que
// decida si aprueba. Reutiliza el bloque de veredicto que ya usan bloque y final.
export function promptHablarExamen(tema: number): string {
  const meta = `si ya domina hablando el tema ${tema}, o si necesita practicarlo más antes de darlo por visto`
  return construirPromptHablarExamen(escenarios[tema] ?? '', vocabularioDesbloqueado(tema), meta)
}

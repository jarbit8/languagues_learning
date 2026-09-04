import { getGramatica, getListening, getReading, getVocabPack, getWriting } from '../data/packs'
import { bloqueDeTema } from './curriculum'
import { rateListening } from './listening'
import { porDia } from './porDia'

// CUÁNTO DURA UN DÍA DE ESTUDIO, calculado del contenido real de cada tema y no de un número
// escrito a mano. Sirve para responder la única pregunta que importa del cronograma: si los
// 45 minutos de práctica alcanzan para cubrir el tema o se quedan cortos.
//
// Todo lo de aquí son ESTIMACIONES. Los ritmos salen de lo que ya usa la app o de medidas
// razonables para un principiante, y cada constante lleva de dónde viene. Un día real puede
// irse arriba o abajo unos minutos; lo que sí es fiable es la comparación entre temas y el
// hecho de si un día se pasa del presupuesto o no.

// Velocidad de LECTURA en palabras por minuto. Crece con el nivel: en el tema 1 se descifra
// palabra a palabra y en el 24 ya se leen frases enteras. Es la misma curva con la que se
// dimensionó la longitud de las lecturas (33 ppm en el tema 1 → 65 en el 24).
export const ppm = (tema: number) => 33 + ((tema - 1) * 32) / 23

// Segundos por unidad, medidos sobre lo que hay que hacer de verdad en cada sitio.
const SEG_PREGUNTA_ESCUCHA = 25 // volver a oír el trozo y contestar
const SEG_PREGUNTA_LECTURA = 30 // buscar la respuesta en el texto
const SEG_TARJETA = 45 // leer la palabra, oír el audio, mirar el ejemplo y marcarla
const SEG_EJERCICIO = 55 // pensarlo y escribirlo
const SEG_PALABRA_EXAMEN = 30 // escribir el significado en español
const MIN_LEER_REGLA = 4 // la explicación de gramática del tema
const MIN_MARGEN_EXAMEN = 2 // abrir, corregir y ver el resultado
const PALABRAS_A_MANO = 7 // palabras por minuto escribiendo a mano y pensando en inglés
const MIN_PENSAR_ESCRITURA = 2 // decidir qué vas a contar antes de escribir

// Los 15 minutos de hablar son un tope que se fija el usuario, no algo que se pueda medir del
// contenido: la conversación con la IA dura lo que él quiera que dure.
export const MIN_HABLAR = 15

// El presupuesto que se puso él: 45 minutos antes de dormir, en papel.
export const PRESUPUESTO_PRACTICAR = 45

export interface TiemposDia {
  // bloque de práctica, en el orden en el que lo hace: escuchar → hablar → escribir → leer
  escuchar: number
  hablar: number
  escribir: number
  leer: number
  practicar: number
  // bloque de aprender
  tarjetas: number
  gramatica: number
  examen: number
  aprender: number
  total: number
}

// Duración del audio de un diálogo, con la misma fórmula que enseña la pantalla de Escuchar.
function segundosDeAudio(lineas: { texto: string }[], tema: number): number {
  const palabras = lineas.reduce((n, l) => n + l.texto.trim().split(/\s+/).length, 0)
  return palabras / (rateListening(tema) * 2.4) + lineas.length * 0.35
}

export function tiemposDe(tema: number, dia: 1 | 2): TiemposDia {
  const vocab = getVocabPack(tema)
  const gramatica = getGramatica(tema)
  const listening = getListening(tema)
  const reading = getReading(tema)
  const consignas = getWriting(bloqueDeTema(tema))?.consignas.filter((c) => c.tema === tema) ?? []

  // Solo las cuatro piezas de práctica: la quinta de cada tipo es la del examen y no se ve
  // en estos dos días.
  const dialogos = porDia((listening?.dialogos ?? []).slice(0, 4), dia)
  const textos = porDia((reading?.textos ?? []).slice(0, 4), dia)
  const consigna = consignas.length >= 2 ? consignas[dia - 1] : consignas[0]

  // Escuchar: el audio se oye dos veces (una entera y otra buscando lo que se escapó) y
  // luego se contestan las preguntas.
  const audio = dialogos.reduce((s, d) => s + segundosDeAudio(d.lineas, tema), 0)
  const preguntasEscucha = dialogos.reduce((n, d) => n + d.preguntas.length, 0)
  const escuchar = (audio * 2 + preguntasEscucha * SEG_PREGUNTA_ESCUCHA) / 60

  // Leer: también dos pasadas. La primera para enterarte, la segunda ya buscando.
  const palabrasTexto = textos.reduce((n, t) => n + t.texto.trim().split(/\s+/).length, 0)
  const preguntasLectura = textos.reduce((n, t) => n + t.preguntas.length, 0)
  const leer = (palabrasTexto / ppm(tema)) * 2 + (preguntasLectura * SEG_PREGUNTA_LECTURA) / 60

  const escribir = consigna ? consigna.maxPalabras / PALABRAS_A_MANO + MIN_PENSAR_ESCRITURA : 0

  // El bloque de aprender: el tema se parte entre sus dos días, así que va la mitad.
  const palabrasDelDia = (vocab?.conceptos.length ?? 0) / 2
  const ejerciciosDelDia = (gramatica?.ejercicios.length ?? 0) / 2
  const tarjetas = (palabrasDelDia * SEG_TARJETA) / 60
  const gram = (ejerciciosDelDia * SEG_EJERCICIO) / 60 + MIN_LEER_REGLA
  const examen = (palabrasDelDia * SEG_PALABRA_EXAMEN) / 60 + MIN_MARGEN_EXAMEN

  const practicar = escuchar + MIN_HABLAR + escribir + leer
  const aprender = tarjetas + gram + examen

  return {
    escuchar,
    hablar: MIN_HABLAR,
    escribir,
    leer,
    practicar,
    tarjetas,
    gramatica: gram,
    examen,
    aprender,
    total: practicar + aprender
  }
}

// Fuera de la app, lo que el usuario decidió sumar por su cuenta.
export const MIN_SERIE = 25 // un capítulo de sitcom, que es lo que dura
export const MIN_CANCION = 15 // una canción trabajada de verdad, una vez por semana

// El resumen que contesta la pregunta de fondo: ¿los 45 minutos alcanzan para el nivel
// entero, o solo para el tema en el que estás? Se recorre el A1 día a día y se cuenta.
export interface ResumenNivel {
  dias: number
  diasQueSePasan: number
  media: number
  peor: { tema: number; dia: 1 | 2; minutos: number }
}

export function resumenDelNivel(temas: number[]): ResumenNivel {
  let suma = 0
  let dias = 0
  let diasQueSePasan = 0
  let peor = { tema: temas[0] ?? 1, dia: 1 as 1 | 2, minutos: 0 }
  for (const tema of temas) {
    for (const dia of [1, 2] as const) {
      const { practicar } = tiemposDe(tema, dia)
      suma += practicar
      dias++
      if (practicar > PRESUPUESTO_PRACTICAR + 1) diasQueSePasan++
      if (practicar > peor.minutos) peor = { tema, dia, minutos: practicar }
    }
  }
  return { dias, diasQueSePasan, media: dias ? suma / dias : 0, peor }
}

import type { LineaDialogo } from '../types'
import { bloqueDeTema } from './curriculum'
import { puntuarVoz, generoVoz } from './audio'

function vocesPara(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('en'))
    .sort((a, b) => puntuarVoz(b) - puntuarVoz(a))
}

// Elige las voces del diálogo: idealmente UNA FEMENINA y UNA MASCULINA (así se distinguen los
// hablantes de forma natural), priorizando siempre la mejor calidad. Si no hay ambos géneros,
// las mejores voces distintas que haya. Devuelve en orden [hablante A, hablante B, ...].
export function vocesDialogo(): SpeechSynthesisVoice[] {
  const voces = vocesPara()
  if (voces.length <= 1) return voces
  const fem = voces.find((v) => generoVoz(v) === 'f')
  const masc = voces.find((v) => generoVoz(v) === 'm')
  const cabeza = fem && masc ? [fem, masc] : [voces[0], voces[1]]
  // Los diálogos son de dos, pero las lecturas convertidas a turnos llegan a tener tres
  // personajes; se añade una tercera voz distinta si el aparato la tiene.
  const resto = voces.filter((v) => !cabeza.includes(v))
  return resto.length ? [...cabeza, resto[0]] : cabeza
}

// Rate 0.85 en bloques 1-2, 0.95 en bloques 3-4 (skill listening-engine).
export function rateListening(tema: number): number {
  return bloqueDeTema(tema) <= 2 ? 0.85 : 0.95
}

// PERFIL DE VOZ POR HABLANTE (2026-09-08, él: "si hablan personas diferentes que sean
// diferentes voces, porque la misma voz confunde").
//
// El reparto de voces ya existía, pero se caía entero cuando el aparato solo tenía UNA voz
// inglesa instalada —que es el caso de su PC— y entonces los dos personajes sonaban idénticos.
// Ahora el tono va SIEMPRE, tenga o no voces de sobra: con voces distintas es un matiz que
// las separa aún más, y con una sola voz es lo único que hay, así que la diferencia se abre
// de par en par (0.7 contra 1.3, más medio punto de velocidad) para que no haya duda de quién
// habla. El orden de los hablantes lo fija el diálogo, así que el mismo personaje suena igual
// de principio a fin y también al tocar su línea suelta en la transcripción.
export interface PerfilVoz {
  voz?: SpeechSynthesisVoice
  pitch: number
  rate: number
}

const TONO_CON_VOCES = [1, 0.92, 1.08]
const TONO_SIN_VOCES = [0.7, 1.3, 1]
const VELOCIDAD_SIN_VOCES = [1, 0.95, 1.05]

export function perfilVoz(idxHablante: number, rateBase: number): PerfilVoz {
  const voces = vocesDialogo()
  const i = Math.max(0, idxHablante)
  if (voces.length >= 2) {
    return { voz: voces[i % voces.length], pitch: TONO_CON_VOCES[i % TONO_CON_VOCES.length], rate: rateBase }
  }
  return {
    voz: voces[0],
    pitch: TONO_SIN_VOCES[i % TONO_SIN_VOCES.length],
    rate: rateBase * VELOCIDAD_SIN_VOCES[i % VELOCIDAD_SIN_VOCES.length]
  }
}

// ¿Puede el aparato dar una voz distinta a cada personaje? La pantalla lo dice en texto: si
// no puede, el estudiante tiene que saber que los va a separar por el tono y no por la voz.
export function hayVocesDistintas(): boolean {
  return vocesDialogo().length >= 2
}

export function hablantesDe(lineas: LineaDialogo[]): string[] {
  return [...new Set(lineas.map((l) => l.hablante))]
}

// Reproduce el diálogo línea por línea, cada personaje con su perfil de voz.
export function reproducirDialogo(
  lineas: LineaDialogo[],
  tema: number,
  opts: { lento?: boolean; onLinea?: (i: number) => void; onFin?: () => void } = {}
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const hablantes = hablantesDe(lineas)
  const rate = opts.lento ? Math.max(0.5, rateListening(tema) - 0.25) : rateListening(tema)

  lineas.forEach((linea, i) => {
    const u = new SpeechSynthesisUtterance(linea.texto)
    u.lang = 'en-US'
    const perfil = perfilVoz(hablantes.indexOf(linea.hablante), rate)
    if (perfil.voz) u.voice = perfil.voz
    u.pitch = perfil.pitch
    u.rate = perfil.rate
    u.onstart = () => opts.onLinea?.(i)
    if (i === lineas.length - 1) u.onend = () => opts.onFin?.()
    window.speechSynthesis.speak(u)
  })
}

// idxHablante permite reproducir una línea suelta con la MISMA voz que tiene ese hablante en el diálogo.
export function reproducirLinea(
  texto: string,
  tema: number,
  opts: { lento?: boolean; idxHablante?: number } = {}
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const rate = opts.lento ? Math.max(0.5, rateListening(tema) - 0.25) : rateListening(tema)
  const perfil = perfilVoz(opts.idxHablante ?? 0, rate)
  const u = new SpeechSynthesisUtterance(texto)
  u.lang = 'en-US'
  if (perfil.voz) u.voice = perfil.voz
  u.pitch = perfil.pitch
  u.rate = perfil.rate
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export function detener() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
}

// DELETREO. Pasarle "ANA" al TTS no sirve: lee la palabra, no las letras. Hay que mandar cada
// letra como una utterance suelta — encoladas salen con la pausa natural entre ellas, que
// además es como se deletrea de verdad. `frase` envuelve al deletreo ("My name is {}."): sus
// trozos van a velocidad de diálogo y solo las letras van despacio.
export function reproducirDeletreo(
  texto: string,
  opts: { lento?: boolean; frase?: string; onFin?: () => void } = {}
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const voz = vocesDialogo()[0]
  const rLetra = opts.lento ? 0.5 : 0.7
  const rFrase = opts.lento ? 0.6 : 0.85
  const [antes, despues = ''] = (opts.frase ?? '{}').split('{}')
  const conLetras = (s: string) => /[a-z]/i.test(s)
  // El punto que cierra el hueco ("... is {}. Nice to meet you.") se queda pegado al principio
  // del trozo de detrás y sale como una utterance de un punto suelto.
  const cola = despues.replace(/^[\s.,;:!?]+/, '')
  const partes = [
    ...(conLetras(antes) ? [{ t: antes.trim(), r: rFrase }] : []),
    ...[...texto].filter(conLetras).map((c) => ({ t: c.toUpperCase() + '.', r: rLetra })),
    ...(conLetras(cola) ? [{ t: cola.trim(), r: rFrase }] : [])
  ]

  partes.forEach((parte, i) => {
    const u = new SpeechSynthesisUtterance(parte.t)
    u.lang = 'en-US'
    u.rate = parte.r
    if (voz) u.voice = voz
    if (i === partes.length - 1) u.onend = () => opts.onFin?.()
    window.speechSynthesis.speak(u)
  })
}

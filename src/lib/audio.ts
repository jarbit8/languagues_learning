import type { Idioma } from '../types'

// Web Speech API. Las voces cargan de forma asíncrona (evento voiceschanged).
let voces: SpeechSynthesisVoice[] = []

function cargarVoces() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  voces = window.speechSynthesis.getVoices()
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cargarVoces()
  window.speechSynthesis.onvoiceschanged = cargarVoces
}

// Puntúa la calidad probable de una voz por su nombre: las "Online/Natural/Neural" del
// sistema suenan mucho mejor que las viejas SAPI de escritorio (David, Zira, Mark...).
export function puntuarVoz(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase()
  let score = 0
  if (/online|natural|neural|enhanced|premium|wavenet|plus/.test(n)) score += 10
  if (/\bsiri\b/.test(n)) score += 8 // voces de Apple, muy naturales
  if (/google/.test(n)) score += 5 // voces de Chrome, mejores que eSpeak/SAPI viejas
  if (!v.localService) score += 3 // online suele ser más natural
  if (/desktop|mobile compact|espeak|compact/.test(n)) score -= 4 // las más robóticas
  if (/david|zira|mark|hortense/.test(n)) score -= 2 // SAPI viejas de Windows
  return score
}

// Género probable de una voz por su nombre, para repartir hombre/mujer entre los 2 hablantes.
const VOZ_FEM =
  /(zira|aria|jenny|michelle|eva|emma|clara|hazel|heather|linda|susan|catherine|karen|moira|tessa|fiona|serena|samantha|\bana\b|hortense|julie|denise|c[eé]line|am[eé]lie|audrey|marie|virginie|sabina|paulina|female|femme|woman)/i
const VOZ_MASC =
  /(david|mark|guy|christopher|eric|\balex\b|daniel|fred|oliver|george|james|ryan|paul|claude|henri|thomas|nicolas|guillaume|sylvain|jean|pierre|antoine|matthew|brian|raul|male|homme)/i

export function generoVoz(v: SpeechSynthesisVoice): 'f' | 'm' | '?' {
  const n = v.name.toLowerCase()
  if (VOZ_FEM.test(n)) return 'f'
  if (VOZ_MASC.test(n)) return 'm'
  return '?'
}

function elegirVoz(lang: string, fallback: string): SpeechSynthesisVoice | undefined {
  const norm = (s: string) => s.toLowerCase().replace('_', '-')
  const candidatas = (idiomaBuscado: string) =>
    voces.filter((v) => norm(v.lang).startsWith(norm(idiomaBuscado))).sort((a, b) => puntuarVoz(b) - puntuarVoz(a))
  return candidatas(lang)[0] ?? candidatas(fallback)[0]
}

let velocidadGuardada = Number(localStorage.getItem('audio.rate') ?? '0.9') || 0.9

export function setVelocidad(rate: number) {
  velocidadGuardada = rate
  localStorage.setItem('audio.rate', String(rate))
}

export function getVelocidad() {
  return velocidadGuardada
}

export function hablar(texto: string, idioma: Idioma, rate = velocidadGuardada) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(texto)
  const voz = idioma === 'en' ? elegirVoz('en-US', 'en-GB') : elegirVoz('fr-FR', 'fr-CA')
  if (voz) u.voice = voz
  u.lang = idioma === 'en' ? 'en-US' : 'fr-FR'
  u.rate = rate
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export function estadoVoces() {
  return {
    en: !!elegirVoz('en-US', 'en-GB'),
    fr: !!elegirVoz('fr-FR', 'fr-CA'),
    total: voces.length
  }
}

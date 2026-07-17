import type { Idioma, LineaDialogo } from '../types'
import { bloqueDeTema } from './curriculum'
import { puntuarVoz } from './audio'

function vocesPara(idioma: Idioma): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  const prefijo = idioma === 'en' ? 'en' : 'fr'
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith(prefijo))
    .sort((a, b) => puntuarVoz(b) - puntuarVoz(a))
}

// Rate 0.85 en bloques 1-2, 0.95 en bloques 3-4 (skill listening-engine).
export function rateListening(tema: number): number {
  return bloqueDeTema(tema) <= 2 ? 0.85 : 0.95
}

// Reproduce el diálogo línea por línea con dos voces distintas (o pitch 0.9/1.1 si solo hay una).
export function reproducirDialogo(
  lineas: LineaDialogo[],
  idioma: Idioma,
  tema: number,
  opts: { lento?: boolean; onLinea?: (i: number) => void; onFin?: () => void } = {}
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const voces = vocesPara(idioma)
  const hablantes = [...new Set(lineas.map((l) => l.hablante))]
  const rate = opts.lento ? Math.max(0.5, rateListening(tema) - 0.25) : rateListening(tema)

  lineas.forEach((linea, i) => {
    const u = new SpeechSynthesisUtterance(linea.texto)
    u.lang = idioma === 'en' ? 'en-US' : 'fr-FR'
    u.rate = rate
    const idxHablante = hablantes.indexOf(linea.hablante)
    if (voces.length >= 2) {
      u.voice = voces[idxHablante % voces.length]
    } else {
      if (voces.length === 1) u.voice = voces[0]
      u.pitch = idxHablante % 2 === 0 ? 0.9 : 1.1
    }
    u.onstart = () => opts.onLinea?.(i)
    if (i === lineas.length - 1) u.onend = () => opts.onFin?.()
    window.speechSynthesis.speak(u)
  })
}

export function reproducirLinea(texto: string, idioma: Idioma, tema: number, lento = false) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(texto)
  u.lang = idioma === 'en' ? 'en-US' : 'fr-FR'
  u.rate = lento ? Math.max(0.5, rateListening(tema) - 0.25) : rateListening(tema)
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export function detener() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
}

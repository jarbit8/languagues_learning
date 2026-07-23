import type { Idioma, LineaDialogo } from '../types'
import { bloqueDeTema } from './curriculum'
import { puntuarVoz, generoVoz } from './audio'

function vocesPara(idioma: Idioma): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  const prefijo = idioma === 'en' ? 'en' : 'fr'
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith(prefijo))
    .sort((a, b) => puntuarVoz(b) - puntuarVoz(a))
}

// Elige las voces para un diálogo de 2 personas: idealmente UNA FEMENINA y UNA MASCULINA
// (así se distinguen los hablantes de forma natural), priorizando siempre la mejor calidad.
// Si no hay ambos géneros, usa las dos mejores voces distintas. Si solo hay una, la pantalla
// cae a variar el tono (ver reproducir*). Devuelve las voces en orden [hablante A, hablante B].
export function vocesDialogo(idioma: Idioma): SpeechSynthesisVoice[] {
  const voces = vocesPara(idioma)
  if (voces.length <= 1) return voces
  const fem = voces.find((v) => generoVoz(v) === 'f')
  const masc = voces.find((v) => generoVoz(v) === 'm')
  if (fem && masc) return [fem, masc]
  return [voces[0], voces[1]]
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
  const voces = vocesDialogo(idioma)
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
      // Solo hay una voz (o ninguna) para el idioma: distinguir hablantes variando el tono.
      if (voces.length === 1) u.voice = voces[0]
      u.pitch = idxHablante % 2 === 0 ? 0.8 : 1.2
    }
    u.onstart = () => opts.onLinea?.(i)
    if (i === lineas.length - 1) u.onend = () => opts.onFin?.()
    window.speechSynthesis.speak(u)
  })
}

// idxHablante permite reproducir una línea suelta con la MISMA voz que tiene ese hablante en el diálogo.
export function reproducirLinea(
  texto: string,
  idioma: Idioma,
  tema: number,
  opts: { lento?: boolean; idxHablante?: number } = {}
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(texto)
  u.lang = idioma === 'en' ? 'en-US' : 'fr-FR'
  u.rate = opts.lento ? Math.max(0.5, rateListening(tema) - 0.25) : rateListening(tema)
  const voces = vocesDialogo(idioma)
  const idx = opts.idxHablante ?? 0
  if (voces.length >= 2) {
    u.voice = voces[idx % voces.length]
  } else {
    if (voces.length === 1) u.voice = voces[0]
    u.pitch = idx % 2 === 0 ? 0.8 : 1.2
  }
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export function detener() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
}

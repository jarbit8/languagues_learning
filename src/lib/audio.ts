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

function elegirVoz(lang: string, fallback: string): SpeechSynthesisVoice | undefined {
  const norm = (s: string) => s.toLowerCase().replace('_', '-')
  return (
    voces.find((v) => norm(v.lang).startsWith(norm(lang))) ??
    voces.find((v) => norm(v.lang).startsWith(norm(fallback)))
  )
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

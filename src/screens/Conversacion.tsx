import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Idioma } from '../types'
import { temaEnCurso } from '../lib/progreso'
import { escenarioDe } from '../data/escenarios'
import { getVocabPack, vocabPacks } from '../data/packs'
import { hayApiKey } from '../lib/apiKey'
import { construirPromptCopiable } from '../lib/speaking'
import ChatSpeaking from '../components/ChatSpeaking'

function temasDesbloqueadosTexto(tema: number): string {
  const titulos = vocabPacks.filter((p) => p.tema <= tema).map((p) => p.titulo)
  return titulos.slice(-6).join(', ') || 'saludos básicos'
}

function CopiarPrompt({ idioma, tema }: { idioma: Idioma; tema: number }) {
  const [copiado, setCopiado] = useState(false)
  const prompt = construirPromptCopiable(idioma, escenarioDe(tema), temasDesbloqueadosTexto(tema))

  async function copiar() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="tarjeta flex flex-col gap-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Pega esto como tu primer mensaje en cualquier chat de IA (Claude, ChatGPT...) y practica ahí. El tutor te
        responderá siempre en {idioma === 'en' ? 'inglés' : 'francés'}, nunca en español.
      </p>
      <textarea
        readOnly
        value={prompt}
        rows={9}
        onFocus={(e) => e.target.select()}
        className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
      />
      <button onClick={copiar} className="btn-primary">
        {copiado ? '¡Copiado! ✓' : 'Copiar prompt 📋'}
      </button>
    </div>
  )
}

export default function Conversacion() {
  const temaActual = useLiveQuery(() => temaEnCurso(), [], 1) ?? 1
  const [tema, setTema] = useState<number | null>(null)
  const [idioma, setIdioma] = useState<Idioma>('en')
  const [enSesion, setEnSesion] = useState(false)
  const [verPrompt, setVerPrompt] = useState(false)

  const temaSel = tema ?? temaActual
  const temasDisponibles = Array.from({ length: temaActual }, (_, i) => i + 1)
  const pack = getVocabPack(temaSel)
  const conKey = hayApiKey()

  if (enSesion) {
    return (
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setEnSesion(false)}
          className="self-start text-sm text-slate-500 underline dark:text-slate-400"
        >
          ← Cambiar escenario
        </button>
        <ChatSpeaking key={`${idioma}-${temaSel}`} idioma={idioma} tema={temaSel} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="tarjeta flex flex-col gap-3">
        <label className="text-sm font-semibold">Idioma</label>
        <div className="flex rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
          {(['en', 'fr'] as const).map((i) => (
            <button
              key={i}
              onClick={() => setIdioma(i)}
              className={`flex-1 rounded-lg py-2 text-sm font-bold ${
                idioma === i ? (i === 'en' ? 'chip-en' : 'chip-fr') : 'text-slate-500'
              }`}
            >
              {i === 'en' ? 'Inglés' : 'Francés'}
            </button>
          ))}
        </div>

        <label className="text-sm font-semibold">Escenario (tema)</label>
        <select
          value={temaSel}
          onChange={(e) => setTema(Number(e.target.value))}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
        >
          {temasDisponibles.map((t) => (
            <option key={t} value={t}>
              Tema {t} — {getVocabPack(t)?.titulo}
            </option>
          ))}
        </select>
        <p className="text-sm text-slate-500 dark:text-slate-400">{escenarioDe(temaSel)}</p>

        {conKey && (
          <button onClick={() => setEnSesion(true)} className="btn-primary">
            Empezar a hablar aquí
          </button>
        )}
        <button onClick={() => setVerPrompt((v) => !v)} className={conKey ? 'btn' : 'btn-primary'}>
          {verPrompt
            ? 'Ocultar prompt'
            : conKey
              ? 'O copia el prompt para hablar en otra app'
              : 'Copiar prompt para hablar en otra app'}
        </button>
      </div>

      {!conKey && !verPrompt && (
        <p className="tarjeta text-sm text-slate-500 dark:text-slate-400">
          No tienes una API key de Anthropic pegada en Ajustes, así que no puedes hablar aquí dentro — pero puedes
          copiar el prompt de arriba y pegarlo en cualquier otra IA para practicar igual.
        </p>
      )}
      {verPrompt && <CopiarPrompt idioma={idioma} tema={temaSel} />}

      {pack && <p className="text-center text-xs text-slate-400">Vocabulario disponible: temas 1 a {temaSel}</p>}
    </div>
  )
}

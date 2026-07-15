import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Idioma } from '../types'
import { temaEnCurso } from '../lib/progreso'
import { escenarioDe } from '../data/escenarios'
import { getVocabPack } from '../data/packs'
import { hayApiKey } from '../lib/apiKey'
import ChatSpeaking from '../components/ChatSpeaking'

export default function Conversacion() {
  const temaActual = useLiveQuery(() => temaEnCurso(), [], 1) ?? 1
  const [tema, setTema] = useState<number | null>(null)
  const [idioma, setIdioma] = useState<Idioma>('en')
  const [enSesion, setEnSesion] = useState(false)

  const temaSel = tema ?? temaActual
  const temasDisponibles = Array.from({ length: temaActual }, (_, i) => i + 1)
  const pack = getVocabPack(temaSel)

  if (!hayApiKey()) {
    return (
      <p className="tarjeta text-slate-500 dark:text-slate-400">
        Necesitas pegar tu API key de Anthropic en Ajustes (dentro de Progreso) para hablar con el tutor.
        Todo lo demás de la app sigue funcionando sin ella.
      </p>
    )
  }

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

        <button onClick={() => setEnSesion(true)} className="btn-primary">
          Empezar a hablar
        </button>
      </div>
      {pack && (
        <p className="text-center text-xs text-slate-400">
          Vocabulario disponible: temas 1 a {temaSel}
        </p>
      )}
    </div>
  )
}

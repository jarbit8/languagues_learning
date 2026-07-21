import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Idioma } from '../types'
import { temaEnCurso } from '../lib/progreso'
import { escenarioDe } from '../data/escenarios'
import { getVocabPack } from '../data/packs'
import { construirPromptCopiable, vocabularioDesbloqueado } from '../lib/speaking'
import CopiarPrompt from '../components/CopiarPrompt'

export default function Conversacion() {
  const temaActual = useLiveQuery(() => temaEnCurso(), [], 1) ?? 1
  const [tema, setTema] = useState<number | null>(null)
  const [idioma, setIdioma] = useState<Idioma>('en')

  const temaSel = tema ?? temaActual
  const temasDisponibles = Array.from({ length: temaActual }, (_, i) => i + 1)
  const pack = getVocabPack(temaSel)
  const nombreIdioma = idioma === 'en' ? 'inglés' : 'francés'

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
      </div>

      <CopiarPrompt
        prompt={construirPromptCopiable(idioma, escenarioDe(temaSel), vocabularioDesbloqueado(temaSel, idioma))}
        descripcion={`Pega esto como tu primer mensaje en cualquier chat de IA (Claude, ChatGPT...) y practica ahí. El tutor te responderá siempre en ${nombreIdioma}, nunca en español.`}
      />

      {pack && <p className="text-center text-xs text-slate-400">Vocabulario disponible: temas 1 a {temaSel}</p>}
    </div>
  )
}

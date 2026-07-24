import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Idioma } from '../types'
import { temaEnCurso } from '../lib/progreso'
import { escenarioDe } from '../data/escenarios'
import { getVocabPack } from '../data/packs'
import { tareasSpeaking, tareaPorId } from '../data/tareasSpeaking'
import { construirPromptCopiable, construirPromptTarea, vocabularioDesbloqueado } from '../lib/speaking'
import CopiarPrompt from '../components/CopiarPrompt'

export default function Conversacion() {
  const temaActual = useLiveQuery(() => temaEnCurso(), [], 1) ?? 1
  const [tema, setTema] = useState<number | null>(null)
  const [idioma, setIdioma] = useState<Idioma>('en')
  const [modo, setModo] = useState<string>('libre') // 'libre' o id de tarea CELPIP

  const temaSel = tema ?? temaActual
  const temasDisponibles = Array.from({ length: temaActual }, (_, i) => i + 1)
  const pack = getVocabPack(temaSel)
  const nombreIdioma = idioma === 'en' ? 'inglés' : 'francés'
  const vocab = vocabularioDesbloqueado(temaSel, idioma)
  const tarea = modo === 'libre' ? null : tareaPorId(modo)

  const prompt = tarea
    ? construirPromptTarea(idioma, tarea, vocab)
    : construirPromptCopiable(idioma, escenarioDe(temaSel), vocab)

  const descripcion = tarea
    ? `Tarea tipo examen (${tarea.tipoCELPIP}). Pega esto en una IA con voz (ChatGPT voz, Gemini Live...): te plantea la tarea en ${nombreIdioma}, respondes por voz o texto y al final te da feedback con nota.`
    : `Conversación libre. Pega esto en cualquier chat de IA (Claude, ChatGPT...) y practica. El tutor responde siempre en ${nombreIdioma}, nunca en español.`

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

        <label className="text-sm font-semibold">Tipo de práctica</label>
        <select
          value={modo}
          onChange={(e) => setModo(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
        >
          <option value="libre">Conversación libre (roleplay)</option>
          <optgroup label="Tareas tipo examen (CELPIP / IELTS)">
            {tareasSpeaking.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </optgroup>
        </select>

        <label className="text-sm font-semibold">Vocabulario hasta el tema</label>
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
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {tarea ? `${tarea.nombre} · ${tarea.tipoCELPIP}` : escenarioDe(temaSel)}
        </p>
      </div>

      <CopiarPrompt prompt={prompt} descripcion={descripcion} />

      {pack && <p className="text-center text-xs text-slate-400">Vocabulario disponible: temas 1 a {temaSel}</p>}
    </div>
  )
}

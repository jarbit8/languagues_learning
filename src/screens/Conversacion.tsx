import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { temaEnCurso } from '../lib/progreso'
import { escenarioDe } from '../data/escenarios'
import { getVocabPack } from '../data/packs'
import { construirPromptCopiable, vocabularioDesbloqueado } from '../lib/speaking'
import CopiarPrompt from '../components/CopiarPrompt'

// Práctica libre de speaking: SOLO conversación/roleplay del tema. Hubo un selector para elegir
// también una tarea tipo CELPIP y el usuario lo quitó — las tareas de examen siguen vivas en
// data/tareasSpeaking.ts porque las usan ExamenBloque y ExamenFinal, ahí sí tienen sentido.
export default function Conversacion() {
  const temaActual = useLiveQuery(() => temaEnCurso(), [], 1) ?? 1
  const [tema, setTema] = useState<number | null>(null)
  // Un tema son dos días de estudio y cada uno lleva su propio escenario.
  const [dia, setDia] = useState<1 | 2>(1)

  const temaSel = tema ?? temaActual
  const temasDisponibles = Array.from({ length: temaActual }, (_, i) => i + 1)
  const pack = getVocabPack(temaSel)
  const vocab = vocabularioDesbloqueado(temaSel)

  const prompt = construirPromptCopiable(escenarioDe(temaSel, dia), vocab)

  return (
    <div className="flex flex-col gap-4">
      <div className="tarjeta flex flex-col gap-3">
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
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
          {([1, 2] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDia(d)}
              className={`rounded-lg py-1.5 text-sm font-semibold ${
                dia === d ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'
              }`}
            >
              Día {d}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{escenarioDe(temaSel, dia)}</p>
      </div>

      <CopiarPrompt
        prompt={prompt}
        descripcion="Conversación libre. Pega esto en cualquier chat de IA (Claude, ChatGPT...) y practica. El tutor responde siempre en inglés, nunca en español."
      />

      {pack && <p className="text-center text-xs text-slate-400">Vocabulario disponible: temas 1 a {temaSel}</p>}
    </div>
  )
}

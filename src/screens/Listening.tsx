import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Idioma } from '../types'
import { temaEnCurso } from '../lib/progreso'
import { escenarioDe } from '../data/escenarios'
import { getVocabPack } from '../data/packs'
import { construirPromptListening, temasDesbloqueadosTexto } from '../lib/speaking'
import CopiarPrompt from '../components/CopiarPrompt'

const RECURSOS: Record<Idioma, { nombre: string; nota: string }[]> = {
  en: [
    { nombre: 'VOA Learning English (nivel 1)', nota: 'noticias con vocabulario simple' },
    { nombre: 'BBC Learning English', nota: 'lecciones cortas y podcasts' },
    { nombre: 'Extra English (serie)', nota: 'sitcom pensada para aprender' },
    { nombre: 'Dibujos animados con subtítulos en inglés', nota: 'listening pasivo' }
  ],
  fr: [
    { nombre: 'TV5Monde — Apprendre le français A1', nota: 'ejercicios oficiales por nivel' },
    { nombre: 'Alice Ayel (YouTube)', nota: 'francés cotidiano, muy claro' },
    { nombre: 'Français avec Pierre', nota: 'gramática explicada en francés simple' },
    { nombre: 'Extr@ en français (serie)', nota: 'sitcom pensada para aprender' },
    { nombre: 'Coffee Break French', nota: 'podcast progresivo' }
  ]
}

export default function Listening() {
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
        prompt={construirPromptListening(idioma, escenarioDe(temaSel), temasDesbloqueadosTexto(temaSel))}
        descripcion={`Pega esto en una IA con voz (modo voz de ChatGPT, Gemini Live...) para oír mejores voces que las del navegador. Te contará una historia en ${nombreIdioma} y luego te hará preguntas sobre ella ahí mismo en el chat — respóndele por voz o texto y al final te dice cómo te fue.`}
      />

      {pack && <p className="text-center text-xs text-slate-400">Vocabulario disponible: temas 1 a {temaSel}</p>}

      <details className="tarjeta">
        <summary className="cursor-pointer font-semibold">Recursos externos para practicar más</summary>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          {RECURSOS[idioma].map((r) => (
            <div key={r.nombre}>
              <p className="font-semibold">{r.nombre}</p>
              <p className="text-slate-500 dark:text-slate-400">{r.nota}</p>
            </div>
          ))}
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            💡 Subtítulos siempre en el idioma que escuchas, nunca en español. El listening pasivo cuenta,
            pero intenta al menos 3 sesiones activas por semana con transcripción.
          </p>
        </div>
      </details>
    </div>
  )
}

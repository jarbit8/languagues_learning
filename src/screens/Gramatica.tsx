import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Idioma } from '../types'
import { getGramatica } from '../data/packs'
import { getProgresoTema, marcarGramaticaCompletada } from '../lib/progreso'
import { preguntaDeEjercicio } from '../lib/preguntas'
import { hablar } from '../lib/audio'
import ExamRunner from '../components/ExamRunner'

function LeccionCard({
  tema,
  idioma,
  completada,
  onPracticar
}: {
  tema: number
  idioma: Idioma
  completada: boolean
  onPracticar: (idioma: Idioma) => void
}) {
  const pack = getGramatica(tema, idioma)
  if (!pack) return null

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`tarjeta flex flex-col gap-2 border-l-4 ${
          idioma === 'en' ? 'border-en' : 'border-fr'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={idioma === 'en' ? 'chip-en' : 'chip-fr'}>{idioma === 'en' ? 'EN' : 'FR'}</span>
          <h2 className="text-lg font-black">{pack.titulo}</h2>
          {completada && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              ✓ Completado
            </span>
          )}
        </div>
        <p className="text-base leading-relaxed">{pack.regla}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="tarjeta flex flex-col gap-1.5 !bg-sky-50 dark:!bg-sky-950/40">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-sky-600 dark:text-sky-300">
            <span className="text-base">🗣️</span> Cómo suena
          </p>
          <p className="text-sm text-sky-900 dark:text-sky-100">{pack.pronunciacion}</p>
        </div>

        <div className="tarjeta flex flex-col gap-1.5 !bg-amber-50 dark:!bg-amber-950/40">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-300">
            <span className="text-base">⚠️</span> Ojo con esto
          </p>
          <p className="text-sm text-amber-900 dark:text-amber-100">{pack.trampa}</p>
        </div>
      </div>

      <div className="tarjeta flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Ejemplos · toca 🔊 para escuchar</p>
        <div className="flex flex-col gap-2">
          {pack.ejemplos.map((ej, i) => (
            <button
              key={i}
              onClick={() => hablar(ej.frase, idioma)}
              className={`flex min-h-[52px] items-center gap-3 rounded-xl px-3 py-2 text-left transition active:scale-[0.98] ${
                idioma === 'en' ? 'bg-en/5 dark:bg-en/10' : 'bg-fr/5 dark:bg-fr/10'
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                  idioma === 'en'
                    ? 'bg-en text-white'
                    : 'bg-fr text-white'
                }`}
              >
                {i + 1}
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-sm font-semibold">{ej.frase}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{ej.traduccion}</span>
                {ej.comoSeLee && (
                  <span className="mt-0.5 text-xs italic text-indigo-500 dark:text-indigo-300">
                    🗨️ se lee: "{ej.comoSeLee}"
                  </span>
                )}
              </span>
              <span className="text-xl">🔊</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onPracticar(idioma)}
        className={completada ? 'btn bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' : `btn-primary`}
      >
        {completada ? `↻ Repetir ejercicios` : `▶ Practicar · ${pack.ejercicios.length} ejercicios`}
      </button>
    </div>
  )
}

export default function Gramatica({ tema }: { tema: number }) {
  const [idioma, setIdioma] = useState<Idioma>('en')
  const [practicando, setPracticando] = useState<Idioma | null>(null)
  const [fin, setFin] = useState<{ aciertos: number; total: number } | null>(null)
  const progreso = useLiveQuery(() => getProgresoTema(tema), [tema])

  if (practicando) {
    const pack = getGramatica(tema, practicando)
    if (!pack) return null
    if (fin) {
      const pct = Math.round((fin.aciertos / fin.total) * 100)
      const emoji = pct >= 90 ? '🎉' : pct >= 70 ? '👍' : '💪'
      const mensaje = pct >= 90 ? '¡Excelente!' : pct >= 70 ? '¡Bien hecho!' : 'Sigue practicando'
      return (
        <div className="flex flex-col gap-4">
          <div className="tarjeta flex flex-col items-center gap-2 py-8">
            <span className="text-5xl">{emoji}</span>
            <span className="text-5xl font-black">{pct}%</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">{mensaje}</span>
            <span className="text-slate-500 dark:text-slate-400">
              {fin.aciertos} de {fin.total} · lección completada ✓
            </span>
          </div>
          <button
            onClick={() => {
              setFin(null)
              setPracticando(null)
            }}
            className="btn-primary"
          >
            Volver a gramática
          </button>
        </div>
      )
    }
    const preguntas = pack.ejercicios.map((e) => preguntaDeEjercicio(e, practicando))
    return (
      <ExamRunner
        preguntas={preguntas}
        etiqueta={practicando === 'en' ? 'Inglés' : 'Francés'}
        onFinish={async (aciertos, total) => {
          await marcarGramaticaCompletada(tema, practicando)
          setFin({ aciertos, total })
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
        {(['en', 'fr'] as const).map((i) => (
          <button
            key={i}
            onClick={() => setIdioma(i)}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${
              idioma === i ? (i === 'en' ? 'chip-en !py-2' : 'chip-fr !py-2') : 'text-slate-500'
            }`}
          >
            {i === 'en' ? '🇬🇧 Inglés' : '🇫🇷 Francés'}
            {i === 'en' && progreso?.gramaticaEnCompletada && ' ✓'}
            {i === 'fr' && progreso?.gramaticaFrCompletada && ' ✓'}
          </button>
        ))}
      </div>

      <LeccionCard
        tema={tema}
        idioma={idioma}
        completada={idioma === 'en' ? !!progreso?.gramaticaEnCompletada : !!progreso?.gramaticaFrCompletada}
        onPracticar={setPracticando}
      />
    </div>
  )
}

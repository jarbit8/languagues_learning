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
    <div className="tarjeta flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className={idioma === 'en' ? 'chip-en' : 'chip-fr'}>{idioma === 'en' ? 'EN' : 'FR'}</span>
        <h3 className="font-bold">{pack.titulo}</h3>
        {completada && <span className="ml-auto text-emerald-500">✓</span>}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">La regla</p>
        <p className="text-sm leading-relaxed">{pack.regla}</p>
      </div>

      <div className="flex flex-col gap-1 rounded-lg bg-sky-50 px-3 py-2 dark:bg-sky-900/30">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">
          🗣️ Cómo suena
        </p>
        <p className="text-sm text-sky-900 dark:text-sky-100">{pack.pronunciacion}</p>
      </div>

      <div className="flex flex-col gap-1 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/30">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
          ⚠️ Ojo con esto
        </p>
        <p className="text-sm text-amber-900 dark:text-amber-100">{pack.trampa}</p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Ejemplos — toca 🔊 para escuchar
        </p>
        {pack.ejemplos.map((ej, i) => (
          <button
            key={i}
            onClick={() => hablar(ej.frase, idioma)}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left dark:bg-slate-900"
          >
            <span className="text-2xl">🔊</span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold">{ej.frase}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{ej.traduccion}</span>
              {ej.comoSeLee && (
                <span className="mt-0.5 text-xs italic text-indigo-500 dark:text-indigo-300">
                  🗨️ se lee: "{ej.comoSeLee}"
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      <button onClick={() => onPracticar(idioma)} className={completada ? 'btn bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' : 'btn-primary'}>
        {completada ? 'Repetir ejercicios' : 'Practicar (15 ejercicios)'}
      </button>
    </div>
  )
}

export default function Gramatica({ tema }: { tema: number }) {
  const [practicando, setPracticando] = useState<Idioma | null>(null)
  const [fin, setFin] = useState<{ aciertos: number; total: number } | null>(null)
  const progreso = useLiveQuery(() => getProgresoTema(tema), [tema])

  if (practicando) {
    const pack = getGramatica(tema, practicando)
    if (!pack) return null
    if (fin) {
      const pct = Math.round((fin.aciertos / fin.total) * 100)
      return (
        <div className="flex flex-col gap-4">
          <div className="tarjeta flex flex-col items-center gap-2 py-8">
            <span className="text-5xl font-black">{pct}%</span>
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
    <div className="flex flex-col gap-3">
      <LeccionCard tema={tema} idioma="en" completada={!!progreso?.gramaticaEnCompletada} onPracticar={setPracticando} />
      <LeccionCard tema={tema} idioma="fr" completada={!!progreso?.gramaticaFrCompletada} onPracticar={setPracticando} />
    </div>
  )
}

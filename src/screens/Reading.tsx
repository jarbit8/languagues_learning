import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Idioma } from '../types'
import { bloqueEnCurso } from '../lib/progreso'
import { getReading } from '../data/packs'
import { preguntaDeListening } from '../lib/preguntas'
import ExamRunner from '../components/ExamRunner'

export default function Reading() {
  const bloqueActual = useLiveQuery(() => bloqueEnCurso(), [], 1) ?? 1
  const [bloque, setBloque] = useState<number | null>(null)
  const [idioma, setIdioma] = useState<Idioma>('en')
  const [examen, setExamen] = useState<number | null>(null)
  const [resultado, setResultado] = useState<{ aciertos: number; total: number } | null>(null)

  const bloqueSel = bloque ?? bloqueActual
  const pack = getReading(bloqueSel, idioma)
  const bloquesDisponibles = Array.from({ length: bloqueActual }, (_, i) => i + 1)

  function reset() {
    setExamen(null)
    setResultado(null)
  }

  if (pack && examen !== null) {
    const texto = pack.textos[examen]
    if (resultado) {
      const pct = Math.round((resultado.aciertos / resultado.total) * 100)
      const emoji = pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪'
      return (
        <div className="flex flex-col gap-4">
          <div className="tarjeta flex flex-col items-center gap-2 py-8">
            <span className="text-5xl">{emoji}</span>
            <span className="text-5xl font-black">{pct}%</span>
            <span className="text-slate-500 dark:text-slate-400">
              {resultado.aciertos} de {resultado.total} correctas
            </span>
          </div>
          <button onClick={reset} className="btn-primary">
            Volver a lectura
          </button>
        </div>
      )
    }
    const preguntas = texto.preguntas.map((p) =>
      preguntaDeListening({ tipo: p.tipo, enunciado: p.enunciado, opciones: p.opciones, respuesta: p.respuesta }, idioma)
    )
    return (
      <div className="flex flex-col gap-4">
        <button onClick={reset} className="self-start text-sm text-slate-500 underline dark:text-slate-400">
          ← Volver al texto
        </button>
        <div className="tarjeta flex flex-col gap-2">
          <h2 className="font-bold">{texto.titulo}</h2>
          <p className="text-sm leading-relaxed">{texto.texto}</p>
        </div>
        <ExamRunner
          preguntas={preguntas}
          etiqueta={`Lectura · ${texto.titulo}`}
          onFinish={(aciertos, total) => setResultado({ aciertos, total })}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <select
          value={bloqueSel}
          onChange={(e) => {
            reset()
            setBloque(Number(e.target.value))
          }}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
        >
          {bloquesDisponibles.map((b) => (
            <option key={b} value={b}>
              Bloque {b} (temas {(b - 1) * 6 + 1}–{b * 6})
            </option>
          ))}
        </select>
        <div className="flex rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
          {(['en', 'fr'] as const).map((i) => (
            <button
              key={i}
              onClick={() => {
                reset()
                setIdioma(i)
              }}
              className={`rounded-lg px-3 py-1 text-sm font-bold ${
                idioma === i ? (i === 'en' ? 'chip-en' : 'chip-fr') : 'text-slate-500'
              }`}
            >
              {i.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Lee el texto y responde las preguntas de comprensión (formato IELTS/TEF). Solo usa vocabulario de temas que ya
        viste.
      </p>

      {!pack ? (
        <p className="tarjeta text-slate-500 dark:text-slate-400">
          Aún no hay lectura para el bloque {bloqueSel} en {idioma === 'en' ? 'inglés' : 'francés'}.
        </p>
      ) : (
        pack.textos.map((t, i) => (
          <div key={i} className="tarjeta flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${
                  idioma === 'en' ? 'bg-en' : 'bg-fr'
                }`}
              >
                {i + 1}
              </span>
              <h2 className="flex-1 font-bold">{t.titulo}</h2>
            </div>
            <p className="text-sm leading-relaxed">{t.texto}</p>
            <button onClick={() => setExamen(i)} className="btn-primary">
              Responder preguntas ({t.preguntas.length})
            </button>
          </div>
        ))
      )}
    </div>
  )
}

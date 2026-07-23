import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Idioma } from '../types'
import { bloqueEnCurso } from '../lib/progreso'
import { getWriting } from '../data/packs'
import { EscribirConsigna } from '../components/PasoWriting'

export default function Writing() {
  const bloqueActual = useLiveQuery(() => bloqueEnCurso(), [], 1) ?? 1
  const [bloque, setBloque] = useState<number | null>(null)
  const [idioma, setIdioma] = useState<Idioma>('en')
  const [consignaIdx, setConsignaIdx] = useState<number | null>(null)
  const [hecho, setHecho] = useState(false)

  const bloqueSel = bloque ?? bloqueActual
  const pack = getWriting(bloqueSel, idioma)
  const bloquesDisponibles = Array.from({ length: bloqueActual }, (_, i) => i + 1)

  function reset() {
    setConsignaIdx(null)
    setHecho(false)
  }

  if (pack && consignaIdx !== null) {
    const consigna = pack.consignas[consignaIdx]
    if (hecho) {
      return (
        <div className="flex flex-col gap-4">
          <div className="tarjeta flex flex-col items-center gap-2 py-8">
            <span className="text-5xl">✍️</span>
            <span className="font-semibold">¡Ejercicio terminado!</span>
            <span className="text-center text-sm text-slate-500 dark:text-slate-400">
              Sigue practicando: escribir a mano y comparar con el modelo es de lo que más ayuda para el examen.
            </span>
          </div>
          <button onClick={reset} className="btn-primary">
            Volver a escritura
          </button>
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-4">
        <button onClick={reset} className="self-start text-sm text-slate-500 underline dark:text-slate-400">
          ← Volver a las consignas
        </button>
        <EscribirConsigna key={`${idioma}-${consignaIdx}`} pack={consigna} idioma={idioma} onDone={() => setHecho(true)} />
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
        Escribe según la consigna (30–40 palabras, formato IELTS/TEF). Con API key la IA te corrige; sin ella, comparas
        con una respuesta modelo y te autocalificas.
      </p>

      {!pack ? (
        <p className="tarjeta text-slate-500 dark:text-slate-400">
          Aún no hay escritura para el bloque {bloqueSel} en {idioma === 'en' ? 'inglés' : 'francés'}.
        </p>
      ) : (
        pack.consignas.map((c, i) => (
          <div key={i} className="tarjeta flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${
                  idioma === 'en' ? 'bg-en' : 'bg-fr'
                }`}
              >
                {i + 1}
              </span>
              <p className="flex-1 text-sm font-semibold">{c.consigna}</p>
            </div>
            <button onClick={() => setConsignaIdx(i)} className="btn-primary">
              Escribir ({c.minPalabras}–{c.maxPalabras} palabras)
            </button>
          </div>
        ))
      )}
    </div>
  )
}

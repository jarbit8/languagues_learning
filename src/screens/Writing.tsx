import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { bloqueEnCurso } from '../lib/progreso'
import { getWriting } from '../data/packs'
import { EscribirConsigna } from '../components/PasoWriting'

export default function Writing() {
  const bloqueActual = useLiveQuery(() => bloqueEnCurso(), [], 1) ?? 1
  const [bloque, setBloque] = useState<number | null>(null)
  const [consignaIdx, setConsignaIdx] = useState<number | null>(null)
  const [hecho, setHecho] = useState(false)

  const bloqueSel = bloque ?? bloqueActual
  const pack = getWriting(bloqueSel)
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
        <EscribirConsigna key={consignaIdx} pack={consigna} onDone={() => setHecho(true)} />
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
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Una consigna por tema, en formato IELTS/TOEFL: cada una dice cuántas palabras pide. Con API key la IA te corrige;
        sin ella, comparas con una respuesta modelo y te autocalificas.
      </p>

      {!pack ? (
        <p className="tarjeta text-slate-500 dark:text-slate-400">
          Aún no hay escritura para el bloque {bloqueSel}.
        </p>
      ) : (
        // Se ordena por tema para leerlas en el orden del curso, pero el índice original
        // se conserva: los exámenes de bloque y final siguen tomando consignas[0].
        pack.consignas
          .map((c, i) => ({ c, i }))
          .sort((a, b) => (a.c.tema ?? 99) - (b.c.tema ?? 99))
          .map(({ c, i }) => (
            <div key={i} className="tarjeta flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="flex shrink-0 items-center justify-center rounded-full bg-en px-2 py-1 text-[10px] font-black text-white">
                  {c.tema ? `T${c.tema}` : i + 1}
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

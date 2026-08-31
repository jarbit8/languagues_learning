import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { temaEnCurso } from '../lib/progreso'
import { getWriting } from '../data/packs'
import { bloqueDeTema } from '../lib/curriculum'
import { EscribirConsigna } from '../components/PasoWriting'
import SelectorDia from '../components/SelectorDia'

export default function Writing() {
  // Se elige por TEMA, igual que Leer y Escuchar. Los packs siguen agrupados por bloque en
  // disco, pero cada consigna sabe de qué tema es: eso es cosa del archivo, no del usuario.
  const temaActual = useLiveQuery(() => temaEnCurso(), [], 1) ?? 1
  const [tema, setTema] = useState<number | null>(null)
  // Una consigna por día, como en el resto de Practicar.
  const [dia, setDia] = useState<1 | 2>(1)
  const [consignaIdx, setConsignaIdx] = useState<number | null>(null)
  const [hecho, setHecho] = useState(false)

  const temaSel = tema ?? temaActual
  const pack = getWriting(bloqueDeTema(temaSel))
  const temasDisponibles = Array.from({ length: temaActual }, (_, i) => i + 1)

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
          value={temaSel}
          onChange={(e) => {
            reset()
            setTema(Number(e.target.value))
          }}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
        >
          {temasDisponibles.map((t) => (
            <option key={t} value={t}>
              Tema {t}
            </option>
          ))}
        </select>
      </div>

      <SelectorDia dia={dia} onCambio={setDia} />

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Una consigna por tema, en formato IELTS/TOEFL: cada una dice cuántas palabras pide. Al enviar comparas tu texto
        con una respuesta modelo y te autocalificas con el checklist.
      </p>

      {!pack ? (
        <p className="tarjeta text-slate-500 dark:text-slate-400">
          Aún no hay escritura para el tema {temaSel}.
        </p>
      ) : (
        // Se ordena por tema para leerlas en el orden del curso, pero el índice original
        // se conserva: los exámenes de bloque y final siguen tomando consignas[0].
        pack.consignas
          .map((c, i) => ({ c, i }))
          .filter(({ c }) => c.tema === temaSel)
          // Solo la del día; si el tema aún no tiene la segunda, se queda en la primera.
          .filter((_, n, todas) => n === Math.min(dia - 1, todas.length - 1))
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

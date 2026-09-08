import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { temaEnCurso } from '../lib/progreso'
import { getWriting, getVocabPack } from '../data/packs'
import { bloqueDeTema } from '../lib/curriculum'
import { EscribirConsigna } from '../components/PasoWriting'
import SelectorDia from '../components/SelectorDia'
import { marcarHecho, claveEscribir } from '../lib/avance'

export default function Writing() {
  // Se elige por TEMA, igual que Leer y Escuchar. Los packs siguen agrupados por bloque en
  // disco, pero cada consigna sabe de qué tema es: eso es cosa del archivo, no del usuario.
  const temaActual = useLiveQuery(() => temaEnCurso(), [], 1) ?? 1
  const [tema, setTema] = useState<number | null>(null)
  // Una consigna por día, como en el resto de Practicar.
  const [dia, setDia] = useState<1 | 2>(1)
  const [consignaIdx, setConsignaIdx] = useState<number | null>(null)
  const [veredicto, setVeredicto] = useState<'listo' | 'aun_no' | null>(null)

  const temaSel = tema ?? temaActual
  const pack = getWriting(bloqueDeTema(temaSel))
  const temasDisponibles = Array.from({ length: temaActual }, (_, i) => i + 1)

  function reset() {
    setConsignaIdx(null)
    setVeredicto(null)
  }

  if (pack && consignaIdx !== null) {
    const consigna = pack.consignas[consignaIdx]
    // Solo el LISTO de la IA marca el módulo. Un AÚN NO no es un fracaso ni resta nada: es
    // volver a escribirlo, que es exactamente lo que pidió al cambiar el checklist por la IA.
    if (veredicto) {
      const aprobado = veredicto === 'listo'
      return (
        <div className="flex flex-col gap-4">
          <div className="tarjeta flex flex-col items-center gap-2 py-8">
            <span className="text-5xl">{aprobado ? '🎉' : '💪'}</span>
            <span className="font-semibold">{aprobado ? '¡Aprobado por la IA!' : 'Todavía no'}</span>
            <span className="text-center text-sm text-slate-500 dark:text-slate-400">
              {aprobado
                ? 'Este texto ya cuenta en el avance del tema.'
                : 'Arregla lo que te marcó y vuelve a escribirlo: no cuenta hasta que te dé LISTO.'}
            </span>
          </div>
          <button onClick={() => setVeredicto(null)} className="btn-primary">
            {aprobado ? 'Escribirlo otra vez' : 'Volver a escribirlo'}
          </button>
          <button onClick={reset} className="btn bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            Volver a las consignas
          </button>
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-4">
        <button onClick={reset} className="self-start text-sm text-slate-500 underline dark:text-slate-400">
          ← Volver a las consignas
        </button>
        <EscribirConsigna
          key={consignaIdx}
          pack={consigna}
          tema={temaSel}
          dia={dia}
          meta={`si su texto del tema ${temaSel} ya está bien o si tiene que volver a escribirlo`}
          onDone={async (_nota, aprobado) => {
            if (aprobado) await marcarHecho(temaSel, claveEscribir(consignaIdx))
            setVeredicto(aprobado ? 'listo' : 'aun_no')
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* SIN SELECTOR DE TEMA (2026-08-30): Practicar es siempre el tema EN CURSO. El selector
          dejaba elegir temas pasados y era ruido: al aprobar el examen aparece el siguiente y
          ya está. Para repasar lo anterior están Aprender → Aprendido y Exámenes → POR TEMA. */}
      <p className="text-sm font-semibold">{`Tema ${temaSel} — ${getVocabPack(temaSel)?.titulo ?? ''}`}</p>

      <SelectorDia dia={dia} onCambio={setDia} />

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Una consigna por tema, en formato IELTS/TOEFL: cada una dice cuántas palabras pide. Al enviar, la app arma un
        prompt con tu texto dentro para que una IA te lo corrija y te diga si estás LISTO o AÚN NO.
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

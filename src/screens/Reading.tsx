import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { temaEnCurso } from '../lib/progreso'
import { getReading, getVocabPack } from '../data/packs'
import { preguntaDeListening } from '../lib/preguntas'
import ExamRunner from '../components/ExamRunner'
import PalabrasDeExamen from '../components/PalabrasDeExamen'
import SelectorDia from '../components/SelectorDia'
import { porDia } from '../lib/porDia'

export default function Reading() {
  const temaActual = useLiveQuery(() => temaEnCurso(), [], 1) ?? 1
  const [tema, setTema] = useState<number | null>(null)
  // Una lectura por día: enseñar las dos juntas destripa la del día siguiente.
  const [dia, setDia] = useState<1 | 2>(1)
  const [examen, setExamen] = useState<number | null>(null)
  const [resultado, setResultado] = useState<{ aciertos: number; total: number } | null>(null)

  const temaSel = tema ?? temaActual
  const pack = getReading(temaSel)
  const temasDisponibles = Array.from({ length: temaActual }, (_, i) => i + 1)

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
    const preguntas = texto.preguntas.map(preguntaDeListening)
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
      {/* SIN SELECTOR DE TEMA (2026-08-30): Practicar es siempre el tema EN CURSO. El selector
          dejaba elegir temas pasados y era ruido: al aprobar el examen aparece el siguiente y
          ya está. Para repasar lo anterior están Aprender → Aprendido y Exámenes → POR TEMA. */}
      <p className="text-sm font-semibold">{`Tema ${temaSel} — ${getVocabPack(temaSel)?.titulo ?? ''}`}</p>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Lee el texto y responde las preguntas de comprensión (formato IELTS/TOEFL). Solo usa vocabulario de temas que ya
        viste. Desde el tema 9 las preguntas van en inglés, como en el examen real.
      </p>

      {/* La chuleta se ofrece desde el tema 9, que es donde los enunciados dejan de estar en
          español; antes solo sería ruido. */}
      <SelectorDia dia={dia} onCambio={setDia} />

      {temaSel >= 9 && <PalabrasDeExamen temaActual={temaActual} />}

      {!pack ? (
        <p className="tarjeta text-slate-500 dark:text-slate-400">
          Aún no hay lectura para el tema {temaSel}.
        </p>
      ) : (
        // DOS lecturas por día: una sola deja el módulo en 7 min y el objetivo son 15.
        porDia(pack.textos, dia)
          .map((t) => {
            const i = pack.textos.indexOf(t)
            return (
          <div key={i} className="tarjeta flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${
                  'bg-en'
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
            )
          })
      )}
    </div>
  )
}

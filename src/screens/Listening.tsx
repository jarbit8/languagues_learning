import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Idioma, DialogoListening } from '../types'
import { temaEnCurso } from '../lib/progreso'
import { getVocabPack, getListening } from '../data/packs'
import { reproducirDialogo, reproducirLinea, detener, rateListening } from '../lib/listening'
import { preguntaDeListening } from '../lib/preguntas'
import ExamRunner from '../components/ExamRunner'

// Estima la duración del audio TTS (aprox — la velocidad real depende de la voz del dispositivo).
function duracionAprox(dialogo: DialogoListening, tema: number): number {
  const palabras = dialogo.lineas.reduce((n, l) => n + l.texto.trim().split(/\s+/).length, 0)
  const rate = rateListening(tema)
  return Math.round(palabras / (rate * 2.4) + dialogo.lineas.length * 0.35)
}

function formatoDuracion(seg: number): string {
  if (seg < 60) return `≈ ${seg} s`
  return `≈ ${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`
}

function DialogoCard({
  dialogo,
  indice,
  idioma,
  tema,
  onExamen
}: {
  dialogo: DialogoListening
  indice: number
  idioma: Idioma
  tema: number
  onExamen: (indice: number) => void
}) {
  const [transcripcion, setTranscripcion] = useState(false)
  const [lineaActiva, setLineaActiva] = useState(-1)

  return (
    <div className="tarjeta flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${
            idioma === 'en' ? 'bg-en' : 'bg-fr'
          }`}
        >
          {indice + 1}
        </span>
        <h2 className="flex-1 font-bold">{dialogo.titulo}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
          🕐 {formatoDuracion(duracionAprox(dialogo, tema))}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() =>
            reproducirDialogo(dialogo.lineas, idioma, tema, {
              onLinea: setLineaActiva,
              onFin: () => setLineaActiva(-1)
            })
          }
          className="btn-primary flex-1"
        >
          🔊 Escuchar
        </button>
        <button
          onClick={() =>
            reproducirDialogo(dialogo.lineas, idioma, tema, {
              lento: true,
              onLinea: setLineaActiva,
              onFin: () => setLineaActiva(-1)
            })
          }
          className="btn bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
        >
          🐢 Lento
        </button>
      </div>

      {!transcripcion ? (
        <button
          onClick={() => setTranscripcion(true)}
          className="text-center text-sm text-slate-500 underline dark:text-slate-400"
        >
          Mostrar transcripción
        </button>
      ) : (
        <div className="flex flex-col gap-1">
          {dialogo.lineas.map((l, i) => (
            <button
              key={i}
              onClick={() =>
                reproducirLinea(l.texto, idioma, tema, {
                  idxHablante: [...new Set(dialogo.lineas.map((x) => x.hablante))].indexOf(l.hablante)
                })
              }
              className={`flex items-start gap-2 rounded-lg px-2 py-1 text-left text-sm ${
                lineaActiva === i ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''
              }`}
            >
              <span className="font-bold text-slate-400">{l.hablante}:</span>
              <span className="flex-1">{l.texto}</span>
              <span>🔊</span>
            </button>
          ))}
        </div>
      )}

      <button onClick={() => onExamen(indice)} className="btn-primary">
        Responder preguntas ({dialogo.preguntas.length})
      </button>
    </div>
  )
}

export default function Listening() {
  const temaActual = useLiveQuery(() => temaEnCurso(), [], 1) ?? 1
  const [tema, setTema] = useState<number | null>(null)
  const [idioma, setIdioma] = useState<Idioma>('en')
  const [examenDialogo, setExamenDialogo] = useState<number | null>(null)
  const [resultado, setResultado] = useState<{ aciertos: number; total: number } | null>(null)

  const temaSel = tema ?? temaActual
  const pack = getListening(temaSel, idioma)
  const temasDisponibles = Array.from({ length: temaActual }, (_, i) => i + 1)

  function reset() {
    detener()
    setExamenDialogo(null)
    setResultado(null)
  }

  function cambiarTema(t: number) {
    reset()
    setTema(t)
  }

  function cambiarIdioma(i: Idioma) {
    reset()
    setIdioma(i)
  }

  // --- Modo examen de un diálogo ---
  if (pack && examenDialogo !== null) {
    const dialogo = pack.dialogos[examenDialogo]
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
            Volver al listening
          </button>
        </div>
      )
    }
    const preguntas = dialogo.preguntas.map((p) => preguntaDeListening(p, idioma))
    return (
      <div className="flex flex-col gap-4">
        <button onClick={reset} className="self-start text-sm text-slate-500 underline dark:text-slate-400">
          ← Volver al diálogo
        </button>
        <ExamRunner
          preguntas={preguntas}
          etiqueta={`Listening · ${dialogo.titulo}`}
          onFinish={(aciertos, total) => setResultado({ aciertos, total })}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <select
          value={temaSel}
          onChange={(e) => cambiarTema(Number(e.target.value))}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
        >
          {temasDisponibles.map((t) => (
            <option key={t} value={t}>
              Tema {t} — {getVocabPack(t)?.titulo}
            </option>
          ))}
        </select>
        <div className="flex rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
          {(['en', 'fr'] as const).map((i) => (
            <button
              key={i}
              onClick={() => cambiarIdioma(i)}
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
        Escucha el diálogo (sin mirar la transcripción la primera vez), luego responde las preguntas. Solo usa
        vocabulario de temas que ya viste. La app usa una voz de mujer y una de hombre para los dos personajes.
      </p>

      {!pack ? (
        <p className="tarjeta text-slate-500 dark:text-slate-400">
          Aún no hay listening para el tema {temaSel} en {idioma === 'en' ? 'inglés' : 'francés'}.
        </p>
      ) : (
        pack.dialogos.map((d, i) => (
          <DialogoCard key={i} dialogo={d} indice={i} idioma={idioma} tema={temaSel} onExamen={setExamenDialogo} />
        ))
      )}
    </div>
  )
}

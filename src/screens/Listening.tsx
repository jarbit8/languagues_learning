import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Idioma } from '../types'
import { getListening } from '../data/packs'
import { temaEnCurso } from '../lib/progreso'
import { reproducirDialogo, reproducirLinea, detener } from '../lib/listening'
import { preguntaDeListening } from '../lib/preguntas'
import ExamRunner from '../components/ExamRunner'

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
  const [lineaActiva, setLineaActiva] = useState(-1)
  const [transcripcionVisible, setTranscripcionVisible] = useState(false)
  const [enExamen, setEnExamen] = useState(false)
  const [resultado, setResultado] = useState<{ aciertos: number; total: number } | null>(null)

  const [dialogoIdx, setDialogoIdx] = useState(0)

  const temaSel = tema ?? temaActual
  const pack = getListening(temaSel, idioma)
  const temasDisponibles = Array.from({ length: temaActual }, (_, i) => i + 1)
  const dialogo = pack?.dialogos[dialogoIdx] ?? pack?.dialogos[0]

  function elegirTema(t: number) {
    detener()
    setTema(t)
    setDialogoIdx(0)
    setLineaActiva(-1)
    setTranscripcionVisible(false)
    setEnExamen(false)
    setResultado(null)
  }

  function elegirDialogo(i: number) {
    detener()
    setDialogoIdx(i)
    setLineaActiva(-1)
    setTranscripcionVisible(false)
    setEnExamen(false)
    setResultado(null)
  }

  if (!pack || !dialogo) {
    return (
      <div className="flex flex-col gap-4">
        <p className="tarjeta text-slate-500 dark:text-slate-400">
          Aún no hay listening para el tema {temaSel} en {idioma === 'en' ? 'inglés' : 'francés'}.
        </p>
      </div>
    )
  }

  if (enExamen) {
    if (resultado) {
      const pct = Math.round((resultado.aciertos / resultado.total) * 100)
      return (
        <div className="flex flex-col gap-4">
          <div className="tarjeta flex flex-col items-center gap-2 py-8">
            <span className="text-5xl font-black">{pct}%</span>
            <span className="text-slate-500 dark:text-slate-400">
              {resultado.aciertos} de {resultado.total} correctas
            </span>
          </div>
          <button onClick={() => elegirTema(temaSel)} className="btn-primary">
            Volver al listening
          </button>
        </div>
      )
    }
    const preguntas = dialogo.preguntas.map((p) => preguntaDeListening(p, idioma))
    return (
      <ExamRunner
        preguntas={preguntas}
        etiqueta="Listening"
        onFinish={(aciertos, total) => setResultado({ aciertos, total })}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <select
          value={temaSel}
          onChange={(e) => elegirTema(Number(e.target.value))}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
        >
          {temasDisponibles.map((t) => (
            <option key={t} value={t}>
              Tema {t}
            </option>
          ))}
        </select>
        <div className="flex rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
          {(['en', 'fr'] as const).map((i) => (
            <button
              key={i}
              onClick={() => {
                detener()
                setIdioma(i)
                setLineaActiva(-1)
                setTranscripcionVisible(false)
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

      {pack.dialogos.length > 1 && (
        <div className="flex gap-2">
          {pack.dialogos.map((d, i) => (
            <button
              key={i}
              onClick={() => elegirDialogo(i)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${
                dialogoIdx === i
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Diálogo {i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="tarjeta flex flex-col gap-3">
        <h2 className="font-bold">{dialogo.titulo}</h2>
        <div className="flex gap-2">
          <button
            onClick={() =>
              reproducirDialogo(dialogo.lineas, idioma, temaSel, {
                onLinea: setLineaActiva,
                onFin: () => setLineaActiva(-1)
              })
            }
            className="btn-primary flex-1"
          >
            🔊 Escuchar diálogo
          </button>
          <button
            onClick={() =>
              reproducirDialogo(dialogo.lineas, idioma, temaSel, {
                lento: true,
                onLinea: setLineaActiva,
                onFin: () => setLineaActiva(-1)
              })
            }
            className="btn bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
          >
            🐢 Más lento
          </button>
        </div>

        {!transcripcionVisible ? (
          <button
            onClick={() => setTranscripcionVisible(true)}
            className="text-center text-sm text-slate-500 underline dark:text-slate-400"
          >
            Mostrar transcripción
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            {dialogo.lineas.map((l, i) => (
              <button
                key={i}
                onClick={() => reproducirLinea(l.texto, idioma, temaSel)}
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

        <button onClick={() => setEnExamen(true)} className="btn-primary">
          Responder preguntas ({dialogo.preguntas.length})
        </button>
      </div>

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

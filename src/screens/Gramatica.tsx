import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Idioma } from '../types'
import { IDIOMAS_ACTIVOS, idiomaUnico, nombreIdioma } from '../config'
import { getGramatica } from '../data/packs'
import { getProgresoTema, marcarGramaticaCompletada } from '../lib/progreso'
import { preguntaDeEjercicio } from '../lib/preguntas'
import { hablar } from '../lib/audio'
import ExamRunner from '../components/ExamRunner'

const capitalizar = (s: string) => s[0].toUpperCase() + s.slice(1)

// Un paso numerado de la lección: número + título + contenido. `tono` pinta el fondo cuando
// el paso es un aviso (pronunciación / trampa) para que destaque sobre los pasos normales.
const TONOS = {
  normal: 'bg-white ring-slate-200 dark:bg-slate-800 dark:ring-slate-700',
  sky: 'bg-sky-50 ring-sky-200 dark:bg-sky-950/40 dark:ring-sky-900',
  amber: 'bg-amber-50 ring-amber-200 dark:bg-amber-950/40 dark:ring-amber-900'
} as const

function Paso({
  n,
  titulo,
  nota,
  icono,
  tono = 'normal',
  children
}: {
  n: number
  titulo: string
  nota?: string
  icono?: string
  tono?: keyof typeof TONOS
  children: React.ReactNode
}) {
  return (
    <section className={`rounded-2xl p-4 shadow-sm ring-1 ${TONOS[tono]}`}>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white dark:bg-white dark:text-slate-900">
          {n}
        </span>
        <h3 className="text-sm font-bold uppercase tracking-wide">
          {icono && <span className="mr-1">{icono}</span>}
          {titulo}
        </h3>
        {nota && <span className="ml-auto text-xs text-slate-400">{nota}</span>}
      </div>
      {children}
    </section>
  )
}

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
  const acento = idioma === 'en' ? 'bg-en' : 'bg-fr'

  return (
    <div className="flex flex-col gap-5">
      {/* Portada de la lección */}
      <div className={`relative overflow-hidden rounded-2xl ${acento} px-4 py-5 text-white shadow-sm`}>
        <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-4 h-24 w-24 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-widest text-white/70">
            Gramática {!idiomaUnico && (idioma === 'en' ? '· EN' : '· FR')}
          </span>
          <h2 className="text-xl font-black leading-tight">{pack.titulo}</h2>
          {completada && (
            <span className="mt-1 self-start rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">✓ Completado</span>
          )}
        </div>
      </div>

      <Paso n={1} titulo="La regla">
        <p className="text-base leading-relaxed">{pack.regla}</p>
      </Paso>

      <Paso n={2} titulo="Ejemplos" nota="toca para escuchar">
        <div className="flex flex-col gap-2">
          {pack.ejemplos.map((ej, i) => (
            <button
              key={i}
              onClick={() => hablar(ej.frase, idioma)}
              className="flex min-h-[60px] items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-left transition active:scale-[0.98] dark:bg-slate-900"
            >
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-base font-semibold leading-snug">{ej.frase}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{ej.traduccion}</span>
                {ej.comoSeLee && (
                  <span className="text-xs italic text-indigo-500 dark:text-indigo-300">/ {ej.comoSeLee} /</span>
                )}
              </span>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${acento} text-base text-white`}
              >
                ▶
              </span>
            </button>
          ))}
        </div>
      </Paso>

      <Paso n={3} titulo="Cómo suena" icono="🗣️" tono="sky">
        <p className="text-sm leading-relaxed text-sky-900 dark:text-sky-100">{pack.pronunciacion}</p>
      </Paso>

      <Paso n={4} titulo="Ojo con esto" icono="⚠️" tono="amber">
        <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-100">{pack.trampa}</p>
      </Paso>

      <button
        onClick={() => onPracticar(idioma)}
        className={completada ? 'btn bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' : 'btn-primary'}
      >
        {completada ? '↻ Repetir ejercicios' : `▶ Practicar · ${pack.ejercicios.length} ejercicios`}
      </button>
    </div>
  )
}

export default function Gramatica({ tema }: { tema: number }) {
  const [idioma, setIdioma] = useState<Idioma>(IDIOMAS_ACTIVOS[0])
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
        etiqueta={capitalizar(nombreIdioma(practicando))}
        onFinish={async (aciertos, total) => {
          await marcarGramaticaCompletada(tema, practicando)
          setFin({ aciertos, total })
        }}
      />
    )
  }

  const completada = (i: Idioma) =>
    i === 'en' ? !!progreso?.gramaticaEnCompletada : !!progreso?.gramaticaFrCompletada

  return (
    <div className="flex flex-col gap-4">
      {!idiomaUnico && (
        <div className="flex rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
          {IDIOMAS_ACTIVOS.map((i) => (
            <button
              key={i}
              onClick={() => setIdioma(i)}
              className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${
                idioma === i ? (i === 'en' ? 'chip-en !py-2' : 'chip-fr !py-2') : 'text-slate-500'
              }`}
            >
              {i === 'en' ? '🇬🇧 Inglés' : '🇫🇷 Francés'}
              {completada(i) && ' ✓'}
            </button>
          ))}
        </div>
      )}

      <LeccionCard tema={tema} idioma={idioma} completada={completada(idioma)} onPracticar={setPracticando} />
    </div>
  )
}

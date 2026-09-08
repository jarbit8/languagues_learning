import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getGramatica } from '../data/packs'
import { getProgresoTema, marcarGramaticaCompletada } from '../lib/progreso'
import { marcarHecho, claveGramatica } from '../lib/avance'
import { preguntaDeEjercicio } from '../lib/preguntas'
import { hablar } from '../lib/audio'
import type { GramaticaPack } from '../types'
import ExamRunner from '../components/ExamRunner'
import SelectorDia from '../components/SelectorDia'
import { Resaltado, bloquesDeRegla } from '../components/ReglaGramatica'


function Regla({ regla }: { regla: string }) {
  const caja = 'border-en bg-en-soft/60 text-en-dark dark:border-en dark:bg-en-dark/25 dark:text-en-soft'
  return (
    <div className="flex flex-col gap-3">
      {bloquesDeRegla(regla).map((b, i) =>
        'patron' in b ? (
          <div key={i} className="flex flex-col gap-1.5">
            <p className="text-[15px] leading-[1.7]">
              <Resaltado texto={b.label} />
            </p>
            {/* El recuadro ya destaca: dentro no se vuelven a marcar los términos. */}
            <div className={`rounded-xl border-l-4 px-3 py-2.5 ${caja}`}>
              <p className="text-[15px] font-bold leading-relaxed">{b.patron}</p>
            </div>
          </div>
        ) : (
          <p key={i} className="text-[15px] leading-[1.7]">
            <Resaltado texto={b.texto} />
          </p>
        )
      )}
    </div>
  )
}

// Un paso de la lección: banda de color a la izquierda + número, para que se lea como una
// secuencia y no como cuatro tarjetas sueltas.
const TONOS = {
  normal: {
    caja: 'bg-white ring-slate-200 dark:bg-slate-800 dark:ring-slate-700',
    banda: 'bg-slate-200 dark:bg-slate-600',
    num: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
    titulo: 'text-slate-400 dark:text-slate-500'
  },
  sky: {
    caja: 'bg-sky-50 ring-sky-200 dark:bg-sky-950/40 dark:ring-sky-900',
    banda: 'bg-sky-400',
    num: 'bg-sky-500 text-white',
    titulo: 'text-sky-600 dark:text-sky-400'
  },
  amber: {
    caja: 'bg-amber-50 ring-amber-200 dark:bg-amber-950/40 dark:ring-amber-900',
    banda: 'bg-amber-400',
    num: 'bg-amber-500 text-white',
    titulo: 'text-amber-700 dark:text-amber-400'
  }
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
  const t = TONOS[tono]
  return (
    <section className={`relative overflow-hidden rounded-2xl pl-5 pr-4 py-4 shadow-sm ring-1 ${t.caja}`}>
      <span className={`absolute inset-y-0 left-0 w-1.5 ${t.banda}`} />
      <header className="mb-3 flex items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${t.num}`}
        >
          {n}
        </span>
        <h3 className={`text-[11px] font-black uppercase tracking-[0.14em] ${t.titulo}`}>
          {icono && <span className="mr-1">{icono}</span>}
          {titulo}
        </h3>
        {nota && <span className="ml-auto text-[11px] text-slate-400">{nota}</span>}
      </header>
      {children}
    </section>
  )
}

// Un tema son dos días y la gramática se veía entera el primero. Si el pack trae `dias`, cada
// jornada enseña su mitad de la regla y sus ejercicios; si no, sale la lección completa y todo
// sigue como estaba. Los índices apuntan a los arreglos del pack: NO se duplica nada, porque
// los exámenes de tema, bloque y final cuentan `pack.ejercicios`.
export function vistaDelDia(pack: GramaticaPack, dia: 1 | 2) {
  const d = pack.dias?.[dia - 1]
  if (!d) return { ...pack, subtitulo: null as string | null, ultimo: true }
  return {
    ...pack,
    subtitulo: d.titulo,
    regla: d.regla,
    pronunciacion: d.pronunciacion ?? pack.pronunciacion,
    trampa: d.trampa ?? pack.trampa,
    ejemplos: d.ejemplos.map((i) => pack.ejemplos[i]).filter(Boolean),
    ejercicios: d.ejercicios.map((i) => pack.ejercicios[i]).filter(Boolean),
    ultimo: dia === pack.dias!.length
  }
}

function LeccionCard({
  tema,
  dia,
  completada,
  onPracticar
}: {
  tema: number
  dia: 1 | 2
  completada: boolean
  onPracticar: () => void
}) {
  const base = getGramatica(tema)
  if (!base) return null
  const pack = vistaDelDia(base, dia)
  const degradado = 'bg-gradient-to-br from-en via-en to-indigo-700'
  const acento = 'bg-en'

  return (
    <div className="flex flex-col gap-4">
      {/* Portada de la lección */}
      <div className={`relative overflow-hidden rounded-3xl ${degradado} px-5 py-6 text-white shadow-lg`}>
        <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-widest">
              Tema {tema} · Gramática
            </span>
            {completada && (
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-900">
                ✓ Completado
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black leading-tight">{pack.subtitulo ?? pack.titulo}</h2>
          {pack.subtitulo && <p className="text-sm font-semibold text-white/70">{pack.titulo}</p>}
          {/* Mapa de la lección: 4 pasos + práctica */}
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-white/80">
            {['Regla', 'Ejemplos', 'Sonido', 'Trampa'].map((p, i) => (
              <span key={p} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-white/40">→</span>}
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Paso n={1} titulo="La regla">
        <Regla regla={pack.regla} />
      </Paso>

      <Paso n={2} titulo="Ejemplos" nota="toca para escuchar">
        <div className="flex flex-col gap-2">
          {pack.ejemplos.map((ej, i) => (
            <button
              key={i}
              onClick={() => hablar(ej.frase)}
              className="group flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 text-left transition active:scale-[0.98] dark:bg-slate-900"
            >
              <span className="flex flex-1 flex-col gap-1">
                <span className="text-[17px] font-bold leading-snug">{ej.frase}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{ej.traduccion}</span>
                {ej.comoSeLee && (
                  <span className="mt-0.5 self-start rounded-md bg-slate-200/70 px-2 py-0.5 text-xs font-medium italic text-slate-600 dark:bg-slate-700/70 dark:text-slate-300">
                    {ej.comoSeLee}
                  </span>
                )}
              </span>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${acento} text-sm text-white shadow-md`}
              >
                ▶
              </span>
            </button>
          ))}
        </div>
      </Paso>

      <Paso n={3} titulo="Cómo suena" icono="🗣️" tono="sky">
        <p className="text-[15px] leading-relaxed text-sky-900 dark:text-sky-100">
          <Resaltado texto={pack.pronunciacion} />
        </p>
      </Paso>

      <Paso n={4} titulo="Ojo con esto" icono="⚠️" tono="amber">
        <p className="text-[15px] leading-relaxed text-amber-900 dark:text-amber-100">
          <Resaltado texto={pack.trampa} />
        </p>
      </Paso>

      <button
        onClick={onPracticar}
        className={`btn min-h-[52px] text-base shadow-md ${
          completada
            ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
            : `${degradado} text-white`
        }`}
      >
        {completada ? '↻ Repetir ejercicios' : `Practicar · ${pack.ejercicios.length} ejercicios →`}
      </button>
    </div>
  )
}

export default function Gramatica({ tema }: { tema: number }) {
  const [practicando, setPracticando] = useState(false)
  const [dia, setDia] = useState<1 | 2>(1)
  const [fin, setFin] = useState<{ aciertos: number; total: number } | null>(null)
  const progreso = useLiveQuery(() => getProgresoTema(tema), [tema])

  if (practicando) {
    const base = getGramatica(tema)
    if (!base) return null
    const pack = vistaDelDia(base, dia)
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
              {fin.aciertos} de {fin.total}
              {vistaDelDia(getGramatica(tema)!, dia).ultimo ? ' · lección completada ✓' : ' · te falta el día 2'}
            </span>
          </div>
          <button
            onClick={() => {
              setFin(null)
              setPracticando(false)
            }}
            className="btn-primary"
          >
            Volver a gramática
          </button>
        </div>
      )
    }
    const preguntas = pack.ejercicios.map(preguntaDeEjercicio)
    return (
      <ExamRunner
        preguntas={preguntas}
        etiqueta="Gramática"
        onFinish={async (aciertos, total) => {
          // La lección abre la puerta del examen de tema, así que solo cuenta cuando se
          // termina el ÚLTIMO día: con el primero se habría visto media regla.
          if (pack.ultimo) await marcarGramaticaCompletada(tema)
          await marcarHecho(tema, claveGramatica(dia))
          setFin({ aciertos, total })
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {!!getGramatica(tema)?.dias && <SelectorDia dia={dia} onCambio={setDia} />}
      <LeccionCard
        tema={tema}
        dia={dia}
        completada={!!progreso?.gramaticaCompletada}
        onPracticar={() => setPracticando(true)}
      />
    </div>
  )
}

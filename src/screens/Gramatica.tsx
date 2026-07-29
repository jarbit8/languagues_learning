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

// Los textos de gramática citan los términos del idioma entre comillas simples ('to be', 'an').
// Ojo: las contracciones inglesas usan el mismo carácter (I'm, isn't), así que solo se toma
// como término la comilla que abre tras espacio/paréntesis y cierra antes de espacio o puntuación
// — la de una contracción va pegada a una letra. Sin lookbehind, por Safari antiguo.
const TERMINO = /(^|[\s(:—–-])'([^']+)'(?=[\s,.;:!?)]|$)/g

function Resaltado({ texto, idioma }: { texto: string; idioma: Idioma }) {
  const chip =
    idioma === 'en'
      ? 'bg-en-soft text-en-dark dark:bg-en-dark/40 dark:text-en-soft'
      : 'bg-fr-soft text-fr-dark dark:bg-fr-dark/40 dark:text-fr-soft'
  const nodos: React.ReactNode[] = []
  const re = new RegExp(TERMINO)
  let ultimo = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(texto)) !== null) {
    nodos.push(texto.slice(ultimo, m.index) + m[1])
    nodos.push(
      <span key={m.index} className={`whitespace-nowrap rounded-md px-1.5 py-0.5 font-bold ${chip}`}>
        {m[2]}
      </span>
    )
    ultimo = m.index + m[0].length
  }
  nodos.push(texto.slice(ultimo))
  return <>{nodos}</>
}

// La regla venía como un párrafo denso donde la conjugación quedaba enterrada. Se parte en
// bloques por fin de frase (nunca dentro de paréntesis, para no romper "(literalmente: ...)")
// y los pares "encabezado: patrón corto" se muestran como fórmula destacada.
type BloqueRegla = { texto: string } | { label: string; patron: string }

function trocea(texto: string): string[] {
  const partes: string[] = []
  let actual = ''
  let prof = 0
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    actual += c
    if (c === '(') prof++
    else if (c === ')') prof = Math.max(0, prof - 1)
    if (prof === 0 && (c === '.' || c === ':') && /\s/.test(texto[i + 1] ?? '')) {
      const resto = texto.slice(i + 1).trimStart()
      // Tras "." se exige mayúscula para no cortar abreviaturas; tras ":" siempre corta.
      if (c === ':' || /^[A-ZÁÉÍÓÚÑ¡¿]/.test(resto)) {
        partes.push(actual.trim())
        actual = ''
      }
    }
  }
  if (actual.trim()) partes.push(actual.trim())
  return partes
}

const esPatron = (s: string) => s.length <= 70 && !s.endsWith(':')

function bloquesDeRegla(regla: string): BloqueRegla[] {
  const b = trocea(regla)
  const out: BloqueRegla[] = []
  let i = 0
  while (i < b.length) {
    let t = b[i]
    i++
    // Un encabezado suelto se pega a lo que sigue hasta encontrar un patrón que destacar.
    while (t.endsWith(':') && i < b.length && !esPatron(b[i])) {
      t += ' ' + b[i]
      i++
    }
    if (t.endsWith(':') && i < b.length && esPatron(b[i])) {
      out.push({ label: t, patron: b[i] })
      i++
    } else {
      out.push({ texto: t })
    }
  }
  return out
}

function Regla({ regla, idioma }: { regla: string; idioma: Idioma }) {
  const caja =
    idioma === 'en'
      ? 'border-en bg-en-soft/60 text-en-dark dark:border-en dark:bg-en-dark/25 dark:text-en-soft'
      : 'border-fr bg-fr-soft/60 text-fr-dark dark:border-fr dark:bg-fr-dark/25 dark:text-fr-soft'
  return (
    <div className="flex flex-col gap-3">
      {bloquesDeRegla(regla).map((b, i) =>
        'patron' in b ? (
          <div key={i} className="flex flex-col gap-1.5">
            <p className="text-[15px] leading-[1.7]">
              <Resaltado texto={b.label} idioma={idioma} />
            </p>
            {/* El recuadro ya destaca: dentro no se vuelven a marcar los términos. */}
            <div className={`rounded-xl border-l-4 px-3 py-2.5 ${caja}`}>
              <p className="text-[15px] font-bold leading-relaxed">{b.patron}</p>
            </div>
          </div>
        ) : (
          <p key={i} className="text-[15px] leading-[1.7]">
            <Resaltado texto={b.texto} idioma={idioma} />
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
  const degradado =
    idioma === 'en'
      ? 'bg-gradient-to-br from-en via-en to-indigo-700'
      : 'bg-gradient-to-br from-fr via-fr to-rose-700'
  const acento = idioma === 'en' ? 'bg-en' : 'bg-fr'

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
          <h2 className="text-2xl font-black leading-tight">{pack.titulo}</h2>
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
        <Regla regla={pack.regla} idioma={idioma} />
      </Paso>

      <Paso n={2} titulo="Ejemplos" nota="toca para escuchar">
        <div className="flex flex-col gap-2">
          {pack.ejemplos.map((ej, i) => (
            <button
              key={i}
              onClick={() => hablar(ej.frase, idioma)}
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
          <Resaltado texto={pack.pronunciacion} idioma={idioma} />
        </p>
      </Paso>

      <Paso n={4} titulo="Ojo con esto" icono="⚠️" tono="amber">
        <p className="text-[15px] leading-relaxed text-amber-900 dark:text-amber-100">
          <Resaltado texto={pack.trampa} idioma={idioma} />
        </p>
      </Paso>

      <button
        onClick={() => onPracticar(idioma)}
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

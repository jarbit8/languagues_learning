import { useEffect, useRef, useState } from 'react'
import type { Pregunta } from '../types'
import { coincide } from '../lib/normaliza'
import { hablar } from '../lib/audio'
import { conceptoPorId } from '../data/packs'

type Resultado = null | 'bien' | 'mal'

function mmss(seg: number): string {
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const TEXTO_LIBRE: Pregunta['tipo'][] = [
  'audio_escribir',
  'es_a_en',
  'significado_escrito',
  'hueco',
  'corregir_error',
  'traducir',
  'completar_dato',
  'anota_la_hora'
]

export default function ExamRunner({
  preguntas,
  onAnswer,
  onFinish,
  etiqueta,
  tiempoSegundos
}: {
  preguntas: Pregunta[]
  onAnswer?: (pregunta: Pregunta, acierto: boolean) => void
  onFinish: (aciertos: number, total: number) => void
  etiqueta?: string
  tiempoSegundos?: number
}) {
  const [idx, setIdx] = useState(0)
  const [texto, setTexto] = useState('')
  const [tokens, setTokens] = useState<string[]>([])
  const [resultado, setResultado] = useState<Resultado>(null)
  const [aciertos, setAciertos] = useState(0)
  const [restante, setRestante] = useState(tiempoSegundos ?? 0)
  const aciertosRef = useRef(0)
  const finRef = useRef(false)

  // Cronómetro opcional (examen cronometrado, estilo IELTS/TOEFL). Al llegar a 0 termina solo
  // con las respuestas que haya — las no contestadas cuentan como falladas, como en el examen real.
  useEffect(() => {
    if (!tiempoSegundos) return
    const id = setInterval(() => {
      setRestante((r) => {
        if (r <= 1) {
          clearInterval(id)
          if (!finRef.current) {
            finRef.current = true
            onFinish(aciertosRef.current, preguntas.length)
          }
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiempoSegundos])

  // Red de seguridad: si el índice se sale del arreglo (por ejemplo si un examen reutiliza este
// componente entre secciones de distinto tamaño), antes se leía preguntas[idx].tipo de undefined
  // y la app quedaba en PANTALLA EN BLANCO. Mejor cerrar la sección que romperse.
  const p = preguntas[idx]
  if (!p) {
    return (
      <div className="tarjeta flex flex-col gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">No hay más preguntas en esta sección.</p>
        <button
          onClick={() => {
            if (finRef.current) return
            finRef.current = true
            onFinish(aciertos, preguntas.length || 1)
          }}
          className="btn-primary"
        >
          Continuar
        </button>
      </div>
    )
  }
  const esTexto = TEXTO_LIBRE.includes(p.tipo)

  function comprobar(valor: string) {
    if (resultado) return
    const bien = coincide(valor, p.respuesta, p.aceptadas)
    setResultado(bien ? 'bien' : 'mal')
    if (bien) {
      setAciertos((n) => n + 1)
      aciertosRef.current += 1
    }
    onAnswer?.(p, bien)
    // Cuando la respuesta se escribe en español, el refuerzo de audio es la palabra
    // en inglés (audioTexto), no lo que tecleó el usuario.
    const aLeer = p.tipo === 'significado_escrito' ? p.audioTexto : p.respuesta
    if (aLeer) hablar(aLeer.replace(/_/g, ' '))
  }

  function siguiente() {
    if (idx + 1 >= preguntas.length) {
      if (finRef.current) return
      finRef.current = true
      onFinish(aciertos, preguntas.length)
      return
    }
    setIdx((i) => i + 1)
    setTexto('')
    setTokens([])
    setResultado(null)
  }

  const valorActual = p.tipo === 'ordenar' ? tokens.join(' ') : texto

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>
          {etiqueta ? `${etiqueta} · ` : ''}
          {idx + 1}/{preguntas.length}
        </span>
        <div className="flex items-center gap-2">
          {!!tiempoSegundos && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                restante <= 30
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
              }`}
            >
              ⏱ {mmss(restante)}
            </span>
          )}
        </div>
      </div>

      <div className="tarjeta flex flex-col gap-4">
        <p className="text-lg font-semibold">{p.enunciado}</p>
        {p.pista && <p className="text-sm text-slate-500 dark:text-slate-400">Pista: {p.pista}</p>}

        {p.tipo === 'audio_escribir' && (
          <button onClick={() => hablar(p.audioTexto!)} className="btn-primary self-start text-xl">
            🔊 Escuchar
          </button>
        )}

        {p.tipo === 'opcion_multiple' ? (
          <div className="flex flex-col gap-2">
            {p.opciones!.map((op) => {
              const estado = resultado && (op === p.respuesta ? 'bien' : op === texto ? 'mal' : null)
              return (
                <button
                  key={op}
                  disabled={!!resultado}
                  onClick={() => {
                    setTexto(op)
                    comprobar(op)
                  }}
                  className={`btn justify-start ${
                    estado === 'bien'
                      ? 'bg-emerald-500 text-white'
                      : estado === 'mal'
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                  }`}
                >
                  {op}
                </button>
              )
            })}
          </div>
        ) : p.tipo === 'ordenar' ? (
          <div className="flex flex-col gap-3">
            <div className="min-h-[48px] rounded-xl border border-dashed border-slate-300 p-2 dark:border-slate-600">
              <div className="flex flex-wrap gap-2">
                {tokens.map((t, i) => (
                  <button
                    key={i}
                    disabled={!!resultado}
                    onClick={() => setTokens((ts) => ts.filter((_, j) => j !== i))}
                    className="rounded-lg bg-slate-900 px-3 py-1 text-white dark:bg-white dark:text-slate-900"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.opciones!.map((op, i) => {
                const usado = tokens.filter((t) => t === op).length
                const disponibles = p.opciones!.filter((x) => x === op).length
                const yaTodos = usado >= disponibles
                return (
                  <button
                    key={i}
                    disabled={!!resultado || yaTodos}
                    onClick={() => setTokens((ts) => [...ts, op])}
                    className={`rounded-lg border px-3 py-1 ${
                      yaTodos
                        ? 'border-slate-200 text-slate-300 dark:border-slate-700 dark:text-slate-600'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {op}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !resultado && comprobar(texto)}
            disabled={!!resultado}
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Tu respuesta…"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg outline-none focus:border-slate-900 dark:border-slate-600 dark:bg-slate-900"
          />
        )}

        {resultado && (
          <div
            className={`rounded-xl px-4 py-3 ${
              resultado === 'bien'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
            }`}
          >
            {resultado === 'bien' ? '¡Correcto!' : 'La respuesta es:'} <b>{p.respuesta}</b>
            {/* La corrección sonaba la palabra pero no la escribía: sin audio (en clase, en
                el bus) se perdía cómo se lee. Si la pregunta es de vocabulario, se muestra. */}
            {(() => {
              const c = p.palabraId ? conceptoPorId(p.palabraId)?.concepto : undefined
              if (!c?.pron) return null
              return (
                <p className="mt-1 text-sm opacity-80">
                  {c.texto} · <span className="italic">/ {c.pron} /</span>
                </p>
              )
            })()}
          </div>
        )}
      </div>

      {!resultado && p.tipo !== 'opcion_multiple' && (
        <button
          onClick={() => comprobar(valorActual)}
          disabled={esTexto ? texto.trim() === '' : tokens.length === 0}
          className="btn-primary disabled:opacity-40"
        >
          Comprobar
        </button>
      )}
      {resultado && (
        <button onClick={siguiente} className="btn-primary">
          {idx + 1 >= preguntas.length ? 'Ver resultado' : 'Siguiente'}
        </button>
      )}
    </div>
  )
}

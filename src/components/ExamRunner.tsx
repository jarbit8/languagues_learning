import { useState } from 'react'
import type { Pregunta } from '../types'
import { coincide } from '../lib/normaliza'
import { hablar } from '../lib/audio'

type Resultado = null | 'bien' | 'mal'

const TEXTO_LIBRE: Pregunta['tipo'][] = [
  'audio_escribir',
  'es_a_en',
  'es_a_fr',
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
  etiqueta
}: {
  preguntas: Pregunta[]
  onAnswer?: (pregunta: Pregunta, acierto: boolean) => void
  onFinish: (aciertos: number, total: number) => void
  etiqueta?: string
}) {
  const [idx, setIdx] = useState(0)
  const [texto, setTexto] = useState('')
  const [tokens, setTokens] = useState<string[]>([])
  const [resultado, setResultado] = useState<Resultado>(null)
  const [aciertos, setAciertos] = useState(0)

  const p = preguntas[idx]
  const esTexto = TEXTO_LIBRE.includes(p.tipo)

  function comprobar(valor: string) {
    if (resultado) return
    const bien = coincide(valor, p.respuesta, p.aceptadas)
    setResultado(bien ? 'bien' : 'mal')
    if (bien) setAciertos((n) => n + 1)
    onAnswer?.(p, bien)
    if (p.idioma) hablar(p.respuesta.replace(/_/g, ' '), p.idioma)
  }

  function siguiente() {
    if (idx + 1 >= preguntas.length) {
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
        <span className={p.idioma === 'en' ? 'chip-en' : 'chip-fr'}>{p.idioma === 'en' ? 'EN' : 'FR'}</span>
      </div>

      <div className="tarjeta flex flex-col gap-4">
        <p className="text-lg font-semibold">{p.enunciado}</p>
        {p.pista && <p className="text-sm text-slate-500 dark:text-slate-400">Pista: {p.pista}</p>}

        {p.tipo === 'audio_escribir' && (
          <button onClick={() => hablar(p.audioTexto!, p.idioma)} className="btn-primary self-start text-xl">
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

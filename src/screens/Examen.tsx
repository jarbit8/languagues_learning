import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { construirExamenDiario, marcarExaminadasHoy, type Pregunta } from '../lib/examenDiario'
import { registrarResultado } from '../lib/srs'
import { coincide } from '../lib/normaliza'
import { hablar } from '../lib/audio'

type Fase = 'cargando' | 'jugando' | 'fin'
type Resultado = null | 'bien' | 'mal'

export default function Examen() {
  const [fase, setFase] = useState<Fase>('cargando')
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [idx, setIdx] = useState(0)
  const [texto, setTexto] = useState('')
  const [resultado, setResultado] = useState<Resultado>(null)
  const [aciertos, setAciertos] = useState(0)

  async function iniciar() {
    setFase('cargando')
    const p = await construirExamenDiario()
    setPreguntas(p)
    setIdx(0)
    setTexto('')
    setResultado(null)
    setAciertos(0)
    setFase(p.length ? 'jugando' : 'fin')
  }

  useEffect(() => {
    iniciar()
  }, [])

  const pregunta = preguntas[idx]

  async function comprobar(respuestaDada: string) {
    if (!pregunta || resultado) return
    const bien = coincide(respuestaDada, pregunta.respuesta, pregunta.aceptadas)
    setResultado(bien ? 'bien' : 'mal')
    if (bien) setAciertos((n) => n + 1)
    await registrarResultado(pregunta.palabraId, bien)
    hablar(pregunta.respuesta, pregunta.idioma)
  }

  async function siguiente() {
    if (idx + 1 >= preguntas.length) {
      await marcarExaminadasHoy(preguntas.map((p) => p.palabraId))
      setFase('fin')
      return
    }
    setIdx((i) => i + 1)
    setTexto('')
    setResultado(null)
  }

  if (fase === 'cargando') return <p className="tarjeta">Preparando examen…</p>

  if (fase === 'fin' && preguntas.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Examen diario</h1>
        <div className="tarjeta text-slate-500 dark:text-slate-400">
          No hay nada que evaluar por ahora. Marca palabras nuevas como aprendidas o vuelve cuando tengas
          repasos vencidos.
        </div>
        <Link to="/aprender" className="btn-primary">
          Ir a aprender
        </Link>
      </div>
    )
  }

  if (fase === 'fin') {
    const pct = Math.round((aciertos / preguntas.length) * 100)
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">¡Terminaste!</h1>
        <div className="tarjeta flex flex-col items-center gap-2 py-8">
          <span className="text-5xl font-black">{pct}%</span>
          <span className="text-slate-500 dark:text-slate-400">
            {aciertos} de {preguntas.length} correctas
          </span>
        </div>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          El examen diario es entrenamiento: cada respuesta ya ajustó tu repaso.
        </p>
        <button onClick={iniciar} className="btn-primary">
          Repetir
        </button>
        <Link to="/" className="btn bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
          Volver al inicio
        </Link>
      </div>
    )
  }

  // fase jugando
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>
          Pregunta {idx + 1}/{preguntas.length}
        </span>
        <span className={pregunta.idioma === 'en' ? 'chip-en' : 'chip-fr'}>
          {pregunta.idioma === 'en' ? 'EN' : 'FR'}
        </span>
      </div>

      <div className="tarjeta flex flex-col gap-4">
        <p className="text-lg font-semibold">{pregunta.enunciado}</p>

        {pregunta.tipo === 'audio_escribir' && (
          <button onClick={() => hablar(pregunta.audioTexto!, pregunta.idioma)} className="btn-primary self-start text-2xl">
            🔊 Escuchar
          </button>
        )}

        {pregunta.tipo === 'opcion_multiple' ? (
          <div className="flex flex-col gap-2">
            {pregunta.opciones!.map((op) => {
              const marcada = resultado && (op === pregunta.respuesta ? 'bien' : op === texto ? 'mal' : null)
              return (
                <button
                  key={op}
                  disabled={!!resultado}
                  onClick={() => {
                    setTexto(op)
                    comprobar(op)
                  }}
                  className={`btn justify-start ${
                    marcada === 'bien'
                      ? 'bg-emerald-500 text-white'
                      : marcada === 'mal'
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                  }`}
                >
                  {op}
                </button>
              )
            })}
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
            {resultado === 'bien' ? '¡Correcto!' : 'Casi. La respuesta es:'}{' '}
            <b>{pregunta.respuesta}</b>
          </div>
        )}
      </div>

      {!resultado && pregunta.tipo !== 'opcion_multiple' && (
        <button onClick={() => comprobar(texto)} className="btn-primary">
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

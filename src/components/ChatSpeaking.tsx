import { useEffect, useRef, useState } from 'react'
import type { FeedbackSpeaking, Idioma } from '../types'
import type { MensajeChat } from '../lib/anthropic'
import { enviarMensaje, AnthropicError } from '../lib/anthropic'
import { construirSystemPrompt, parseFeedback } from '../lib/speaking'
import { escenarioDe } from '../data/escenarios'
import { vocabPacks } from '../data/packs'
import { hablar } from '../lib/audio'
import { registrarResultado } from '../lib/srs'

function temasDesbloqueadosTexto(tema: number): string {
  const titulos = vocabPacks.filter((p) => p.tema <= tema).map((p) => p.titulo)
  return titulos.slice(-6).join(', ') || 'saludos básicos'
}

// Intenta mandar al SRS las palabras del feedback que coincidan con vocabulario conocido.
async function marcarErroresEnSRS(feedback: FeedbackSpeaking, idioma: Idioma) {
  for (const err of feedback.errores) {
    const objetivo = err.correcto.toLowerCase().trim()
    for (const pack of vocabPacks) {
      const c = pack.conceptos.find((x) => x[idioma].texto.toLowerCase() === objetivo)
      if (c) {
        await registrarResultado(c.id, false)
        break
      }
    }
  }
}

export default function ChatSpeaking({
  idioma,
  tema,
  modoExamen = false,
  onFinish
}: {
  idioma: Idioma
  tema: number
  modoExamen?: boolean
  onFinish?: (feedback: FeedbackSpeaking) => void
}) {
  const [historial, setHistorial] = useState<MensajeChat[]>([])
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackSpeaking | null>(null)
  const finRef = useRef<HTMLDivElement>(null)
  const iniciado = useRef(false)

  const systemPrompt = construirSystemPrompt(idioma, escenarioDe(tema), temasDesbloqueadosTexto(tema), modoExamen)
  const turnosUsuario = historial.filter((m) => m.role === 'user').length - 1 // -1 por el turno oculto inicial

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [historial, feedback])

  useEffect(() => {
    if (iniciado.current) return
    iniciado.current = true
    enviarTurno([{ role: 'user', content: 'Empieza tú: saluda y haz la primera pregunta del escenario.' }])
  }, [])

  async function enviarTurno(nuevoHistorial: MensajeChat[]) {
    setCargando(true)
    setError(null)
    try {
      const respuesta = await enviarMensaje(systemPrompt, nuevoHistorial)
      const conRespuesta = [...nuevoHistorial, { role: 'assistant' as const, content: respuesta }]
      setHistorial(conRespuesta)
      const fb = parseFeedback(respuesta)
      if (fb) {
        setFeedback(fb)
        await marcarErroresEnSRS(fb, idioma)
        onFinish?.(fb)
      }
    } catch (e) {
      const err = e as AnthropicError
      setError(err.info?.mensaje ?? 'Ocurrió un error inesperado.')
    } finally {
      setCargando(false)
    }
  }

  function enviar() {
    if (!texto.trim() || cargando || feedback) return
    const nuevo = [...historial, { role: 'user' as const, content: texto }]
    setTexto('')
    enviarTurno(nuevo)
  }

  if (error) {
    return (
      <div className="tarjeta flex flex-col gap-3">
        <p className="text-rose-600 dark:text-rose-300">⚠️ {error}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          El resto de la app sigue funcionando sin conexión.
        </p>
      </div>
    )
  }

  if (feedback) {
    return (
      <div className="tarjeta flex flex-col gap-3">
        <h3 className="font-bold">Feedback de tu conversación</h3>
        {typeof feedback.nota === 'number' && (
          <div className="flex flex-col items-center gap-1 py-2">
            <span className="text-4xl font-black">{feedback.nota}%</span>
          </div>
        )}
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
          ✅ {feedback.bien}
        </p>
        {feedback.errores.map((e, i) => (
          <div key={i} className="rounded-lg bg-amber-50 px-3 py-2 text-sm dark:bg-amber-900/30">
            <p>
              Dijiste: <span className="line-through">{e.dijo}</span>
            </p>
            <p>
              Mejor: <b>{e.correcto}</b>
            </p>
            <p className="text-slate-500 dark:text-slate-400">{e.porque}</p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="tarjeta flex max-h-[50vh] flex-col gap-3 overflow-y-auto">
        {historial.slice(1).map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-700'
              }`}
            >
              {m.content}
              {m.role === 'assistant' && (
                <button onClick={() => hablar(m.content, idioma)} className="ml-2">
                  🔊
                </button>
              )}
            </div>
          </div>
        ))}
        {cargando && <p className="text-sm text-slate-400">Escribiendo…</p>}
        <div ref={finRef} />
      </div>
      <div className="flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enviar()}
          disabled={cargando}
          placeholder={idioma === 'en' ? 'Write in English…' : 'Écris en français…'}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-600 dark:bg-slate-900"
        />
        <button onClick={enviar} disabled={cargando || !texto.trim()} className="btn-primary disabled:opacity-40">
          Enviar
        </button>
      </div>
      <p className="text-center text-xs text-slate-400">
        Turno {Math.max(turnosUsuario, 0)}/12 · escribe "terminar" para acabar cuando quieras
      </p>
    </div>
  )
}

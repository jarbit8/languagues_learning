import { useMemo, useState } from 'react'
import type { FeedbackSpeaking } from '../types'
import { temasDeBloque } from '../lib/curriculum'
import { construirListeningBloque, construirReadingBloque } from '../lib/examenBloque'
import { registrarNotaBloque } from '../lib/progreso'
import { hayApiKey } from '../lib/apiKey'
import { reproducirDialogo, reproducirLinea } from '../lib/listening'
import ExamRunner from '../components/ExamRunner'
import ChatSpeaking from '../components/ChatSpeaking'
import PasoWriting from '../components/PasoWriting'
import Autoevaluacion from '../components/Autoevaluacion'
import { escenarioDe } from '../data/escenarios'

type Paso = 'listening' | 'reading' | 'writing' | 'speaking' | 'resultado'

const CHECKLIST_SPEAKING = [
  'Puedo presentarme y saludar',
  'Puedo hacer preguntas simples',
  'Puedo responder sobre mi rutina o mi vida',
  'Uso frases completas, no solo palabras sueltas',
  'Mi pronunciación es entendible'
]

export default function ExamenBloque({ bloque, onSalir }: { bloque: number; onSalir: () => void }) {
  const [paso, setPaso] = useState<Paso>('listening')
  const [notas, setNotas] = useState<{ listening?: number; reading?: number; writing?: number; speaking?: number }>({})
  const [transcripcionListening, setTranscripcionListening] = useState(false)
  const [transcripcionReading, setTranscripcionReading] = useState(false)
  const [enPreguntas, setEnPreguntas] = useState(false)

  const listening = useMemo(() => construirListeningBloque(bloque), [bloque])
  const reading = useMemo(() => construirReadingBloque(bloque), [bloque])
  const temaEscenario = temasDeBloque(bloque)[0]

  async function guardarNota(habilidad: 'listening' | 'reading' | 'writing' | 'speaking', nota: number) {
    setNotas((n) => ({ ...n, [habilidad]: nota }))
    await registrarNotaBloque(bloque, habilidad, nota)
    setEnPreguntas(false)
    if (habilidad === 'listening') setPaso('reading')
    else if (habilidad === 'reading') setPaso('writing')
    else if (habilidad === 'writing') setPaso('speaking')
    else setPaso('resultado')
  }

  if (paso === 'resultado') {
    const vals = [notas.listening, notas.reading, notas.writing, notas.speaking].filter(
      (n): n is number => n !== undefined
    )
    const promedio = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
    const aprobado = promedio >= 75
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Examen de bloque {bloque}</h1>
        <div className="tarjeta flex flex-col items-center gap-2 py-8">
          <span className={`text-5xl font-black ${aprobado ? 'text-emerald-500' : 'text-rose-500'}`}>{promedio}%</span>
          <span className="text-slate-500 dark:text-slate-400">
            {aprobado ? '¡Bloque aprobado! 🎉' : 'Necesitas 75% en promedio'}
          </span>
        </div>
        <div className="tarjeta grid grid-cols-2 gap-3 text-center text-sm">
          <div>
            <p className="text-slate-500 dark:text-slate-400">Listening</p>
            <p className="text-xl font-bold">{notas.listening}%</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Reading</p>
            <p className="text-xl font-bold">{notas.reading}%</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Writing</p>
            <p className="text-xl font-bold">{notas.writing}%</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Speaking</p>
            <p className="text-xl font-bold">{notas.speaking}%</p>
          </div>
        </div>
        {!aprobado && (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            No pasa nada, puedes repetirlo cuando quieras.
          </p>
        )}
        <button onClick={onSalir} className="btn-primary">
          Volver a exámenes
        </button>
      </div>
    )
  }

  if (paso === 'writing') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Examen de bloque {bloque} · Writing</h1>
        <PasoWriting bloque={bloque} onDone={(promedio) => guardarNota('writing', promedio)} />
      </div>
    )
  }

  if (paso === 'speaking') {
    if (!hayApiKey()) {
      return (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Examen de bloque {bloque} · Speaking</h1>
          <Autoevaluacion
            textoIntro="Sin API key configurada, autoevalúa tu speaking hablando en voz alta sobre el escenario:"
            checklist={CHECKLIST_SPEAKING}
            onDone={(nota) => guardarNota('speaking', nota)}
          />
          <p className="tarjeta text-sm text-slate-500 dark:text-slate-400">
            Escenario: {escenarioDe(temaEscenario)}
          </p>
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Examen de bloque {bloque} · Speaking</h1>
        <ChatSpeaking
          idioma="en"
          tema={temaEscenario}
          modoExamen
          onFinish={(fb: FeedbackSpeaking) => guardarNota('speaking', fb.nota ?? 70)}
        />
      </div>
    )
  }

  if (paso === 'reading') {
    if (enPreguntas) {
      return (
        <ExamRunner
          preguntas={reading.preguntas}
          etiqueta="Reading"
          onFinish={(aciertos, total) => guardarNota('reading', Math.round((aciertos / total) * 100))}
        />
      )
    }
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Examen de bloque {bloque} · Reading</h1>
        {reading.textos.map((t) => (
          <div key={t.idioma} className="tarjeta flex flex-col gap-2">
            <span className={t.idioma === 'en' ? 'chip-en self-start' : 'chip-fr self-start'}>
              {t.idioma === 'en' ? 'EN' : 'FR'}
            </span>
            <h3 className="font-bold">{t.titulo}</h3>
            <p className="text-sm leading-relaxed">{t.texto}</p>
          </div>
        ))}
        <button onClick={() => setEnPreguntas(true)} className="btn-primary">
          Responder preguntas ({reading.preguntas.length})
        </button>
      </div>
    )
  }

  // listening
  if (enPreguntas) {
    return (
      <ExamRunner
        preguntas={listening.preguntas}
        etiqueta="Listening"
        onFinish={(aciertos, total) => guardarNota('listening', Math.round((aciertos / total) * 100))}
      />
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Examen de bloque {bloque} · Listening</h1>
      {listening.dialogos.map((d, i) => (
        <div key={`${d.tema}-${d.idioma}-${i}`} className="tarjeta flex flex-col gap-3">
          <span className={d.idioma === 'en' ? 'chip-en self-start' : 'chip-fr self-start'}>
            {d.idioma === 'en' ? 'EN' : 'FR'}
          </span>
          <h3 className="font-bold">{d.titulo}</h3>
          <button
            onClick={() => reproducirDialogo(d.lineas, d.idioma, bloque * 6, {})}
            className="btn-primary self-start"
          >
            🔊 Escuchar
          </button>
          {!transcripcionListening ? null : (
            <div className="flex flex-col gap-1">
              {d.lineas.map((l, i) => (
                <button
                  key={i}
                  onClick={() => reproducirLinea(l.texto, d.idioma, bloque * 6)}
                  className="flex gap-2 text-left text-sm"
                >
                  <span className="font-bold text-slate-400">{l.hablante}:</span>
                  <span>{l.texto}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      <button
        onClick={() => setTranscripcionListening(true)}
        className="text-center text-sm text-slate-500 underline dark:text-slate-400"
      >
        Mostrar transcripción
      </button>
      <button onClick={() => setEnPreguntas(true)} className="btn-primary">
        Responder preguntas ({listening.preguntas.length})
      </button>
    </div>
  )
}

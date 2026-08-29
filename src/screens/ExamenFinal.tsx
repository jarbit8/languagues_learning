import { useMemo, useState } from 'react'
import type { FeedbackSpeaking, Pregunta } from '../types'
import { construirVocabFinal, construirGramaticaFinal, construirListeningFinal, construirReadingFinal } from '../lib/examenFinal'
import { registrarResultado } from '../lib/srs'
import { registrarExamenFinal } from '../lib/progreso'
import { hayApiKey } from '../lib/apiKey'
import { reproducirDialogo } from '../lib/listening'
import ExamRunner from '../components/ExamRunner'
import ChatSpeaking from '../components/ChatSpeaking'
import PasoWriting from '../components/PasoWriting'
import PasoSpeakingExamen from '../components/PasoSpeakingExamen'
import { tareaFinal } from '../data/tareasSpeaking'

type Paso = 'intro' | 'vocab' | 'gramatica' | 'listening' | 'reading' | 'writing' | 'speaking' | 'resultado'

const CHECKLIST_SPEAKING = [
  'Puedo presentarme y hablar de mi vida',
  'Puedo contar planes futuros',
  'Puedo hacer y responder preguntas',
  'Uso frases completas y conectores',
  'Mi pronunciación es entendible'
]

async function onAnswerVocab(p: Pregunta, acierto: boolean) {
  if (p.palabraId) await registrarResultado(p.palabraId, acierto)
}

export default function ExamenFinal({ onSalir }: { onSalir: () => void }) {
  const [paso, setPaso] = useState<Paso>('intro')
  const [notaVocab, setNotaVocab] = useState<number | null>(null)
  const [notaGramatica, setNotaGramatica] = useState<number | null>(null)
  const [notasHab, setNotasHab] = useState<{ listening?: number; reading?: number; writing?: number; speaking?: number }>({})
  const [enPreguntas, setEnPreguntas] = useState(false)

  const vocabPreguntas = useMemo(() => construirVocabFinal(), [])
  const gramaticaPreguntas = useMemo(() => construirGramaticaFinal(), [])
  const listening = useMemo(() => construirListeningFinal(), [])
  const reading = useMemo(() => construirReadingFinal(), [])

  if (paso === 'intro') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Examen final A1</h1>
        <div className="tarjeta flex flex-col gap-2 text-sm">
          <p>
            100 palabras aleatorias de todo el nivel + {gramaticaPreguntas.length} ejercicios de gramática de los 24
            temas + las 4 habilidades en versión extendida.
          </p>
          <p>Corte: 85% en vocabulario, 80% en gramática y 80% en habilidades para certificar el nivel.</p>
        </div>
        <button onClick={() => setPaso('vocab')} className="btn-primary">
          Empezar
        </button>
      </div>
    )
  }

  if (paso === 'vocab') {
    return (
      <ExamRunner
        // key: cada sección debe montar un ExamRunner NUEVO. Sin esto React reutiliza el mismo
        // y conserva el índice de la sección anterior (ej. 99 de 100 palabras) contra un arreglo
        // más corto → preguntas[99] undefined → pantalla en blanco.
        key={paso}
        preguntas={vocabPreguntas}
        etiqueta="Vocabulario final"
        tiempoSegundos={vocabPreguntas.length * 20}
        onAnswer={onAnswerVocab}
        onFinish={(aciertos, total) => {
          setNotaVocab(Math.round((aciertos / total) * 100))
          setPaso('gramatica')
        }}
      />
    )
  }

  if (paso === 'gramatica') {
    return (
      <ExamRunner
        key={paso}
        preguntas={gramaticaPreguntas}
        etiqueta="Gramática final"
        tiempoSegundos={gramaticaPreguntas.length * 45}
        onFinish={(aciertos, total) => {
          setNotaGramatica(Math.round((aciertos / total) * 100))
          setPaso('listening')
        }}
      />
    )
  }

  if (paso === 'listening') {
    if (enPreguntas) {
      return (
        <ExamRunner
          key={paso}
          preguntas={listening.preguntas}
          etiqueta="Listening final"
          tiempoSegundos={listening.preguntas.length * 30}
          onFinish={(aciertos, total) => {
            setNotasHab((n) => ({ ...n, listening: Math.round((aciertos / total) * 100) }))
            setEnPreguntas(false)
            setPaso('reading')
          }}
        />
      )
    }
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Listening final</h1>
        {listening.dialogos.map((d, i) => (
          <div key={`${d.tema}-${i}`} className="tarjeta flex flex-col gap-3">
            <h3 className="font-bold">{d.titulo}</h3>
            <button onClick={() => reproducirDialogo(d.lineas, d.tema, {})} className="btn-primary self-start">
              🔊 Escuchar
            </button>
          </div>
        ))}
        <button onClick={() => setEnPreguntas(true)} className="btn-primary">
          Responder preguntas ({listening.preguntas.length})
        </button>
      </div>
    )
  }

  if (paso === 'reading') {
    if (enPreguntas) {
      return (
        <ExamRunner
          key={paso}
          preguntas={reading.preguntas}
          etiqueta="Reading final"
          tiempoSegundos={reading.preguntas.length * 40}
          onFinish={(aciertos, total) => {
            setNotasHab((n) => ({ ...n, reading: Math.round((aciertos / total) * 100) }))
            setEnPreguntas(false)
            setPaso('writing')
          }}
        />
      )
    }
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Reading final</h1>
        {reading.textos.map((t, i) => (
          <div key={i} className="tarjeta flex flex-col gap-2">
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

  if (paso === 'writing') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Writing final</h1>
        <PasoWriting
          bloque={4}
          onDone={(promedio) => {
            setNotasHab((n) => ({ ...n, writing: promedio }))
            setPaso('speaking')
          }}
        />
      </div>
    )
  }

  if (paso === 'speaking') {
    if (!hayApiKey()) {
      return (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Speaking final</h1>
          <PasoSpeakingExamen
            tarea={tareaFinal()}
            tema={24}
            meta="si ya está listo para dar por terminado el nivel A1 y pasar al A2"
            onDone={async (nota) => {
              const habilidades = { ...notasHab, speaking: nota }
              await finalizar(habilidades)
            }}
          />
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Speaking final</h1>
        <ChatSpeaking
          tema={24}
          modoExamen
          onFinish={async (fb: FeedbackSpeaking) => {
            const habilidades = { ...notasHab, speaking: fb.nota ?? 70 }
            await finalizar(habilidades)
          }}
        />
      </div>
    )
  }

  // resultado
  const notaHabilidadesFinal = (() => {
    const vals = [notasHab.listening, notasHab.reading, notasHab.writing, notasHab.speaking].filter(
      (n): n is number => n !== undefined
    )
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  })()
  const aprobado = (notaVocab ?? 0) >= 85 && (notaGramatica ?? 0) >= 80 && notaHabilidadesFinal >= 80
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Resultado — Examen final A1</h1>
      <div className="tarjeta flex flex-col items-center gap-2 py-8">
        <span className={`text-5xl font-black ${aprobado ? 'text-emerald-500' : 'text-rose-500'}`}>
          {aprobado ? '¡Certificado! 🎓' : 'Aún no'}
        </span>
        <span className="text-center text-slate-500 dark:text-slate-400">
          Vocabulario {notaVocab}% · Gramática {notaGramatica}% · Habilidades {notaHabilidadesFinal}%
        </span>
      </div>
      {aprobado ? (
        <p className="tarjeta text-center text-sm text-emerald-600 dark:text-emerald-400">
          Nivel A1 certificado. El pack A2 llega pronto 🚀
        </p>
      ) : (
        <p className="tarjeta text-center text-sm text-slate-500 dark:text-slate-400">
          Necesitas 85% en vocabulario y 80% en habilidades. Puedes repetirlo cuando quieras.
        </p>
      )}
      <button onClick={onSalir} className="btn-primary">
        Volver a exámenes
      </button>
    </div>
  )

  async function finalizar(habilidades: typeof notasHab) {
    setNotasHab(habilidades)
    const vals = [habilidades.listening, habilidades.reading, habilidades.writing, habilidades.speaking].filter(
      (n): n is number => n !== undefined
    )
    const notaHabilidades = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
    await registrarExamenFinal(notaVocab ?? 0, notaGramatica ?? 0, notaHabilidades)
    setPaso('resultado')
  }
}

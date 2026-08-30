import { useMemo, useState } from 'react'
import type { NotasBloque, Pregunta } from '../types'
import { construirExamenTema } from '../lib/examenTema'
import { listeningDeTema, readingDeTema, consignaDeTema, promptHablarExamen } from '../lib/examenHabilidades'
import { registrarExamenTema } from '../lib/progreso'
import { registrarResultado } from '../lib/srs'
import { reproducirDialogo, detener } from '../lib/listening'
import ExamRunner from '../components/ExamRunner'
import CopiarPrompt from '../components/CopiarPrompt'
import Autoevaluacion from '../components/Autoevaluacion'
import { EscribirConsigna } from '../components/PasoWriting'

// Examen de tema COMPLETO: las 6 secciones (2026-08-29, "un examen general que involucre
// todo todo"). Antes solo medía vocabulario y gramática, así que se podía desbloquear el
// tema siguiente sin haber escuchado, leído, escrito ni hablado nada de ese tema.
// Es la puerta de progresión; las mismas destrezas sueltas están en Practicar sin nota.
type Paso = 'vocab' | 'gramatica' | 'listening' | 'reading' | 'writing' | 'speaking' | 'resultado'

const SIGUIENTE: Record<Exclude<Paso, 'resultado'>, Paso> = {
  vocab: 'gramatica',
  gramatica: 'listening',
  listening: 'reading',
  reading: 'writing',
  writing: 'speaking',
  speaking: 'resultado'
}

const CHECKLIST_HABLAR = [
  'Respondí a lo que me preguntaba, sin irme por las ramas',
  'Hablé en frases completas, no en palabras sueltas',
  'Usé el vocabulario de este tema',
  'Hablé todo el rato en inglés, sin cambiar al español',
  'La IA me dio el veredicto LISTO ✅'
]

export default function ExamenTema({ tema, onSalir }: { tema: number; onSalir: () => void }) {
  const [paso, setPaso] = useState<Paso>('vocab')
  const [notas, setNotas] = useState<NotasBloque>({})
  const [enPreguntas, setEnPreguntas] = useState(false)
  const [aprobado, setAprobado] = useState(false)

  const examen = useMemo(() => construirExamenTema(tema), [tema])
  const listening = useMemo(() => listeningDeTema(tema), [tema])
  const reading = useMemo(() => readingDeTema(tema), [tema])
  const consigna = useMemo(() => consignaDeTema(tema), [tema])

  async function guardarNota(seccion: keyof NotasBloque, nota: number) {
    const nuevas = { ...notas, [seccion]: nota }
    setNotas(nuevas)
    setEnPreguntas(false)
    detener()
    if (seccion === 'speaking') {
      setAprobado(await registrarExamenTema(tema, nuevas))
      setPaso('resultado')
      return
    }
    setPaso(SIGUIENTE[seccion])
  }

  if (paso === 'vocab' || paso === 'gramatica') {
    const esVocab = paso === 'vocab'
    const preguntas = esVocab ? examen.vocab : examen.gramatica
    return (
      <ExamRunner
        key={paso}
        preguntas={preguntas}
        etiqueta={`Tema ${tema} · ${esVocab ? 'Vocabulario' : 'Gramática'}`}
        tiempoSegundos={preguntas.length * 30}
        onAnswer={async (p: Pregunta, acierto: boolean) => {
          if (p.palabraId) await registrarResultado(p.palabraId, acierto)
        }}
        onFinish={(aciertos, total) => guardarNota(paso, Math.round((aciertos / total) * 100))}
      />
    )
  }

  if (paso === 'listening') {
    if (!listening) return <Saltar seccion="listening" onSaltar={() => guardarNota('listening', 0)} />
    if (enPreguntas) {
      return (
        <ExamRunner
          key="listening"
          preguntas={listening.preguntas}
          etiqueta={`Tema ${tema} · Listening`}
          tiempoSegundos={listening.preguntas.length * 30}
          onFinish={(aciertos, total) => guardarNota('listening', Math.round((aciertos / total) * 100))}
        />
      )
    }
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Tema {tema} · Listening</h1>
        <div className="tarjeta flex flex-col gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {listening.cuantosDialogos} diálogos seguidos, como un audio largo. En el examen no hay transcripción:
            escucha las veces que necesites y luego responde.
          </p>
          <button onClick={() => reproducirDialogo(listening.lineas, tema, {})} className="btn-primary self-start">
            🔊 Escuchar el audio
          </button>
        </div>
        <button onClick={() => setEnPreguntas(true)} className="btn-primary">
          Responder preguntas ({listening.preguntas.length})
        </button>
      </div>
    )
  }

  if (paso === 'reading') {
    if (!reading) return <Saltar seccion="reading" onSaltar={() => guardarNota('reading', 0)} />
    if (enPreguntas) {
      return (
        <ExamRunner
          key="reading"
          preguntas={reading.preguntas}
          etiqueta={`Tema ${tema} · Reading`}
          tiempoSegundos={reading.preguntas.length * 40}
          onFinish={(aciertos, total) => guardarNota('reading', Math.round((aciertos / total) * 100))}
        />
      )
    }
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Tema {tema} · Reading</h1>
        <div className="tarjeta flex flex-col gap-2">
          <h3 className="font-bold">{reading.texto.titulo}</h3>
          <p className="text-sm leading-relaxed">{reading.texto.texto}</p>
        </div>
        <button onClick={() => setEnPreguntas(true)} className="btn-primary">
          Responder preguntas ({reading.preguntas.length})
        </button>
      </div>
    )
  }

  if (paso === 'writing') {
    if (!consigna) return <Saltar seccion="writing" onSaltar={() => guardarNota('writing', 0)} />
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Tema {tema} · Writing</h1>
        <EscribirConsigna pack={consigna} onDone={(nota) => guardarNota('writing', nota)} />
      </div>
    )
  }

  if (paso === 'speaking') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Tema {tema} · Speaking</h1>
        <CopiarPrompt
          prompt={promptHablarExamen(tema)}
          descripcion="Pega esto en una IA con voz (ChatGPT, Gemini…) y habla con ella del tema. Al final te dirá VEREDICTO: LISTO ✅ o AÚN NO ⏳."
        />
        <Autoevaluacion checklist={CHECKLIST_HABLAR} onDone={(nota) => guardarNota('speaking', nota)} />
      </div>
    )
  }

  // resultado
  const habilidades = [notas.listening, notas.reading, notas.writing, notas.speaking].filter(
    (n): n is number => n !== undefined
  )
  const promedioHab = habilidades.length
    ? Math.round(habilidades.reduce((a, b) => a + b, 0) / habilidades.length)
    : 0
  const FILAS: [string, number | undefined, number][] = [
    ['Vocabulario', notas.vocab, 80],
    ['Gramática', notas.gramatica, 80],
    ['Listening', notas.listening, 75],
    ['Reading', notas.reading, 75],
    ['Writing', notas.writing, 75],
    ['Speaking', notas.speaking, 75]
  ]
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Examen del tema {tema}</h1>
      <div className="tarjeta flex flex-col items-center gap-2 py-8">
        <span className={`text-5xl font-black ${aprobado ? 'text-emerald-500' : 'text-rose-500'}`}>
          {aprobado ? '¡Aprobado! 🎉' : 'Aún no'}
        </span>
        <span className="text-center text-sm text-slate-500 dark:text-slate-400">
          {aprobado
            ? 'Tema siguiente desbloqueado'
            : 'Necesitas 80% en vocabulario y gramática, y 75% de promedio en las destrezas'}
        </span>
      </div>
      <div className="tarjeta grid grid-cols-2 gap-3 text-center text-sm">
        {FILAS.map(([nombre, nota, minimo]) => (
          <div key={nombre}>
            <p className="text-slate-500 dark:text-slate-400">{nombre}</p>
            <p className={`text-xl font-bold ${(nota ?? 0) >= minimo ? 'text-emerald-500' : 'text-rose-500'}`}>
              {nota ?? 0}%
            </p>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-slate-400">Promedio de destrezas: {promedioHab}%</p>
      {!aprobado && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Las palabras falladas volvieron al repaso. Puedes repetirlo cuando quieras.
        </p>
      )}
      <button onClick={onSalir} className="btn-primary">
        Volver a exámenes
      </button>
    </div>
  )
}

// Un tema sin pack de alguna destreza no puede bloquear el examen entero.
function Saltar({ seccion, onSaltar }: { seccion: string; onSaltar: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="tarjeta text-slate-500 dark:text-slate-400">
        Este tema todavía no tiene contenido de {seccion}.
      </p>
      <button onClick={onSaltar} className="btn-primary">
        Continuar
      </button>
    </div>
  )
}

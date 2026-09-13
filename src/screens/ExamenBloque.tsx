import { useEffect, useMemo, useState } from 'react'
import type { NotasBloque, Pregunta } from '../types'
import { temasDeBloque } from '../lib/curriculum'
import TextoLeible from '../components/TextoLeible'
import {
  construirListeningBloque,
  construirReadingBloque,
  construirVocabBloque,
  construirGramaticaBloque
} from '../lib/examenBloque'
import { registrarResultado } from '../lib/srs'
import { registrarNotaBloque, reiniciarNotasBloque } from '../lib/progreso'
import { reproducirDialogo } from '../lib/listening'
import ExamRunner from '../components/ExamRunner'
import PasoWriting from '../components/PasoWriting'
import PasoSpeakingExamen from '../components/PasoSpeakingExamen'
import { tareaDeBloque } from '../data/tareasSpeaking'

// 6 secciones: se repasa lo acumulado (vocabulario y gramática de los 6 temas) antes de
// medir las 4 destrezas.
type Paso = 'vocab' | 'gramatica' | 'listening' | 'reading' | 'writing' | 'speaking' | 'resultado'

const SIGUIENTE: Record<Exclude<Paso, 'resultado'>, Paso> = {
  vocab: 'gramatica',
  gramatica: 'listening',
  listening: 'reading',
  reading: 'writing',
  writing: 'speaking',
  speaking: 'resultado'
}

const CHECKLIST_SPEAKING = [
  'Puedo presentarme y saludar',
  'Puedo hacer preguntas simples',
  'Puedo responder sobre mi rutina o mi vida',
  'Uso frases completas, no solo palabras sueltas',
  'Mi pronunciación es entendible'
]

export default function ExamenBloque({ bloque, onSalir }: { bloque: number; onSalir: () => void }) {
  const [paso, setPaso] = useState<Paso>('vocab')
  const [notas, setNotas] = useState<NotasBloque>({})
  const [enPreguntas, setEnPreguntas] = useState(false)

  // Cada intento empieza de cero. `registrarNotaBloque` da el examen por terminado cuando hay
  // nota en las 6 secciones, y las del intento anterior seguían guardadas: al repetirlo, la
  // primera sección ya lo cerraba mezclando la nota nueva con cinco viejas.
  useEffect(() => {
    void reiniciarNotasBloque(bloque)
  }, [bloque])

  const vocab = useMemo(() => construirVocabBloque(bloque), [bloque])
  const gramatica = useMemo(() => construirGramaticaBloque(bloque), [bloque])
  const listening = useMemo(() => construirListeningBloque(bloque), [bloque])
  const reading = useMemo(() => construirReadingBloque(bloque), [bloque])
  const temaEscenario = temasDeBloque(bloque)[0]

  async function guardarNota(habilidad: keyof NotasBloque, nota: number) {
    setNotas((n) => ({ ...n, [habilidad]: nota }))
    await registrarNotaBloque(bloque, habilidad, nota)
    setEnPreguntas(false)
    setPaso(SIGUIENTE[habilidad])
  }

  // Repaso acumulado de los 6 temas: vocabulario y gramática mezclados de todo el bloque.
  if (paso === 'vocab' || paso === 'gramatica') {
    const esVocab = paso === 'vocab'
    const preguntas = esVocab ? vocab : gramatica
    return (
      <ExamRunner
        key={paso}
        preguntas={preguntas}
        etiqueta={`Bloque ${bloque} · ${esVocab ? 'Vocabulario' : 'Gramática'}`}
        tiempoSegundos={preguntas.length * 30}
        onAnswer={async (p: Pregunta, acierto: boolean) => {
          if (p.palabraId) await registrarResultado(p.palabraId, acierto)
        }}
        onFinish={(aciertos, total) =>
          guardarNota(paso, Math.round((aciertos / total) * 100))
        }
      />
    )
  }

  if (paso === 'resultado') {
    const vals = [notas.vocab, notas.gramatica, notas.listening, notas.reading, notas.writing, notas.speaking].filter(
      (n): n is number => n !== undefined
    )
    const promedio = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
    const aprobado = promedio >= 75
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Examen de bloque {bloque}</h1>
        <div className="tarjeta flex flex-col items-center gap-2 py-8">
          <span className={`text-5xl font-black ${aprobado ? 'text-emerald-500' : 'text-rose-500'}`}>{promedio}%</span>
          <span className="text-slate-500 dark:text-slate-400">
            {aprobado ? '¡Bloque aprobado! 🎉' : 'Necesitas 75% en promedio'}
          </span>
        </div>
        <div className="tarjeta grid grid-cols-2 gap-3 text-center text-sm">
          {(
            [
              ['Vocabulario', notas.vocab],
              ['Gramática', notas.gramatica],
              ['Listening', notas.listening],
              ['Reading', notas.reading],
              ['Writing', notas.writing],
              ['Speaking', notas.speaking]
            ] as const
          ).map(([nombre, nota]) => (
            <div key={nombre}>
              <p className="text-slate-500 dark:text-slate-400">{nombre}</p>
              <p className={`text-xl font-bold ${(nota ?? 0) >= 75 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {nota}%
              </p>
            </div>
          ))}
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
        <h1 className="text-2xl font-extrabold tracking-tight">Examen de bloque {bloque} · Writing</h1>
        <PasoWriting
          bloque={bloque}
          tema={temasDeBloque(bloque).at(-1) ?? bloque * 6}
          meta={`si aprueba el examen del bloque ${bloque}`}
          onDone={(promedio) => guardarNota('writing', promedio)}
        />
      </div>
    )
  }

  if (paso === 'speaking') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Examen de bloque {bloque} · Speaking</h1>
        <PasoSpeakingExamen
          tarea={tareaDeBloque(bloque)}
          tema={temaEscenario}
          meta={
            bloque >= 4
              ? 'si ya domina el último bloque del nivel A1 y puede presentarse al examen final del nivel'
              : `si ya domina el bloque ${bloque} del nivel A1 y puede avanzar al bloque ${bloque + 1}`
          }
          onDone={(nota) => guardarNota('speaking', nota)}
        />
      </div>
    )
  }

  if (paso === 'reading') {
    // Los textos siguen a la vista mientras responde, como en IELTS y como en Practicar: antes
    // desaparecían al pasar a las preguntas y había que contestarlas de memoria.
    const textos = reading.textos.map((t, i) => (
      <div key={i} className="tarjeta flex flex-col gap-2">
        <h3 className="font-bold">{t.titulo}</h3>
        <TextoLeible texto={t} />
      </div>
    ))
    if (enPreguntas) {
      return (
        <div className="flex flex-col gap-4">
          <ExamRunner
            key="reading"
            preguntas={reading.preguntas}
            etiqueta="Reading"
            tiempoSegundos={reading.preguntas.length * 40}
            onFinish={(aciertos, total) => guardarNota('reading', Math.round((aciertos / total) * 100))}
          />
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Los textos</h2>
          {textos}
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Examen de bloque {bloque} · Reading</h1>
        {textos}
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
        key="listening"
        preguntas={listening.preguntas}
        etiqueta="Listening"
        tiempoSegundos={listening.preguntas.length * 30}
        onFinish={(aciertos, total) => guardarNota('listening', Math.round((aciertos / total) * 100))}
      />
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Examen de bloque {bloque} · Listening</h1>
      {listening.dialogos.map((d, i) => (
        <div key={`${d.tema}-${i}`} className="tarjeta flex flex-col gap-3">
          <h3 className="font-bold">{d.titulo}</h3>
          <button
            onClick={() => reproducirDialogo(d.lineas, bloque * 6, {})}
            className="btn-primary self-start"
          >
            🔊 Escuchar
          </button>
        </div>
      ))}
      {/* Sin transcripción, igual que en el examen de tema: con ella a un toque, el listening
          se podía responder leyendo. */}
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Escucha las veces que necesites y luego responde.
      </p>
      <button onClick={() => setEnPreguntas(true)} className="btn-primary">
        Responder preguntas ({listening.preguntas.length})
      </button>
    </div>
  )
}

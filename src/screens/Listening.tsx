import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { DialogoListening, Pregunta } from '../types'
import { temaEnCurso } from '../lib/progreso'
import { getVocabPack, getListening } from '../data/packs'
import {
  reproducirDialogo,
  reproducirLinea,
  detener,
  rateListening,
  hablantesDe,
  hayVocesDistintas
} from '../lib/listening'
import { preguntaDeListening } from '../lib/preguntas'
import { sesionDeletreo, itemsDisponibles } from '../lib/deletreo'
import ExamRunner from '../components/ExamRunner'
import SelectorDia from '../components/SelectorDia'
import AvisoVoz from '../components/AvisoVoz'
import { porDia } from '../lib/porDia'
import { marcarHecho, claveEscuchar, claveDeletreo } from '../lib/avance'

// Estima la duración del audio TTS (aprox — la velocidad real depende de la voz del dispositivo).
function duracionAprox(dialogo: DialogoListening, tema: number): number {
  const palabras = dialogo.lineas.reduce((n, l) => n + l.texto.trim().split(/\s+/).length, 0)
  const rate = rateListening(tema)
  return Math.round(palabras / (rate * 2.4) + dialogo.lineas.length * 0.35)
}

function formatoDuracion(seg: number): string {
  if (seg < 60) return `≈ ${seg} s`
  return `≈ ${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`
}

function DialogoCard({
  dialogo,
  indice,
  tema,
  onExamen
}: {
  dialogo: DialogoListening
  indice: number
  tema: number
  onExamen: (indice: number) => void
}) {
  const [transcripcion, setTranscripcion] = useState(false)
  const [lineaActiva, setLineaActiva] = useState(-1)
  // Los personajes del diálogo, en el mismo orden que reparte las voces. El chip que se
  // enciende dice QUIÉN habla sin destapar QUÉ dice: con la transcripción oculta —que es como
  // hay que escucharlo la primera vez— antes no había forma de saberlo.
  const hablantes = hablantesDe(dialogo.lineas)
  const hablando = lineaActiva >= 0 ? dialogo.lineas[lineaActiva]?.hablante : null

  return (
    <div className="tarjeta flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${
            'bg-en'
          }`}
        >
          {indice + 1}
        </span>
        <h2 className="flex-1 font-bold">{dialogo.titulo}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
          🕐 {formatoDuracion(duracionAprox(dialogo, tema))}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() =>
            reproducirDialogo(dialogo.lineas, tema, {
              onLinea: setLineaActiva,
              onFin: () => setLineaActiva(-1)
            })
          }
          className="btn-primary flex-1"
        >
          🔊 Escuchar
        </button>
        <button
          onClick={() =>
            reproducirDialogo(dialogo.lineas, tema, {
              lento: true,
              onLinea: setLineaActiva,
              onFin: () => setLineaActiva(-1)
            })
          }
          className="btn bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
        >
          🐢 Lento
        </button>
      </div>

      <div className="flex items-center justify-center gap-2">
        {hablantes.map((h, i) => (
          <span
            key={h}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              hablando === h
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
            }`}
          >
            {i === 0 ? '👤' : '🧑'} {h}
          </span>
        ))}
      </div>

      {!transcripcion ? (
        <button
          onClick={() => setTranscripcion(true)}
          className="text-center text-sm text-slate-500 underline dark:text-slate-400"
        >
          Mostrar transcripción
        </button>
      ) : (
        <div className="flex flex-col gap-1">
          {dialogo.lineas.map((l, i) => (
            <button
              key={i}
              onClick={() =>
                reproducirLinea(l.texto, tema, {
                  idxHablante: [...new Set(dialogo.lineas.map((x) => x.hablante))].indexOf(l.hablante)
                })
              }
              className={`flex items-start gap-2 rounded-lg px-2 py-1 text-left text-sm ${
                lineaActiva === i ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''
              }`}
            >
              <span className="font-bold text-slate-400">{l.hablante}:</span>
              <span className="flex-1">{l.texto}</span>
              <span>🔊</span>
            </button>
          ))}
        </div>
      )}

      <button onClick={() => onExamen(indice)} className="btn-primary">
        Responder preguntas ({dialogo.preguntas.length})
      </button>
    </div>
  )
}

export default function Listening() {
  const temaActual = useLiveQuery(() => temaEnCurso(), [], 1) ?? 1
  const [tema, setTema] = useState<number | null>(null)
  // Un diálogo por día: enseñar los dos juntos destripa el material del día siguiente.
  const [dia, setDia] = useState<1 | 2>(1)
  const [examenDialogo, setExamenDialogo] = useState<number | null>(null)
  const [deletreo, setDeletreo] = useState<Pregunta[] | null>(null)
  const [resultado, setResultado] = useState<{ aciertos: number; total: number } | null>(null)

  const temaSel = tema ?? temaActual
  const pack = getListening(temaSel)
  const temasDisponibles = Array.from({ length: temaActual }, (_, i) => i + 1)

  function reset() {
    detener()
    setExamenDialogo(null)
    setDeletreo(null)
    setResultado(null)
  }

  function cambiarTema(t: number) {
    reset()
    setTema(t)
  }

  // --- Resultado: lo comparten los dos ejercicios de la pantalla (diálogo y deletreo) ---
  if (resultado) {
    const pct = Math.round((resultado.aciertos / resultado.total) * 100)
    const emoji = pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪'
    return (
      <div className="flex flex-col gap-4">
        <div className="tarjeta flex flex-col items-center gap-2 py-8">
          <span className="text-5xl">{emoji}</span>
          <span className="text-5xl font-black">{pct}%</span>
          <span className="text-slate-500 dark:text-slate-400">
            {resultado.aciertos} de {resultado.total} correctas
          </span>
        </div>
        <button onClick={reset} className="btn-primary">
          Volver al listening
        </button>
      </div>
    )
  }

  // --- Modo dictado de deletreo ---
  if (deletreo) {
    return (
      <div className="flex flex-col gap-4">
        <button onClick={reset} className="self-start text-sm text-slate-500 underline dark:text-slate-400">
          ← Salir del dictado
        </button>
        <ExamRunner
          preguntas={deletreo}
          etiqueta="Deletreo"
          onFinish={async (aciertos, total) => {
            await marcarHecho(temaSel, claveDeletreo(dia))
            setResultado({ aciertos, total })
          }}
        />
      </div>
    )
  }

  // --- Modo examen de un diálogo ---
  if (pack && examenDialogo !== null) {
    const dialogo = pack.dialogos[examenDialogo]
    const preguntas = dialogo.preguntas.map(preguntaDeListening)
    return (
      <div className="flex flex-col gap-4">
        <button onClick={reset} className="self-start text-sm text-slate-500 underline dark:text-slate-400">
          ← Volver al diálogo
        </button>
        <ExamRunner
          preguntas={preguntas}
          etiqueta={`Listening · ${dialogo.titulo}`}
          onFinish={async (aciertos, total) => {
            await marcarHecho(temaSel, claveEscuchar(examenDialogo))
            setResultado({ aciertos, total })
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* SIN SELECTOR DE TEMA (2026-08-30): Practicar es siempre el tema EN CURSO. El selector
          dejaba elegir temas pasados y era ruido: al aprobar el examen aparece el siguiente y
          ya está. Para repasar lo anterior están Aprender → Aprendido y Exámenes → POR TEMA. */}
      <p className="text-sm font-semibold">{`Tema ${temaSel} — ${getVocabPack(temaSel)?.titulo ?? ''}`}</p>

      <AvisoVoz />

      <SelectorDia dia={dia} onCambio={setDia} />

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Escucha el diálogo (sin mirar la transcripción la primera vez), luego responde las preguntas. Solo usa
        vocabulario de temas que ya viste.{' '}
        {hayVocesDistintas()
          ? 'Cada personaje tiene su propia voz, y el chip verde marca quién habla.'
          : 'Este aparato no tiene dos voces en inglés, así que los personajes se separan por el tono (uno grave y otro agudo). Instalando voces inglesas suenan como dos personas distintas.'}
      </p>

      {!pack ? (
        <p className="tarjeta text-slate-500 dark:text-slate-400">
          Aún no hay listening para el tema {temaSel}.
        </p>
      ) : (
        // DOS diálogos por día: uno solo deja el módulo en 3 min y el objetivo son 5.
        // Si el tema aún no tiene los cuatro, se reparte lo que haya sin dejar el día vacío.
        porDia(pack.dialogos, dia).map((d) => {
          const i = pack.dialogos.indexOf(d)
          return <DialogoCard key={i} dialogo={d} indice={i} tema={temaSel} onExamen={setExamenDialogo} />
        })
      )}

      {/* DELETREO (2026-09-07). El abecedario vivía solo en Pronunciar: 26 letras con audio y
          un entrenador de pares. Eso entrena reconocer UNA letra, que no es la habilidad —
          la habilidad es oírlas seguidas y armar la palabra. No cabía como tema (el examen de
          vocabulario pregunta "¿qué significa X?" y con una letra eso no existe), así que va
          aquí, que es donde el material es audio. */}
      {itemsDisponibles(temaSel).length > 0 && (
        <div className="tarjeta flex flex-col gap-3">
          <h2 className="font-bold">🔤 Dictado: deletreo</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Oyes las letras sueltas y escribes la palabra — la palabra no se dice, la armas tú.
            Es la primera parte del listening de IELTS y lo que te tocará al dar tu apellido por
            teléfono. Salen solo palabras cuyo vocabulario ya viste.
          </p>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {dia === 1
              ? 'Día 1: letras sueltas y palabras.'
              : 'Día 2: casi sin letras sueltas y con las frases, que es lo difícil.'}
          </p>
          <button onClick={() => setDeletreo(sesionDeletreo(temaSel, dia))} className="btn-primary">
            Empezar dictado · día {dia}
          </button>
        </div>
      )}
    </div>
  )
}

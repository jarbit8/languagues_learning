import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { temaEnCurso } from '../lib/progreso'
import { escenarioDe } from '../data/escenarios'
import { getVocabPack } from '../data/packs'
import { construirPromptCopiable, vocabularioDesbloqueado, repasoDelTema } from '../lib/speaking'
import { marcarHecho, claveHablar, estaHecho } from '../lib/avance'
import CopiarPrompt from '../components/CopiarPrompt'
import SelectorDia from '../components/SelectorDia'

// Práctica libre de speaking: SOLO conversación/roleplay del tema. Hubo un selector para elegir
// también una tarea tipo CELPIP y el usuario lo quitó — las tareas de examen siguen vivas en
// data/tareasSpeaking.ts porque las usan ExamenBloque y ExamenFinal, ahí sí tienen sentido.
export default function Conversacion() {
  const tema = useLiveQuery(() => temaEnCurso(), [], 1) ?? 1
  // Un tema son dos días de estudio y cada uno lleva su propio escenario. El selector se
  // quedó SIN PINTAR al quitar el de tema (2026-08-30) y nadie lo notó hasta la auditoría
  // del 2026-09-06: `dia` valía 1 siempre, así que los 24 escenarios de día 2 no salían por
  // ninguna parte y el segundo día se repetía el roleplay del primero.
  const [dia, setDia] = useState<1 | 2>(1)
  const hecho = useLiveQuery(() => estaHecho(tema, claveHablar(dia)), [tema, dia], false)

  const pack = getVocabPack(tema)
  const vocab = vocabularioDesbloqueado(tema)

  // El repaso del tema (palabras + regla del día) viaja DENTRO del prompt: sin él la IA
  // agotaba el escenario en cuatro preguntas y cerraba.
  const prompt = construirPromptCopiable(escenarioDe(tema, dia), vocab, repasoDelTema(tema, dia))

  return (
    <div className="flex flex-col gap-4">
      {/* SIN SELECTOR DE TEMA (2026-08-30): Practicar es siempre el tema EN CURSO. El selector
          dejaba elegir temas pasados y era ruido: al aprobar el examen aparece el siguiente y
          ya está. Para repasar lo anterior están Aprender → Aprendido y Exámenes → POR TEMA. */}
      <p className="text-sm font-semibold">{`Tema ${tema} — ${pack?.titulo ?? ''}`}</p>

      <SelectorDia dia={dia} onCambio={setDia} />

      <CopiarPrompt
        prompt={prompt}
        descripcion="Conversación libre. Pega esto en cualquier chat de IA (Claude, ChatGPT...) y practica. El tutor responde siempre en inglés, nunca en español, y no te suelta hasta repasar todo el tema."
      />

      {/* Hablar es lo único de Practicar que ocurre FUERA de la app, así que no hay forma de
          detectar que lo hizo: lo marca él, como las palabras. Sin esto el módulo se quedaría
          siempre en 0 y la barra del tema nunca llegaría al 100%. */}
      <button
        onClick={() => marcarHecho(tema, claveHablar(dia))}
        disabled={hecho}
        className={`btn ${
          hecho
            ? 'bg-emerald-500 text-white'
            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
        }`}
      >
        {hecho ? `Conversación del día ${dia} hecha ✓` : `Ya conversé con la IA · día ${dia}`}
      </button>

      {pack && <p className="text-center text-xs text-slate-400">Vocabulario disponible: temas 1 a {tema}</p>}
    </div>
  )
}

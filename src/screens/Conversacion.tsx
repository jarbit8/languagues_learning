import { useLiveQuery } from 'dexie-react-hooks'
import { temaEnCurso } from '../lib/progreso'
import { escenarioDe } from '../data/escenarios'
import { getVocabPack } from '../data/packs'
import { construirPromptCopiable, vocabularioDesbloqueado, repasoDelTema } from '../lib/speaking'
import { marcarHecho, claveHablar, estaHecho } from '../lib/avance'
import CopiarPrompt from '../components/CopiarPrompt'

// Práctica libre de speaking: SOLO conversación/roleplay del tema. Hubo un selector para elegir
// también una tarea tipo CELPIP y el usuario lo quitó — las tareas de examen siguen vivas en
// data/tareasSpeaking.ts porque las usan ExamenBloque y ExamenFinal, ahí sí tienen sentido.
//
// UN DÍA DE ESTUDIO Y OTRO DE EXAMEN (2026-09-13): se conversa con el escenario del día 1, pero
// el repaso lleva la gramática ENTERA, que es la que ya vio ese mismo día.
export default function Conversacion() {
  const tema = useLiveQuery(() => temaEnCurso(), [], 1) ?? 1
  const hecho = useLiveQuery(() => estaHecho(tema, claveHablar(1)), [tema], false)

  const pack = getVocabPack(tema)
  const vocab = vocabularioDesbloqueado(tema)

  // El repaso del tema (palabras + regla) viaja DENTRO del prompt: sin él la IA agotaba el
  // escenario en cuatro preguntas y cerraba.
  const prompt = construirPromptCopiable(escenarioDe(tema, 1), vocab, repasoDelTema(tema, 2))

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold">{`Tema ${tema} — ${pack?.titulo ?? ''}`}</p>

      <CopiarPrompt
        prompt={prompt}
        descripcion="Conversación libre. Pega esto en cualquier chat de IA (Claude, ChatGPT...) y practica. El tutor responde siempre en inglés, nunca en español, y no te suelta hasta repasar todo el tema."
      />

      {/* Hablar es lo único de Practicar que ocurre FUERA de la app, así que no hay forma de
          detectar que lo hizo: lo marca él, como las palabras. Sin esto el módulo se quedaría
          siempre en 0 y la barra del tema nunca llegaría al 100%. */}
      <button
        onClick={() => marcarHecho(tema, claveHablar(1))}
        disabled={hecho}
        className={`btn ${
          hecho
            ? 'bg-emerald-500 text-white'
            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
        }`}
      >
        {hecho ? 'Conversación hecha ✓' : 'Ya conversé con la IA'}
      </button>

      {pack && <p className="text-center text-xs text-slate-400">Vocabulario disponible: temas 1 a {tema}</p>}
    </div>
  )
}

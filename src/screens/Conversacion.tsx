import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { temaEnCurso } from '../lib/progreso'
import { escenarioDe } from '../data/escenarios'
import { getVocabPack } from '../data/packs'
import { construirPromptCopiable, vocabularioDesbloqueado } from '../lib/speaking'
import CopiarPrompt from '../components/CopiarPrompt'
import SelectorDia from '../components/SelectorDia'

// Práctica libre de speaking: SOLO conversación/roleplay del tema. Hubo un selector para elegir
// también una tarea tipo CELPIP y el usuario lo quitó — las tareas de examen siguen vivas en
// data/tareasSpeaking.ts porque las usan ExamenBloque y ExamenFinal, ahí sí tienen sentido.
export default function Conversacion() {
  const temaActual = useLiveQuery(() => temaEnCurso(), [], 1) ?? 1
  const [tema, setTema] = useState<number | null>(null)
  // Un tema son dos días de estudio y cada uno lleva su propio escenario.
  const [dia, setDia] = useState<1 | 2>(1)

  const temaSel = tema ?? temaActual
  const temasDisponibles = Array.from({ length: temaActual }, (_, i) => i + 1)
  const pack = getVocabPack(temaSel)
  const vocab = vocabularioDesbloqueado(temaSel)

  const prompt = construirPromptCopiable(escenarioDe(temaSel, dia), vocab)

  return (
    <div className="flex flex-col gap-4">
      {/* SIN SELECTOR DE TEMA (2026-08-30): Practicar es siempre el tema EN CURSO. El selector
          dejaba elegir temas pasados y era ruido: al aprobar el examen aparece el siguiente y
          ya está. Para repasar lo anterior están Aprender → Aprendido y Exámenes → POR TEMA. */}
      <p className="text-sm font-semibold">{`Tema ${temaSel} — ${getVocabPack(temaSel)?.titulo ?? ''}`}</p>

      <CopiarPrompt
        prompt={prompt}
        descripcion="Conversación libre. Pega esto en cualquier chat de IA (Claude, ChatGPT...) y practica. El tutor responde siempre en inglés, nunca en español."
      />

      {pack && <p className="text-center text-xs text-slate-400">Vocabulario disponible: temas 1 a {temaSel}</p>}
    </div>
  )
}

import type { TareaSpeaking } from '../data/tareasSpeaking'
import { IDIOMAS_ACTIVOS, nombreIdioma } from '../config'
import { construirPromptTarea, vocabularioDesbloqueado } from '../lib/speaking'
import CopiarPrompt from './CopiarPrompt'
import Autoevaluacion from './Autoevaluacion'

// Speaking de examen SIN API key: en vez de una lista genérica, plantea una tarea real estilo
// CELPIP con su prompt listo para pegar en una IA con voz; luego el estudiante se autocalifica
// con un checklist específico de esa tarea. (Con API key, ExamenBloque/Final usan ChatSpeaking.)
export default function PasoSpeakingExamen({
  tarea,
  tema,
  meta,
  onDone
}: {
  tarea: TareaSpeaking
  tema: number
  /** Qué se decide con esta prueba; la IA cierra diciendo LISTO ✅ o AÚN NO ⏳. */
  meta: string
  onDone: (nota: number) => void
}) {
  const idioma = IDIOMAS_ACTIVOS[0]
  const prompt = construirPromptTarea(idioma, tarea, vocabularioDesbloqueado(tema, idioma), meta)

  const checklist = [
    'Respondí a lo que pedía la tarea, sin irme por las ramas',
    'Hablé en frases completas, no en palabras sueltas',
    'Di al menos 3 datos o detalles',
    `Hablé todo el rato en ${nombreIdioma(idioma)}, sin cambiar al español`,
    'Se me entendió sin tener que repetir'
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="tarjeta flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{tarea.tipoCELPIP}</span>
        <p className="font-semibold">{tarea.nombre}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tarea: {tarea.instruccion.charAt(0).toUpperCase() + tarea.instruccion.slice(1)}
        </p>
      </div>

      <CopiarPrompt
        prompt={prompt}
        descripcion="Pega esto en una IA con voz (ChatGPT voz, Gemini Live...) para hacer la tarea hablando. Al final te dirá en español si estás LISTO ✅ o si AÚN NO ⏳, y qué te falta. Si prefieres, hazla en voz alta por tu cuenta y autocalifícate abajo."
      />

      <Autoevaluacion textoIntro="Cuando termines, autocalifícate:" checklist={checklist} onDone={onDone} />
    </div>
  )
}

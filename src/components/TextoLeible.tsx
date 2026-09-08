import type { TextoReading } from '../types'

// CÓMO SE PINTA UN TEXTO DE LECTURA (2026-09-08, él: "si es una conversación que sea en
// párrafos, no seguido, que confunde... no porque sea inglés sino en general, ya que no sabes
// quién está hablando").
//
// Las lecturas de saludos y presentaciones SON diálogos, pero estaban escritas como un solo
// párrafo corrido: "Good morning! My name is Ana. Nice to meet you. Hi, Ana! My name is Paul."
// Leído así hay que adivinar dónde termina un turno y empieza el otro, y varias preguntas
// ("¿quién no entiende el nombre?") no se pueden responder sin adivinarlo. Los textos que son
// conversación traen ahora `lineas` y se pintan un turno por renglón, con el nombre delante y
// una franja de color por personaje. Los que son narración siguen igual: un párrafo.
const COLORES = [
  'border-emerald-400 text-emerald-700 dark:text-emerald-300',
  'border-sky-400 text-sky-700 dark:text-sky-300',
  'border-amber-400 text-amber-700 dark:text-amber-300',
  'border-violet-400 text-violet-700 dark:text-violet-300'
]

export default function TextoLeible({ texto }: { texto: TextoReading }) {
  if (!texto.lineas?.length) return <p className="text-sm leading-relaxed">{texto.texto}</p>

  const hablantes = [...new Set(texto.lineas.map((l) => l.hablante))]
  return (
    <div className="flex flex-col gap-1.5">
      {texto.lineas.map((l, i) => {
        const color = COLORES[hablantes.indexOf(l.hablante) % COLORES.length]
        return (
          <p key={i} className={`border-l-[3px] pl-2.5 text-sm leading-relaxed ${color}`}>
            <span className="font-bold">{l.hablante}:</span>{' '}
            <span className="text-slate-800 dark:text-slate-100 print:text-slate-900">{l.texto}</span>
          </p>
        )
      })}
    </div>
  )
}

import { useState } from 'react'

export default function Autoevaluacion({
  checklist,
  textoIntro,
  onDone
}: {
  checklist: string[]
  textoIntro?: string
  onDone: (nota: number) => void
}) {
  const [marcados, setMarcados] = useState<boolean[]>(() => checklist.map(() => false))
  const nota = Math.round((marcados.filter(Boolean).length / checklist.length) * 100)

  return (
    <div className="tarjeta flex flex-col gap-3">
      {textoIntro && <p className="text-sm text-slate-500 dark:text-slate-400">{textoIntro}</p>}
      {checklist.map((item, i) => (
        <label key={i} className="flex min-h-[44px] items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={marcados[i]}
            onChange={(e) => setMarcados((m) => m.map((v, j) => (j === i ? e.target.checked : v)))}
            className="h-5 w-5"
          />
          {item}
        </label>
      ))}
      <button onClick={() => onDone(nota)} className="btn-primary">
        Autocalificar y continuar ({nota}%)
      </button>
    </div>
  )
}

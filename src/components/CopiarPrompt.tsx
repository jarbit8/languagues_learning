import { useState } from 'react'

export default function CopiarPrompt({ prompt, descripcion }: { prompt: string; descripcion: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="tarjeta flex flex-col gap-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">{descripcion}</p>
      <textarea
        readOnly
        value={prompt}
        rows={9}
        onFocus={(e) => e.target.select()}
        className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
      />
      <button onClick={copiar} className="btn-primary">
        {copiado ? '¡Copiado! ✓' : 'Copiar prompt 📋'}
      </button>
    </div>
  )
}

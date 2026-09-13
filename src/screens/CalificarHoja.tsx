import { useEffect, useState } from 'react'
import type { HojaVocab } from '../types'
import { conceptoPorId } from '../data/packs'
import { calificarHoja, descartarHoja, filasParaCalificar, nombreDeHoja } from '../lib/hojaVocab'

// Se marca lo FALLADO y no lo acertado: en una hoja buena casi todo está bien, y así son
// tres toques en vez de quince.
export default function CalificarHoja({
  hoja,
  onSalir,
  onFin
}: {
  hoja: HojaVocab
  onSalir: () => void
  onFin: (aciertos: number, total: number) => void
}) {
  const [filas, setFilas] = useState<{ id: string; yaRespondida: boolean }[] | null>(null)
  const [falladas, setFalladas] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)
  const [descartando, setDescartando] = useState(false)

  useEffect(() => {
    void filasParaCalificar(hoja).then(setFilas)
  }, [hoja])

  if (!filas) return <p className="tarjeta">Cargando…</p>

  const activas = filas.filter((f) => !f.yaRespondida)
  const mal = activas.filter((f) => falladas.has(f.id)).length

  function alternar(id: string) {
    setFalladas((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function guardar() {
    setGuardando(true)
    const r = await calificarHoja(hoja, falladas)
    onFin(r.aciertos, r.total)
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onSalir} className="self-start text-sm text-slate-500 underline dark:text-slate-400">
        ← Volver a exámenes
      </button>
      <header>
        <p className="text-sm text-slate-500 dark:text-slate-400">Examen diario en papel</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Calificar la hoja del {nombreDeHoja(hoja.fecha)}</h1>
      </header>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Toca las que fallaste; las demás cuentan como acertadas. Si lo tuyo significa lo mismo con otras palabras, vale.
      </p>

      <div className="flex flex-col gap-2">
        {filas.map((f, i) => {
          const c = conceptoPorId(f.id)?.concepto
          const fallo = falladas.has(f.id)
          return (
            <button
              key={f.id}
              disabled={f.yaRespondida}
              onClick={() => alternar(f.id)}
              className={`tarjeta flex items-center gap-3 text-left transition active:scale-[0.99] ${
                f.yaRespondida ? 'opacity-50' : fallo ? 'ring-2 ring-rose-400/70 dark:ring-rose-400/60' : ''
              }`}
            >
              <span className="w-6 shrink-0 text-right text-sm font-bold tabular-nums text-slate-400">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{c?.texto ?? f.id}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {f.yaRespondida ? 'Ya la respondiste en la app' : c?.es}
                </p>
              </div>
              {!f.yaRespondida && (
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-lg font-black ${
                    fallo
                      ? 'bg-rose-500 text-white'
                      : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'
                  }`}
                >
                  {fallo ? '✗' : '✓'}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-center text-sm font-semibold">
        <span className="text-emerald-600 dark:text-emerald-400">{activas.length - mal} bien</span>
        {' · '}
        <span className="text-rose-600 dark:text-rose-400">{mal} mal</span>
      </p>
      <button onClick={() => void guardar()} disabled={guardando} className="btn-primary disabled:opacity-40">
        {activas.length ? 'Guardar resultados' : 'Cerrar la hoja'}
      </button>

      {descartando ? (
        <div className="tarjeta flex flex-col gap-2 text-sm">
          <p>¿Descartar la hoja sin calificar? Sus palabras siguen en el examen diario.</p>
          <div className="flex gap-2">
            <button
              onClick={() => void descartarHoja(hoja).then(onSalir)}
              className="btn-primary flex-1 !bg-rose-600 !bg-none !shadow-rose-500/25"
            >
              Sí, descartar
            </button>
            <button onClick={() => setDescartando(false)} className="flex-1 underline">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setDescartando(true)} className="self-center text-sm text-slate-400 underline">
          Descartar esta hoja
        </button>
      )}
    </div>
  )
}

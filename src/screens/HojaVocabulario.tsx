import { useEffect, useState } from 'react'
import type { Concepto, HojaVocab } from '../types'
import { conceptoPorId } from '../data/packs'
import { inicioDeHoy } from '../lib/fechas'
import { contextoSiRepetido } from '../lib/preguntas'
import { guardarHoja, hojaPendiente, nombreDeHoja, palabrasDeHojaDeHoy } from '../lib/hojaVocab'

// Hoja para imprimir del examen diario. La hoja se guarda al pulsar Imprimir, no al abrir la
// pantalla: lo que cuenta es lo que salió en el papel.
export default function HojaVocabulario({
  onSalir,
  onCalificar
}: {
  onSalir: () => void
  onCalificar: (hoja: HojaVocab) => void
}) {
  const [palabras, setPalabras] = useState<Concepto[] | null>(null)
  const [bloqueo, setBloqueo] = useState<HojaVocab | null>(null)

  useEffect(() => {
    void (async () => {
      const pendiente = await hojaPendiente()
      if (pendiente && pendiente.fecha < inicioDeHoy()) {
        setBloqueo(pendiente)
        return
      }
      const ids = await palabrasDeHojaDeHoy()
      setPalabras(ids.map((id) => conceptoPorId(id)?.concepto).filter((c): c is Concepto => !!c))
    })()
  }, [])

  const volver = (
    <button onClick={onSalir} className="self-start text-sm text-slate-500 underline dark:text-slate-400 print:hidden">
      ← Volver a exámenes
    </button>
  )

  if (bloqueo) {
    return (
      <div className="flex flex-col gap-4">
        {volver}
        <h1 className="text-2xl font-extrabold tracking-tight">Examen diario en papel</h1>
        <div className="tarjeta flex flex-col gap-3">
          <p className="font-semibold">Primero califica la hoja del {nombreDeHoja(bloqueo.fecha)}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sus palabras siguen pendientes, así que saldrían repetidas en la hoja de hoy.
          </p>
          <button onClick={() => onCalificar(bloqueo)} className="btn-primary">
            Calificar esa hoja
          </button>
        </div>
      </div>
    )
  }

  if (!palabras) return <p className="tarjeta">Cargando…</p>

  const hoy = nombreDeHoja(inicioDeHoy())

  async function imprimir() {
    await guardarHoja(palabras!.map((c) => c.id))
    window.print()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 print:hidden">
        {volver}
        <h1 className="text-2xl font-extrabold tracking-tight">Examen diario en papel</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Escribe a mano qué significa cada palabra. Mañana entras a Examen → Calificar la hoja y tocas las que
          fallaste: las acertadas suben de estrella y las falladas vuelven a salir esa misma noche.
        </p>
        {palabras.length === 0 ? (
          <p className="tarjeta text-sm text-slate-500 dark:text-slate-400">
            Hoy no hay palabras. Marca palabras nuevas o espera a que venzan tus repasos.
          </p>
        ) : (
          <button onClick={() => void imprimir()} className="btn-primary">
            🖨️ Imprimir · {palabras.length} {palabras.length === 1 ? 'palabra' : 'palabras'}
          </button>
        )}
      </div>

      {palabras.length > 0 && (
        <div className="hoja bg-white p-6 text-slate-900 print:p-0">
          <div className="border-b-2 border-slate-900 pb-2">
            <h2 className="text-lg font-black">Examen diario · Vocabulario · {hoy}</h2>
            <p className="text-xs text-slate-500">Name: ________________________ Date: ____ / ____ / ______</p>
          </div>
          <p className="mt-2 text-xs italic text-slate-500">Escribe en español qué significa cada palabra.</p>

          <ol className="mt-4 grid grid-cols-2 gap-x-8 gap-y-5">
            {palabras.map((c, i) => {
              const contexto = contextoSiRepetido(c)
              return (
                <li key={c.id} className="break-inside-avoid text-sm">
                  <p>
                    <span className="font-semibold">{i + 1}.</span> <b>{c.texto}</b>
                    {contexto && <span className="text-xs text-slate-500"> ({contexto})</span>}
                  </p>
                  <div className="mt-5 border-b border-slate-300" />
                </li>
              )
            })}
          </ol>

          {/* SOLUCIONES, en su propia página para poder no imprimirla */}
          <section className="mt-8 break-before-page">
            <h3 className="text-sm font-black uppercase tracking-wide">Soluciones · {hoy}</h3>
            <p className="text-xs italic text-slate-500">Corrige solo cuando hayas terminado.</p>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {palabras.map((c, i) => (
                <p key={c.id}>
                  {i + 1}. {c.texto} — {c.es}
                </p>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import type { ConsignaWriting } from '../types'
import { getWriting } from '../data/packs'
import Autoevaluacion from './Autoevaluacion'

function contarPalabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length
}

// Escribir UNA consigna: textarea + contador + corrección contra la respuesta modelo.
// Reutilizado por el examen (PasoWriting) y por la pantalla de práctica libre (Escribir).
export function EscribirConsigna({
  pack,
  onDone
}: {
  pack: ConsignaWriting
  onDone: (nota: number) => void
}) {
  const [texto, setTexto] = useState('')
  const [enviado, setEnviado] = useState(false)

  const palabras = contarPalabras(texto)

  if (enviado) {
    return (
      <div className="flex flex-col gap-3">
        <div className="tarjeta flex flex-col gap-2 text-sm">
          <p className="font-semibold">Respuesta modelo</p>
          <p className="italic text-slate-600 dark:text-slate-300">{pack.respuestaModelo}</p>
        </div>
        <Autoevaluacion
          textoIntro="Compara tu texto con el modelo y autocalifícate."
          checklist={pack.checklist}
          onDone={onDone}
        />
      </div>
    )
  }

  return (
    <div className="tarjeta flex flex-col gap-3">
      <p className="font-semibold">{pack.consigna}</p>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={6}
        placeholder="Write here…"
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-600 dark:bg-slate-900"
      />
      <p
        className={`text-sm ${
          palabras >= pack.minPalabras && palabras <= pack.maxPalabras
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        {palabras} palabras (objetivo: {pack.minPalabras}-{pack.maxPalabras})
      </p>
      <button onClick={() => setEnviado(true)} disabled={palabras === 0} className="btn-primary disabled:opacity-40">
        Enviar
      </button>
    </div>
  )
}

export default function PasoWriting({ bloque, onDone }: { bloque: number; onDone: (nota: number) => void }) {
  // El examen siempre usa la primera consigna del bloque; las demás son para práctica libre.
  const consigna = getWriting(bloque)?.consignas[0]
  if (!consigna) return null

  return <EscribirConsigna pack={consigna} onDone={onDone} />
}

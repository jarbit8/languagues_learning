import { useState } from 'react'
import type { ConsignaWriting } from '../types'
import { getWriting } from '../data/packs'
import { construirPromptCorreccion } from '../lib/escritura'
import CopiarPrompt from './CopiarPrompt'

function contarPalabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length
}

// Escribir UNA consigna: textarea + contador + CORRECCIÓN POR IA con veredicto.
// Reutilizado por el examen (PasoWriting) y por la pantalla de práctica libre (Escribir).
//
// El 2026-09-08 se cambió el cierre: antes salía la respuesta modelo y un checklist que marcaba
// él (se autocalificaba), y ahora su propio texto va dentro de un prompt copiable y quien decide
// es la IA, con el mismo LISTO/AÚN NO de hablar. `onDone` recibe además si lo aprobó: la nota es
// para los exámenes y el aprobado es lo que marca el módulo como hecho en la práctica libre.
//
// LISTO = 100 y AÚN NO = 50 a propósito, sin escalas intermedias: pedirle que transcriba un
// número que le dio la IA es un dato más que puede copiar mal, y él ya dejó claro con el examen
// de vocabulario que prefiere lo simple y predecible sobre lo fino.
export function EscribirConsigna({
  pack,
  tema,
  dia = 1,
  meta,
  onDone
}: {
  pack: ConsignaWriting
  /** Tema del que se saca el vocabulario y la gramática con la que la IA corrige. */
  tema: number
  dia?: 1 | 2
  /** Qué se decide con esto; va dentro del prompt para que la IA sepa qué está firmando. */
  meta: string
  onDone: (nota: number, aprobado: boolean) => void
}) {
  const [texto, setTexto] = useState('')
  const [enviado, setEnviado] = useState(false)

  const palabras = contarPalabras(texto)

  if (enviado) {
    return (
      <div className="flex flex-col gap-3">
        <CopiarPrompt
          prompt={construirPromptCorreccion(pack, tema, dia, texto, meta)}
          descripcion="Tu texto ya va dentro. Pega esto en cualquier chat de IA (Claude, ChatGPT...): te corrige error por error, te lo reescribe bien y cierra diciendo si estás LISTO ✅ o AÚN NO ⏳."
        />

        <div className="tarjeta flex flex-col gap-2 text-sm">
          <p className="font-semibold">Respuesta modelo</p>
          <p className="italic text-slate-600 dark:text-slate-300">{pack.respuestaModelo}</p>
          <p className="text-xs text-slate-400">
            Míralo después de la corrección, no antes: es una forma de decirlo, no la única.
          </p>
        </div>

        <div className="tarjeta flex flex-col gap-2">
          <p className="text-sm font-semibold">¿Qué veredicto te dio la IA?</p>
          <button onClick={() => onDone(100, true)} className="btn bg-emerald-500 text-white">
            LISTO ✅ · me aprobó
          </button>
          <button
            onClick={() => onDone(50, false)}
            className="btn bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
          >
            AÚN NO ⏳ · lo vuelvo a escribir
          </button>
          <button
            onClick={() => setEnviado(false)}
            className="self-center text-sm text-slate-500 underline dark:text-slate-400"
          >
            ← Corregir mi texto y volver a mandarlo
          </button>
        </div>
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
        Enviar a corregir
      </button>
    </div>
  )
}

export default function PasoWriting({
  bloque,
  tema,
  meta,
  onDone
}: {
  bloque: number
  tema: number
  meta: string
  onDone: (nota: number, aprobado: boolean) => void
}) {
  // El examen siempre usa la primera consigna del bloque; las demás son para práctica libre.
  const consigna = getWriting(bloque)?.consignas[0]
  if (!consigna) return null

  return <EscribirConsigna pack={consigna} tema={tema} dia={2} meta={meta} onDone={onDone} />
}

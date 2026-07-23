import { useState } from 'react'
import type { Idioma, ConsignaWriting } from '../types'
import { getWriting } from '../data/packs'
import { corregirWriting } from '../lib/writing'
import { hayApiKey } from '../lib/apiKey'
import Autoevaluacion from './Autoevaluacion'

function contarPalabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length
}

// Escribir UNA consigna: textarea + contador + corrección (IA si hay key, si no autoevaluación con modelo).
// Reutilizado por el examen (PasoWriting) y por la pantalla de práctica libre (Escribir).
export function EscribirConsigna({
  pack,
  idioma,
  onDone
}: {
  pack: ConsignaWriting
  idioma: Idioma
  onDone: (nota: number) => void
}) {
  const [texto, setTexto] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [corrigiendo, setCorrigiendo] = useState(false)
  const [feedback, setFeedback] = useState<Awaited<ReturnType<typeof corregirWriting>> | null>(null)

  const palabras = contarPalabras(texto)

  async function enviar() {
    setEnviado(true)
    if (hayApiKey()) {
      setCorrigiendo(true)
      const res = await corregirWriting(idioma, pack.consigna, texto)
      setCorrigiendo(false)
      setFeedback(res)
    }
  }

  if (enviado && hayApiKey() && !corrigiendo && feedback?.ok) {
    return (
      <div className="tarjeta flex flex-col gap-3">
        <h3 className="font-bold">Corrección {idioma === 'en' ? 'inglés' : 'francés'}</h3>
        {typeof feedback.feedback.nota === 'number' && (
          <p className="text-4xl font-black">{feedback.feedback.nota}%</p>
        )}
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
          ✅ {feedback.feedback.bien}
        </p>
        {feedback.feedback.errores.map((e, i) => (
          <div key={i} className="rounded-lg bg-amber-50 px-3 py-2 text-sm dark:bg-amber-900/30">
            <p>
              Dijiste: <span className="line-through">{e.dijo}</span>
            </p>
            <p>
              Mejor: <b>{e.correcto}</b>
            </p>
            <p className="text-slate-500 dark:text-slate-400">{e.porque}</p>
          </div>
        ))}
        <button onClick={() => onDone(feedback.feedback.nota ?? 75)} className="btn-primary">
          Continuar
        </button>
      </div>
    )
  }

  if (enviado && (corrigiendo || (hayApiKey() && !feedback?.ok))) {
    if (corrigiendo) return <p className="tarjeta">Corrigiendo…</p>
    // sin key o sin red: fallback offline, nunca bloquear el examen
    return (
      <div className="flex flex-col gap-3">
        <div className="tarjeta flex flex-col gap-2 text-sm">
          <p className="font-semibold">Respuesta modelo</p>
          <p className="italic text-slate-600 dark:text-slate-300">{pack.respuestaModelo}</p>
        </div>
        <Autoevaluacion
          textoIntro="Sin conexión o sin API key: compara tu texto con el modelo y autocalifícate."
          checklist={pack.checklist}
          onDone={onDone}
        />
      </div>
    )
  }

  if (enviado && !hayApiKey()) {
    return (
      <div className="flex flex-col gap-3">
        <div className="tarjeta flex flex-col gap-2 text-sm">
          <p className="font-semibold">Respuesta modelo</p>
          <p className="italic text-slate-600 dark:text-slate-300">{pack.respuestaModelo}</p>
        </div>
        <Autoevaluacion
          textoIntro="Sin API key configurada: compara tu texto con el modelo y autocalifícate."
          checklist={pack.checklist}
          onDone={onDone}
        />
      </div>
    )
  }

  return (
    <div className="tarjeta flex flex-col gap-3">
      <span className={idioma === 'en' ? 'chip-en self-start' : 'chip-fr self-start'}>
        {idioma === 'en' ? 'EN' : 'FR'}
      </span>
      <p className="font-semibold">{pack.consigna}</p>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={6}
        placeholder={idioma === 'en' ? 'Write here…' : 'Écris ici…'}
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
      <button onClick={enviar} disabled={palabras === 0} className="btn-primary disabled:opacity-40">
        Enviar
      </button>
    </div>
  )
}

export default function PasoWriting({ bloque, onDone }: { bloque: number; onDone: (promedio: number) => void }) {
  const [idx, setIdx] = useState(0)
  const [notas, setNotas] = useState<number[]>([])
  const idiomas: Idioma[] = ['en', 'fr']

  function siguiente(nota: number) {
    const nuevas = [...notas, nota]
    if (idx + 1 >= idiomas.length) {
      const promedio = Math.round(nuevas.reduce((a, b) => a + b, 0) / nuevas.length)
      onDone(promedio)
    } else {
      setNotas(nuevas)
      setIdx((i) => i + 1)
    }
  }

  // El examen siempre usa la primera consigna del bloque; las demás son para práctica libre.
  const consigna = getWriting(bloque, idiomas[idx])?.consignas[0]
  if (!consigna) return null

  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Writing {idx + 1}/{idiomas.length}
      </p>
      <EscribirConsigna key={idiomas[idx]} pack={consigna} idioma={idiomas[idx]} onDone={siguiente} />
    </div>
  )
}

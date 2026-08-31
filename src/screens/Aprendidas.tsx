import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { vocabPacks, getVocabPack } from '../data/packs'
import { hablar } from '../lib/audio'
import type { EstadoPalabra } from '../types'

// VOCABULARIO APRENDIDO (2026-08-30, pedido del usuario): la pantalla Vocabulario solo enseña
// el tema EN CURSO, así que al pasar al tema 2 las palabras del 1 desaparecían de la vista
// aunque siguieran guardadas. Aquí quedan todas las que ha marcado, agrupadas por tema, para
// repasarlas por su cuenta cuando quiera. No toca el SRS ni los exámenes: es solo una vista.

const ETIQUETA: Record<EstadoPalabra, { texto: string; clase: string }> = {
  nueva: { texto: 'nueva', clase: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300' },
  aprendida: { texto: 'aprendida', clase: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200' },
  en_repaso: { texto: 'en repaso', clase: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200' },
  dominada: { texto: 'dominada', clase: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200' }
}

export default function Aprendidas() {
  const palabras = useLiveQuery(() => db.palabras.toArray(), [], [])
  const [abierto, setAbierto] = useState<number | null>(null)

  const porId = new Map(palabras.map((p) => [p.id, p]))
  // Solo los temas donde ya marcó algo; el resto no pinta nada y sería ruido.
  const temas = vocabPacks
    .map((pack) => ({
      tema: pack.tema,
      titulo: pack.titulo,
      conceptos: pack.conceptos.filter((c) => porId.has(c.id))
    }))
    .filter((t) => t.conceptos.length > 0)

  const total = temas.reduce((n, t) => n + t.conceptos.length, 0)
  const dominadas = palabras.filter((p) => p.estado === 'dominada').length

  if (total === 0) {
    return (
      <p className="tarjeta text-sm text-slate-500 dark:text-slate-400">
        Todavía no has marcado ninguna palabra. Cuando marques una como “Aprendida ✓” en Vocabulario, aparecerá aquí y
        se quedará, aunque pases al tema siguiente.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="tarjeta grid grid-cols-3 text-center">
        <div>
          <p className="text-xl font-black">{total}</p>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">marcadas</p>
        </div>
        <div>
          <p className="text-xl font-black">{dominadas}</p>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">dominadas</p>
        </div>
        <div>
          <p className="text-xl font-black">{temas.length}</p>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">temas</p>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Aquí se quedan todas las palabras que has marcado, tema por tema. El examen diario y el de tema las siguen
        usando igual; esto es solo para que puedas repasarlas cuando quieras.
      </p>

      {temas.map((t) => (
        <div key={t.tema} className="tarjeta">
          <button
            onClick={() => setAbierto(abierto === t.tema ? null : t.tema)}
            className="flex w-full items-center gap-2 text-left"
          >
            <span className="text-sm font-bold">
              Tema {t.tema} — {t.titulo}
            </span>
            <span className="ml-auto text-xs text-slate-400">
              {t.conceptos.length}/{getVocabPack(t.tema)?.conceptos.length}
            </span>
            <span className="text-slate-400">{abierto === t.tema ? '▲' : '▼'}</span>
          </button>

          {abierto === t.tema && (
            <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
              {t.conceptos.map((c) => {
                const est = porId.get(c.id)!
                const badge = ETIQUETA[est.estado]
                return (
                  <div key={c.id} className="flex flex-col gap-0.5 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2">
                      <button onClick={() => hablar(c.texto)} aria-label={`Escuchar ${c.texto}`} className="leading-none">
                        🔊
                      </button>
                      <span className="font-semibold">{c.texto}</span>
                      {c.pron && <span className="text-xs tracking-wide text-slate-400">/ {c.pron} /</span>}
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.clase}`}>
                        {badge.texto}
                      </span>
                    </div>
                    <p className="pl-6 text-sm text-slate-500 dark:text-slate-400">{c.es}</p>
                    <button
                      onClick={() => hablar(c.ejemplo)}
                      className="pl-6 text-left text-xs italic text-slate-500 dark:text-slate-400"
                    >
                      {c.ejemplo} <span className="not-italic">🔊</span>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

import { useState } from 'react'
import type { Concepto, PalabraEstado } from '../types'
import { hablar } from '../lib/audio'
import { consejoDePalabra } from '../lib/pronunciacion'

export default function VocabCard({
  concepto,
  estado,
  onToggle
}: {
  concepto: Concepto
  estado?: PalabraEstado
  onToggle: (id: string) => void
}) {
  const [abierta, setAbierta] = useState(false)
  const aprendida = !!estado && estado.estado !== 'nueva'

  return (
    <div className={`tarjeta ${aprendida ? 'ring-2 ring-emerald-400' : ''}`}>
      <button onClick={() => setAbierta((v) => !v)} className="flex w-full items-center gap-2 text-left">
        <span className="text-lg font-bold">{concepto.es}</span>
        {aprendida && <span className="text-emerald-500">✓</span>}
        <span className="ml-auto text-slate-400">{abierta ? '▲' : '▼'}</span>
      </button>

      {abierta && (
        <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-slate-700">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{concepto.texto}</span>
              <button
                onClick={() => hablar(concepto.texto)}
                aria-label={`Escuchar ${concepto.texto}`}
                className="ml-auto text-xl"
              >
                🔊
              </button>
            </div>
            {concepto.pron && (
              <span className="text-xs tracking-wide text-slate-400 dark:text-slate-500">
                / {concepto.pron} /
              </span>
            )}
            {/* Si la palabra lleva un sonido que al hispanohablante se le atraganta, el
                consejo del módulo de pronunciación se enseña AQUÍ, junto a la palabra:
                antes solo existía en una pantalla aparte y había que ir a buscarlo. */}
            {(() => {
              const g = consejoDePalabra(concepto.texto)
              if (!g) return null
              return (
                <div className="mt-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 dark:bg-indigo-950/40">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
                    🗣️ {g.titulo}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-indigo-900 dark:text-indigo-100">{g.truco}</p>
                </div>
              )
            })()}
            <button
              onClick={() => hablar(concepto.ejemplo)}
              className="text-left text-sm italic text-slate-500 dark:text-slate-400"
            >
              {concepto.ejemplo} <span className="not-italic">🔊</span>
            </button>
          </div>
          {concepto.nota && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              💡 {concepto.nota}
            </p>
          )}
          <button
            onClick={() => onToggle(concepto.id)}
            className={`btn ${
              aprendida
                ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                : 'btn-primary'
            }`}
          >
            {aprendida ? 'Quitar de aprendidas' : 'Aprendida ✓'}
          </button>
        </div>
      )}
    </div>
  )
}

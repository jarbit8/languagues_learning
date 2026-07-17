import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { mapaTemas } from '../lib/progreso'
import { temasDeBloque } from '../lib/curriculum'
import { getVocabPack } from '../data/packs'
import { funcionDe, nombresBloque } from '../data/funciones'

const ESTADO_BADGE: Record<string, string> = {
  aprobado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  en_curso: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
  bloqueado: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
}

const ESTADO_TEXTO: Record<string, string> = {
  aprobado: 'Aprobado ✓',
  en_curso: 'En curso',
  bloqueado: 'Bloqueado 🔒'
}

export default function Temario() {
  const [abierto, setAbierto] = useState<number | null>(1)
  const mapa = useLiveQuery(() => mapaTemas(), [])

  const estadoDe = (tema: number) => mapa?.find((t) => t.tema === tema)?.estado ?? 'bloqueado'

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        24 temas · 4 bloques · el orden desbloquea en secuencia, pero puedes ver el plan completo.
      </p>
      {[1, 2, 3, 4].map((bloque) => (
        <div key={bloque} className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
            Bloque {bloque} — {nombresBloque[bloque]}
          </h2>
          {temasDeBloque(bloque).map((tema) => {
            const pack = getVocabPack(tema)
            const estado = estadoDe(tema)
            const expandido = abierto === tema
            return (
              <div key={tema} className="tarjeta flex flex-col gap-2">
                <button
                  onClick={() => setAbierto(expandido ? null : tema)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold dark:bg-slate-800">
                    {tema}
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold">{pack?.titulo ?? `Tema ${tema}`}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[estado]}`}>
                    {ESTADO_TEXTO[estado]}
                  </span>
                  <span className="text-slate-400">{expandido ? '▲' : '▼'}</span>
                </button>
                {expandido && (
                  <div className="flex flex-col gap-1 border-t border-slate-100 pt-2 text-sm dark:border-slate-700">
                    <p>
                      <span className="text-slate-400">Aprendes a:</span> {funcionDe(tema)}
                    </p>
                    <p className="text-slate-400">{pack?.conceptos.length ?? 30} palabras · gramática EN + FR · listening</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

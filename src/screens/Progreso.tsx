import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { mapaTemas, resumenPalabrasGlobal, obtenerHistorial, calcularRacha } from '../lib/progreso'
import { bloqueDeTema } from '../lib/curriculum'
import { getVocabPack } from '../data/packs'
import Ajustes from './Ajustes'
import Temario from './Temario'

const COLOR_ESTADO: Record<string, string> = {
  aprobado: 'bg-emerald-500 text-white',
  en_curso: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
  bloqueado: 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
}

function etiquetaHistorial(tipo: string, ref: number | string): string {
  if (tipo === 'tema') return `Examen de tema ${ref}`
  if (tipo === 'bloque') return `Examen de bloque ${ref}`
  if (tipo === 'final') return 'Examen final A1'
  return `Examen ${ref}`
}

export default function Progreso() {
  const [sub, setSub] = useState<'progreso' | 'temario' | 'ajustes'>('progreso')

  const data = useLiveQuery(async () => {
    const [mapa, palabras, historial, racha] = await Promise.all([
      mapaTemas(),
      resumenPalabrasGlobal(),
      obtenerHistorial(),
      calcularRacha()
    ])
    return { mapa, palabras, historial: historial.slice(0, 10), racha }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Progreso</h1>

      <div className="flex rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
        {(['progreso', 'temario', 'ajustes'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              sub === s ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'
            }`}
          >
            {s === 'progreso' ? 'Progreso' : s === 'temario' ? 'Temario' : 'Ajustes'}
          </button>
        ))}
      </div>

      {sub === 'ajustes' ? (
        <Ajustes />
      ) : sub === 'temario' ? (
        <Temario />
      ) : !data ? (
        <p className="tarjeta">Cargando…</p>
      ) : (
        <>
          <div className="tarjeta flex items-center justify-between">
            <div>
              <p className="font-semibold">Racha</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {data.racha > 0 ? `${data.racha} día${data.racha === 1 ? '' : 's'} seguidos` : 'Empieza hoy'}
              </p>
            </div>
            <span className="text-3xl">{data.racha > 0 ? '🔥' : '🌱'}</span>
          </div>

          <div className="tarjeta grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-black text-emerald-500">{data.palabras.dominadas}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Dominadas</p>
            </div>
            <div>
              <p className="text-2xl font-black text-amber-500">{data.palabras.enRepaso}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">En repaso</p>
            </div>
            <div>
              <p className="text-2xl font-black text-rose-500">{data.palabras.debiles}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Débiles</p>
            </div>
          </div>

          <div className="tarjeta flex flex-col gap-3">
            <p className="font-semibold">Mapa de temas</p>
            {[1, 2, 3, 4].map((bloque) => (
              <div key={bloque} className="flex flex-col gap-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">Bloque {bloque}</p>
                <div className="flex gap-1.5">
                  {data.mapa
                    .filter((t) => bloqueDeTema(t.tema) === bloque)
                    .map((t) => (
                      <div
                        key={t.tema}
                        title={getVocabPack(t.tema)?.titulo}
                        className={`flex h-9 flex-1 items-center justify-center rounded-lg text-xs font-bold ${COLOR_ESTADO[t.estado]}`}
                      >
                        {t.tema}
                      </div>
                    ))}
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-emerald-500" /> Aprobado
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-slate-900 dark:bg-white" /> En curso
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" /> Bloqueado
              </span>
            </div>
          </div>

          <div className="tarjeta flex flex-col gap-2">
            <p className="font-semibold">Historial de exámenes</p>
            {data.historial.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Aún no has rendido ningún examen.</p>
            ) : (
              data.historial.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-sm">
                  <span>{etiquetaHistorial(h.tipo, h.ref)}</span>
                  <span className={h.aprobado ? 'font-bold text-emerald-500' : 'text-slate-500 dark:text-slate-400'}>
                    {h.nota}%
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

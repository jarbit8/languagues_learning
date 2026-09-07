import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { abreviacionesPack } from '../data/packs'
import { hablar } from '../lib/audio'
import type { Abreviacion } from '../types'

// ABREVIACIONES (2026-09-07, pedido suyo: "las abreviaciones como see ya y eso también
// márcalo como aprendido, pero pon otro módulo"). Módulo aparte a propósito: no son palabras
// nuevas, son las de siempre encogidas, y preguntarlas en el examen de vocabulario no tiene
// sentido — la mitad ni se escriben. Pero él quería marcarlas, así que llevan su propia
// marca, como los grupos de pronunciación: la pone el usuario, no puntúa y no desbloquea nada.
//
// El aviso de escritura por grupo no es decoración: la diferencia entre "let's" (correcto en
// cualquier sitio) y "gonna" (nunca se escribe) es justo lo que hace falta saber para no
// meter la pata en un examen escrito.

const COLOR_AVISO: Record<string, string> = {
  'se escriben': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  'solo hablando': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
  'solo en chats': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  'nunca se escriben': 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
}

async function alternar(id: string, sabida: boolean) {
  await db.abreviaciones.put({ id, fecha: new Date().toISOString(), sabida })
}

function Ficha({ a, sabida }: { a: Abreviacion; sabida: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
      <div className="flex items-center gap-2">
        <button onClick={() => hablar(a.texto)} aria-label={`Escuchar ${a.texto}`} className="text-base leading-none">
          🔊
        </button>
        <span className="font-semibold">{a.texto}</span>
        {a.de && <span className="text-xs text-slate-400">← {a.de}</span>}
      </div>
      <p className="pl-7 text-xs tracking-wide text-slate-400 dark:text-slate-500">/ {a.pron} /</p>
      <p className="pl-7 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{a.es}</p>
      <button
        onClick={() => hablar(a.ejemplo)}
        className="pl-7 text-left text-xs italic text-slate-500 dark:text-slate-400"
      >
        {a.ejemplo} <span className="not-italic">🔊</span>
      </button>
      <button
        onClick={() => alternar(a.id, !sabida)}
        className={`mt-1 self-start rounded-lg px-2.5 py-1 text-xs font-semibold ${
          sabida
            ? 'bg-emerald-500 text-white'
            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
        }`}
      >
        {sabida ? 'La sé ✓' : 'La sé'}
      </button>
    </div>
  )
}

export default function Abreviaciones() {
  const marcadas = useLiveQuery(() => db.abreviaciones.toArray(), [], [])
  const [abierto, setAbierto] = useState(0)
  if (!abreviacionesPack) return null

  const sabidas = new Set(marcadas.filter((m) => m.sabida).map((m) => m.id))
  const total = abreviacionesPack.grupos.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{abreviacionesPack.nota}</p>

      <p className="text-sm font-semibold">
        {sabidas.size} de {total} marcadas
      </p>

      {abreviacionesPack.grupos.map((g, i) => {
        const desplegado = abierto === i
        const cuantas = g.items.filter((it) => sabidas.has(it.id)).length
        return (
          <div key={g.titulo} className="tarjeta">
            <button onClick={() => setAbierto(desplegado ? -1 : i)} className="flex w-full items-center gap-2 text-left">
              <span className="flex-1 font-bold">{g.titulo}</span>
              <span className="text-xs text-slate-400">
                {cuantas}/{g.items.length}
              </span>
              <span className="text-slate-400">{desplegado ? '▲' : '▼'}</span>
            </button>

            <span
              className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                COLOR_AVISO[g.escritura] ?? 'bg-slate-100 text-slate-600'
              }`}
            >
              {g.escritura}
            </span>

            {desplegado && (
              <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  💡 {g.nota}
                </p>
                {g.items.map((a) => (
                  <Ficha key={a.id} a={a} sabida={sabidas.has(a.id)} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

import { useState } from 'react'
import { expresionesPack } from '../data/packs'
import { hablar } from '../lib/audio'
import type { Expresion } from '../types'

// EXPRESIONES (2026-09-06, pedido suyo: "I am feeling blue no es 'me siento azul'").
// Las frases que no se traducen palabra por palabra. Va aparte del vocabulario porque no es
// lo mismo: una tarjeta enseña UNA palabra y entra al SRS y a los exámenes; esto son frases
// hechas, y varias (los modismos) ni siquiera son A1 —se ponen para reconocerlas al oírlas en
// una serie, no para producirlas—. Así que se consulta, como la rúbrica y la pronunciación:
// sin SRS, sin marca de aprendida y sin entrar en ningún examen.
//
// El `tema` de cada expresión dice desde cuándo se tiene el vocabulario para usarla; no la
// esconde. Esconder las de más adelante sería peor: la gracia de la lista es ver el patrón
// entero de golpe (todo el bloque de "tengo hambre / tengo frío / tengo 20 años" junto).

function Ficha({ e, temaActual }: { e: Expresion; temaActual: number }) {
  const disponible = e.tema <= temaActual
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
      <div className="flex items-center gap-2">
        <button onClick={() => hablar(e.texto)} aria-label={`Escuchar ${e.texto}`} className="text-base leading-none">
          🔊
        </button>
        <span className="font-semibold">{e.texto}</span>
        <span className="text-xs tracking-wide text-slate-400 dark:text-slate-500">/ {e.pron} /</span>
      </div>
      <p className="pl-7 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{e.es}</p>
      <p className="pl-7 text-xs text-rose-600 dark:text-rose-300">
        no es <span className="line-through decoration-rose-300">{e.literal}</span>
      </p>
      <button onClick={() => hablar(e.ejemplo)} className="pl-7 text-left text-xs italic text-slate-500 dark:text-slate-400">
        {e.ejemplo} <span className="not-italic">🔊</span>
      </button>
      <span className="pl-7 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {disponible ? `ya la puedes usar · tema ${e.tema}` : `vocabulario del tema ${e.tema}`}
      </span>
    </div>
  )
}

export default function Expresiones({ tema }: { tema: number }) {
  const [abierto, setAbierto] = useState(0)
  if (!expresionesPack) return null

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{expresionesPack.nota}</p>

      {expresionesPack.grupos.map((g, i) => {
        const desplegado = abierto === i
        const listas = g.expresiones.filter((e) => e.tema <= tema).length
        return (
          <div key={g.titulo} className="tarjeta">
            <button
              onClick={() => setAbierto(desplegado ? -1 : i)}
              className="flex w-full items-center gap-2 text-left"
            >
              <span className="flex-1 font-bold">{g.titulo}</span>
              <span className="text-xs text-slate-400">
                {listas}/{g.expresiones.length}
              </span>
              <span className="text-slate-400">{desplegado ? '▲' : '▼'}</span>
            </button>

            {desplegado && (
              <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  💡 {g.nota}
                </p>
                {g.expresiones.map((e) => (
                  <Ficha key={e.texto} e={e} temaActual={tema} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

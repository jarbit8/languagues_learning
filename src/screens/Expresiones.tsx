import { useState } from 'react'
import { expresionesPack } from '../data/packs'
import { hablar } from '../lib/audio'
import type { Expresion, NivelExpresion } from '../types'

// EXPRESIONES (2026-09-06, pedido suyo: "I am feeling blue no es 'me siento azul'").
// Las frases que no se traducen palabra por palabra. Va aparte del vocabulario porque no es
// lo mismo: una tarjeta enseña UNA palabra y entra al SRS y a los exámenes; esto son frases
// hechas y la mayoría NO son A1. Así que se consulta, como la rúbrica y la pronunciación:
// sin SRS, sin marca de aprendida y sin entrar en ningún examen.
//
// NIVEL (2026-09-06, misma tarde): él preguntó "¿todos esos son de A1?" y la respuesta era
// que no —14 de 68—, así que cada frase lleva su nivel CEFR a la vista y hay un filtro para
// quedarse solo con las de A1. Sin la etiqueta, la pantalla daba a entender que todo lo que
// hay dentro le toca ahora, que es justo lo contrario de para qué está.
//
// El `tema` dice desde cuándo tiene el vocabulario para usarla; no la esconde. Esconder las
// de más adelante sería peor: la gracia de la lista es ver el patrón entero de golpe (todo
// el bloque de "tengo hambre / tengo frío / tengo 20 años" junto).

const COLOR: Record<NivelExpresion, string> = {
  A1: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  A2: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  B1: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  B2: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
}

function Ficha({ e, temaActual }: { e: Expresion; temaActual: number }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
      <div className="flex items-center gap-2">
        <button onClick={() => hablar(e.texto)} aria-label={`Escuchar ${e.texto}`} className="text-base leading-none">
          🔊
        </button>
        <span className="font-semibold">{e.texto}</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${COLOR[e.nivel]}`}>{e.nivel}</span>
      </div>
      <p className="pl-7 text-xs tracking-wide text-slate-400 dark:text-slate-500">/ {e.pron} /</p>
      <p className="pl-7 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{e.es}</p>
      <p className="pl-7 text-xs text-rose-600 dark:text-rose-300">
        no es <span className="line-through decoration-rose-300">{e.literal}</span>
      </p>
      <button onClick={() => hablar(e.ejemplo)} className="pl-7 text-left text-xs italic text-slate-500 dark:text-slate-400">
        {e.ejemplo} <span className="not-italic">🔊</span>
      </button>
      <span className="pl-7 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {e.tema <= temaActual ? `vocabulario que ya viste · tema ${e.tema}` : `vocabulario del tema ${e.tema}`}
      </span>
    </div>
  )
}

export default function Expresiones({ tema }: { tema: number }) {
  const [abierto, setAbierto] = useState(0)
  const [soloA1, setSoloA1] = useState(false)
  if (!expresionesPack) return null

  const todas = expresionesPack.grupos.flatMap((g) => g.expresiones)
  const deA1 = todas.filter((e) => e.nivel === 'A1').length

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{expresionesPack.nota}</p>

      <div className="tarjeta flex flex-col gap-2">
        <p className="text-sm leading-relaxed">
          De las <span className="font-bold">{todas.length}</span> que hay, solo{' '}
          <span className="font-bold">{deA1} son de nivel A1</span>. El resto son A2, B1 y B2: están para que
          las entiendas cuando las oigas, no para que las uses ahora.
        </p>
        <button
          onClick={() => setSoloA1((v) => !v)}
          className={`btn self-start text-sm ${
            soloA1 ? 'btn-primary' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
          }`}
        >
          {soloA1 ? `Viendo solo A1 (${deA1})` : `Ver solo las de A1 (${deA1})`}
        </button>
      </div>

      {expresionesPack.grupos.map((g, i) => {
        const lista = soloA1 ? g.expresiones.filter((e) => e.nivel === 'A1') : g.expresiones
        if (!lista.length) return null
        const desplegado = abierto === i
        return (
          <div key={g.titulo} className="tarjeta">
            <button
              onClick={() => setAbierto(desplegado ? -1 : i)}
              className="flex w-full items-center gap-2 text-left"
            >
              <span className="flex-1 font-bold">{g.titulo}</span>
              <span className="text-xs text-slate-400">{lista.length}</span>
              <span className="text-slate-400">{desplegado ? '▲' : '▼'}</span>
            </button>

            {desplegado && (
              <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  💡 {g.nota}
                </p>
                {lista.map((e) => (
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

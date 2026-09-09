import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { vocabPacks, getVocabPack, abreviacionesPack } from '../data/packs'
import { hablar } from '../lib/audio'
import type { EstadoPalabra, PalabraEstado } from '../types'

// VOCABULARIO APRENDIDO (2026-08-30, pedido del usuario): la pantalla Vocabulario solo enseña
// el tema EN CURSO, así que al pasar al tema 2 las palabras del 1 desaparecían de la vista
// aunque siguieran guardadas. Aquí quedan todas las que ha marcado, agrupadas por tema, para
// repasarlas por su cuenta cuando quiera. No toca el SRS ni los exámenes: es solo una vista.

// La etiqueta lleva el ESCALÓN a la vista (2026-09-09). Antes «en repaso» valía igual para la
// que llevas bien y para la que fallaste ayer, así que de un vistazo no sabías cuál te estaba
// costando. Las estrellas son la caja: se cuentan sin leer.
const CLASE: Record<EstadoPalabra, string> = {
  nueva: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
  marcada: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
  fallada: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
  aprendida: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
  dominada: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
}

const TEXTO: Record<EstadoPalabra, string> = {
  nueva: 'nueva',
  marcada: '📌 marcada',
  fallada: '❌ fallada',
  aprendida: 'aprendida',
  dominada: '🏆 dominada'
}

function insignia(p: PalabraEstado) {
  const texto =
    p.estado === 'aprendida' ? `${'⭐'.repeat(Math.min(3, Math.max(1, p.cajaSRS)))} aprendida` : TEXTO[p.estado]
  return { texto, clase: CLASE[p.estado] }
}

// Cuándo vuelve a salir, en palabras. Es la mitad de la pregunta que siempre hace: la
// etiqueta dice dónde está y esto dice cuándo la vuelve a ver.
function cuando(p: PalabraEstado): string {
  if (p.estado === 'dominada') return 'ya no entra al examen diario'
  if (p.proximoRepaso === undefined) return ''
  const dias = Math.round((p.proximoRepaso - new Date().setHours(0, 0, 0, 0)) / 86400000)
  if (dias <= 0) return 'toca hoy'
  if (dias === 1) return 'vuelve mañana'
  return `vuelve en ${dias} días`
}

export default function Aprendidas() {
  const palabras = useLiveQuery(() => db.palabras.toArray(), [], [])
  const marcadas = useLiveQuery(() => db.abreviaciones.toArray(), [], [])
  const [abierto, setAbierto] = useState<number | null>(null)

  // Las abreviaciones se marcan en su propio módulo y con su propia tabla, pero él las quiere
  // ver aquí también: "aprendido" es un solo sitio, aunque por dentro sean dos listas.
  const sabidas = new Set(marcadas.filter((m) => m.sabida).map((m) => m.id))
  const abreviadas = (abreviacionesPack?.grupos ?? []).flatMap((g) =>
    g.items.filter((it) => sabidas.has(it.id)).map((it) => ({ ...it, grupo: g.titulo })))

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

  if (total === 0 && abreviadas.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Vocabulario aprendido</h2>
        <p className="tarjeta text-sm text-slate-500 dark:text-slate-400">
          Todavía no has marcado ninguna palabra. Cuando marques una como “Aprendida ✓” en Vocabulario, aparecerá aquí y
        se quedará, aunque pases al tema siguiente.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Vocabulario aprendido</h2>

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
                const badge = insignia(est)
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
                    <p className="pl-6 text-sm text-slate-500 dark:text-slate-400">
                      {c.es}
                      <span className="ml-2 text-xs text-slate-400">{'· ' + cuando(est)}</span>
                    </p>
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

      {abreviadas.length > 0 && (
        <div className="tarjeta">
          <p className="flex items-center gap-2 font-bold">
            ✂️ Abreviaciones <span className="ml-auto text-xs font-normal text-slate-400">{abreviadas.length}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Las que marcaste en su módulo. No entran en ningún examen: son de reconocer, no de producir.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-700">
            {abreviadas.map((a) => (
              <button
                key={a.id}
                onClick={() => hablar(a.texto)}
                title={`${a.es}${a.de ? ` · de ${a.de}` : ''}`}
                className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold dark:bg-slate-800"
              >
                {a.texto} <span className="font-normal text-slate-400">{a.es}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

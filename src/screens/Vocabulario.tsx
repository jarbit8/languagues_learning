import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { getVocabPack, vocabPacks } from '../data/packs'
import { toggleAprendida } from '../lib/srs'
import { esHoy } from '../lib/fechas'
import VocabCard from '../components/VocabCard'

export default function Vocabulario({ tema }: { tema: number }) {
  const pack = getVocabPack(tema)
  // PENDIENTES DE TEMAS ANTERIORES (2026-09-13). El vocabulario ya no es requisito del examen de
  // tema, así que se puede avanzar con palabras sin marcar; como esta pantalla solo enseñaba
  // el tema en curso, esas palabras se habrían quedado sin forma de marcarlas.
  const anteriores = vocabPacks.filter((p) => p.tema < tema)
  const estados = useLiveQuery(async () => {
    const ids = [...(pack?.conceptos ?? []), ...anteriores.flatMap((p) => p.conceptos)].map((c) => c.id)
    const filas = await db.palabras.bulkGet(ids)
    const mapa: Record<string, (typeof filas)[number]> = {}
    ids.forEach((id, i) => (mapa[id] = filas[i]))
    return mapa
  }, [tema])

  if (!pack) return <p className="tarjeta">Este tema aún no tiene vocabulario.</p>

  const marcada = (id: string) => {
    const e = estados?.[id]
    return !!e && e.estado !== 'nueva'
  }
  const aprendidas = pack.conceptos.filter((c) => marcada(c.id)).length
  const hoy = estados ? Object.values(estados).filter((e) => e && esHoy(e.fechaAprendida)).length : 0
  const pendientes = estados
    ? anteriores
        .map((p) => ({ ...p, conceptos: p.conceptos.filter((c) => !marcada(c.id)) }))
        .filter((p) => p.conceptos.length > 0)
    : []

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>
          {aprendidas}/{pack.conceptos.length} aprendidas
        </span>
        <span>Hoy marcaste {hoy}</span>
      </div>
      {pack.conceptos.map((c) => (
        <VocabCard key={c.id} concepto={c} estado={estados?.[c.id] ?? undefined} onToggle={toggleAprendida} />
      ))}

      {pendientes.map((p) => (
        <div key={p.tema} className="mt-3 flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
            Pendientes del tema {p.tema} · {p.conceptos.length}
          </h2>
          {p.conceptos.map((c) => (
            <VocabCard key={c.id} concepto={c} estado={estados?.[c.id] ?? undefined} onToggle={toggleAprendida} />
          ))}
        </div>
      ))}
    </div>
  )
}

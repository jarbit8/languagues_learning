import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { getVocabPack } from '../data/packs'
import { toggleAprendida } from '../lib/srs'
import { esHoy } from '../lib/fechas'
import VocabCard from '../components/VocabCard'

export default function Vocabulario({ tema }: { tema: number }) {
  const pack = getVocabPack(tema)
  const estados = useLiveQuery(async () => {
    if (!pack) return {}
    const ids = pack.conceptos.map((c) => c.id)
    const filas = await db.palabras.bulkGet(ids)
    const mapa: Record<string, (typeof filas)[number]> = {}
    ids.forEach((id, i) => (mapa[id] = filas[i]))
    return mapa
  }, [tema])

  if (!pack) return <p className="tarjeta">Este tema aún no tiene vocabulario.</p>

  const aprendidas = estados ? Object.values(estados).filter((e) => e && e.estado !== 'nueva').length : 0
  const hoy = estados ? Object.values(estados).filter((e) => e && esHoy(e.fechaAprendida)).length : 0

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
    </div>
  )
}

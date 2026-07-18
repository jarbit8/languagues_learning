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
      <details className="tarjeta text-sm">
        <summary className="cursor-pointer font-semibold">¿Cómo leer la pronunciación / así /?</summary>
        <div className="mt-2 flex flex-col gap-1 text-slate-600 dark:text-slate-300">
          <p>Sílabas separadas con guiones; la sílaba en MAYÚSCULAS es la que suena más fuerte.</p>
          <p><span className="chip-en">EN</span> «j» = h aspirada suave (hello → je-LOU) · «th» = z con la lengua entre los dientes · «dh» = igual pero vibrando · «sh» = shhh de silencio · «g» siempre como en gato.</p>
          <p><span className="chip-fr">FR</span> «zh» = ll argentina (bonjour → bon-ZHUR) · «ü» = di «i» con labios de «u» · «ö» = di «e» con labios de «o» · vocal + «n» = nasal, la n casi no suena · la «r» es gutural, desde la garganta.</p>
        </div>
      </details>
      {pack.conceptos.map((c) => (
        <VocabCard key={c.id} concepto={c} estado={estados?.[c.id] ?? undefined} onToggle={toggleAprendida} />
      ))}
    </div>
  )
}

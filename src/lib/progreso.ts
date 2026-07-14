import { db } from '../db'
import { vocabPacks, getVocabPack } from '../data/packs'
import { esHoy } from './fechas'

// El "tema en curso" es el primer tema aún no aprobado (el orden codifica dependencias).
export async function temaEnCurso(): Promise<number> {
  const progresos = await db.progresoTema.toArray()
  for (const p of vocabPacks) {
    const pr = progresos.find((x) => x.temaId === p.tema)
    if (!pr || pr.estado !== 'aprobado') return p.tema
  }
  return vocabPacks.at(-1)?.tema ?? 1
}

export async function resumenVocabTema(tema: number) {
  const pack = getVocabPack(tema)
  if (!pack) return { total: 0, aprendidas: 0, hoy: 0 }
  const ids = pack.conceptos.map((c) => c.id)
  const estados = await db.palabras.bulkGet(ids)
  const aprendidas = estados.filter((e) => e && e.estado !== 'nueva').length
  const hoy = estados.filter((e) => e && esHoy(e.fechaAprendida)).length
  return { total: ids.length, aprendidas, hoy }
}

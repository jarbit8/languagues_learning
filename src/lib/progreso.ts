import { db } from '../db'
import { vocabPacks, getVocabPack } from '../data/packs'
import { esHoy } from './fechas'
import type { Idioma, ProgresoTema } from '../types'

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

function baseProgreso(tema: number): ProgresoTema {
  return { temaId: tema, estado: 'en_curso', intentos: 0 }
}

export async function getProgresoTema(tema: number): Promise<ProgresoTema | undefined> {
  return db.progresoTema.get(tema)
}

export async function marcarGramaticaCompletada(tema: number, idioma: Idioma) {
  const pr = (await db.progresoTema.get(tema)) ?? baseProgreso(tema)
  if (idioma === 'en') pr.gramaticaEnCompletada = true
  else pr.gramaticaFrCompletada = true
  await db.progresoTema.put(pr)
}

export interface EstadoExamenTema {
  disponible: boolean
  faltaVocab: boolean
  faltaGramEn: boolean
  faltaGramFr: boolean
  aprendidas: number
  total: number
}

// Puerta de tema: 100% vocab aprendido + gramática de ambos idiomas completada una vez.
export async function estadoExamenTema(tema: number): Promise<EstadoExamenTema> {
  const resumen = await resumenVocabTema(tema)
  const pr = await db.progresoTema.get(tema)
  const faltaVocab = resumen.total === 0 || resumen.aprendidas < resumen.total
  const faltaGramEn = !pr?.gramaticaEnCompletada
  const faltaGramFr = !pr?.gramaticaFrCompletada
  return {
    disponible: !faltaVocab && !faltaGramEn && !faltaGramFr,
    faltaVocab,
    faltaGramEn,
    faltaGramFr,
    aprendidas: resumen.aprendidas,
    total: resumen.total
  }
}

// Registra el resultado del examen de tema. ≥80% aprueba y desbloquea el siguiente.
export async function registrarExamenTema(tema: number, nota: number): Promise<boolean> {
  const aprobado = nota >= 80
  const pr = (await db.progresoTema.get(tema)) ?? baseProgreso(tema)
  pr.intentos = (pr.intentos ?? 0) + 1
  pr.notaExamenTema = Math.max(pr.notaExamenTema ?? 0, nota)
  if (aprobado) pr.estado = 'aprobado'
  await db.progresoTema.put(pr)
  return aprobado
}

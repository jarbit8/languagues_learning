import type { VocabPack } from '../types'

// Los data packs viven en /data (raíz). Se importan en build → quedan en el bundle
// y por tanto en el precache del service worker (offline total).
const vocabModules = import.meta.glob('/data/vocabulario/*.json', { eager: true }) as Record<
  string,
  { default: VocabPack }
>

export const vocabPacks: VocabPack[] = Object.values(vocabModules)
  .map((m) => m.default)
  .sort((a, b) => a.tema - b.tema)

export const temasDisponibles: number[] = vocabPacks.map((p) => p.tema)

export function getVocabPack(tema: number): VocabPack | undefined {
  return vocabPacks.find((p) => p.tema === tema)
}

export function conceptoPorId(id: string) {
  for (const p of vocabPacks) {
    const c = p.conceptos.find((x) => x.id === id)
    if (c) return { concepto: c, tema: p.tema }
  }
  return undefined
}

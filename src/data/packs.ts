import type { VocabPack, GramaticaPack, ListeningPack, ReadingPack, WritingPack, Idioma } from '../types'

// Los data packs viven en /data (raíz). Se importan en build → quedan en el bundle
// y por tanto en el precache del service worker (offline total).
const vocabModules = import.meta.glob('/data/vocabulario/*.json', { eager: true }) as Record<
  string,
  { default: VocabPack }
>

const gramaticaModules = import.meta.glob('/data/gramatica/*.json', { eager: true }) as Record<
  string,
  { default: GramaticaPack }
>

const listeningModules = import.meta.glob('/data/listening/*.json', { eager: true }) as Record<
  string,
  { default: ListeningPack }
>

const readingModules = import.meta.glob('/data/reading/*.json', { eager: true }) as Record<
  string,
  { default: ReadingPack }
>

const writingModules = import.meta.glob('/data/writing/*.json', { eager: true }) as Record<
  string,
  { default: WritingPack }
>

export const vocabPacks: VocabPack[] = Object.values(vocabModules)
  .map((m) => m.default)
  .sort((a, b) => a.tema - b.tema)

export const gramaticaPacks: GramaticaPack[] = Object.values(gramaticaModules).map((m) => m.default)

export function getGramatica(tema: number, idioma: Idioma): GramaticaPack | undefined {
  return gramaticaPacks.find((p) => p.tema === tema && p.idioma === idioma)
}

export function tieneGramaticaCompleta(tema: number): boolean {
  return !!getGramatica(tema, 'en') && !!getGramatica(tema, 'fr')
}

export const listeningPacks: ListeningPack[] = Object.values(listeningModules)
  .map((m) => m.default)
  .sort((a, b) => a.tema - b.tema)

export function getListening(tema: number, idioma: Idioma): ListeningPack | undefined {
  return listeningPacks.find((p) => p.tema === tema && p.idioma === idioma)
}

export const readingPacks: ReadingPack[] = Object.values(readingModules).map((m) => m.default)
export const writingPacks: WritingPack[] = Object.values(writingModules).map((m) => m.default)

export function getReading(bloque: number, idioma: Idioma): ReadingPack | undefined {
  return readingPacks.find((p) => p.bloque === bloque && p.idioma === idioma)
}

export function getWriting(bloque: number, idioma: Idioma): WritingPack | undefined {
  return writingPacks.find((p) => p.bloque === bloque && p.idioma === idioma)
}

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

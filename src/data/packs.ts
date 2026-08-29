import type { VocabPack, GramaticaPack, ListeningPack, ReadingPack, WritingPack, PronPack, DialogoConTema } from '../types'

// Los data packs viven en /data (raíz). Se importan en build → quedan en el bundle
// y por tanto en el precache del service worker (offline total).
//
// El sufijo -en de los nombres es herencia de cuando el curso llevaba inglés y francés
// en paralelo; hoy el curso es solo inglés y no hay otro juego de packs.
const vocabModules = import.meta.glob('/data/vocabulario/*.json', { eager: true }) as Record<
  string,
  { default: VocabPack }
>

const gramaticaModules = import.meta.glob('/data/gramatica/*-en.json', { eager: true }) as Record<
  string,
  { default: GramaticaPack }
>

const listeningModules = import.meta.glob('/data/listening/*-en.json', { eager: true }) as Record<
  string,
  { default: ListeningPack }
>

const readingModules = import.meta.glob('/data/reading/*-en.json', { eager: true }) as Record<
  string,
  { default: ReadingPack }
>

const writingModules = import.meta.glob('/data/writing/*-en.json', { eager: true }) as Record<
  string,
  { default: WritingPack }
>

const pronModules = import.meta.glob('/data/pronunciacion/en.json', { eager: true }) as Record<
  string,
  { default: PronPack }
>

const listar = <T>(modulos: Record<string, { default: T }>): T[] =>
  Object.values(modulos).map((m) => m.default)

export const vocabPacks: VocabPack[] = listar(vocabModules).sort((a, b) => a.tema - b.tema)

export const gramaticaPacks: GramaticaPack[] = listar(gramaticaModules)

export function getGramatica(tema: number): GramaticaPack | undefined {
  return gramaticaPacks.find((p) => p.tema === tema)
}

export function tieneGramatica(tema: number): boolean {
  return !!getGramatica(tema)
}

export const listeningPacks: ListeningPack[] = listar(listeningModules).sort((a, b) => a.tema - b.tema)

export function getListening(tema: number): ListeningPack | undefined {
  return listeningPacks.find((p) => p.tema === tema)
}

// Aplana los diálogos de un pack añadiéndoles su tema, para pantallas que listan varios juntos.
export function dialogosDe(pack: ListeningPack): DialogoConTema[] {
  return pack.dialogos.map((d) => ({ ...d, tema: pack.tema }))
}

export const readingPacks: ReadingPack[] = listar(readingModules)
export const writingPacks: WritingPack[] = listar(writingModules)

// Pronunciación: transversal al nivel, no por tema.
export const pronPack: PronPack | undefined = listar(pronModules)[0]

// Lectura POR TEMA (2026-07-25): antes era por bloque. Una lectura por tema para que el estudio
// diario cubra las 5 habilidades del mismo tema.
export function getReading(tema: number): ReadingPack | undefined {
  return readingPacks.find((p) => p.tema === tema)
}

export function getWriting(bloque: number): WritingPack | undefined {
  return writingPacks.find((p) => p.bloque === bloque)
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

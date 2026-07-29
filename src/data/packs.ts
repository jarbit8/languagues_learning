import type { VocabPack, GramaticaPack, ListeningPack, ReadingPack, WritingPack, PronPack, Idioma, DialogoConTema } from '../types'
import { IDIOMAS_ACTIVOS } from '../config'

// Los data packs viven en /data (raíz). Se importan en build → quedan en el bundle
// y por tanto en el precache del service worker (offline total).
//
// ⚠️ ÚNICO SITIO donde el idioma va escrito a mano: los patrones de glob DEBEN ser literales
// (Vite los resuelve en build), así que filtrar por IDIOMAS_ACTIVOS en runtime no evitaría que
// el contenido inactivo se descargue igual. Con '*-en.json' el francés ni entra al bundle.
// PARA REACTIVAR FRANCÉS: poner '*.json' en los 4 globs de abajo (o '*-fr.json' para solo francés)
// ADEMÁS de cambiar IDIOMAS_ACTIVOS en config.ts. Son las 2 únicas ediciones necesarias.
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

// Los packs de gramática/listening/reading/writing son POR IDIOMA (…-en.json / …-fr.json):
// se descartan los de idiomas inactivos para que ni se carguen en memoria ni se muestren.
// (Los archivos siguen en /data: reactivar un idioma es solo tocar IDIOMAS_ACTIVOS.)
function soloActivos<T>(modulos: Record<string, { default: T }>): T[] {
  return Object.entries(modulos)
    .filter(([ruta]) => IDIOMAS_ACTIVOS.some((i) => ruta.endsWith(`-${i}.json`)))
    .map(([, m]) => m.default)
}

// El vocabulario es UN archivo dual (es+en+fr en cada concepto), así que no se puede filtrar por
// archivo. No se toca el dato: la UI y los exámenes solo leen los lados de IDIOMAS_ACTIVOS.
export const vocabPacks: VocabPack[] = Object.values(vocabModules)
  .map((m) => m.default)
  .sort((a, b) => a.tema - b.tema)

export const gramaticaPacks: GramaticaPack[] = soloActivos(gramaticaModules)

export function getGramatica(tema: number, idioma: Idioma): GramaticaPack | undefined {
  return gramaticaPacks.find((p) => p.tema === tema && p.idioma === idioma)
}

export function tieneGramaticaCompleta(tema: number): boolean {
  return IDIOMAS_ACTIVOS.every((i) => !!getGramatica(tema, i))
}

export const listeningPacks: ListeningPack[] = soloActivos<ListeningPack>(listeningModules).sort(
  (a, b) => a.tema - b.tema
)

export function getListening(tema: number, idioma: Idioma): ListeningPack | undefined {
  return listeningPacks.find((p) => p.tema === tema && p.idioma === idioma)
}

// Aplana los diálogos de un pack añadiéndoles tema/idioma, para pantallas que listan varios juntos.
export function dialogosDe(pack: ListeningPack): DialogoConTema[] {
  return pack.dialogos.map((d) => ({ ...d, tema: pack.tema, idioma: pack.idioma }))
}

export const readingPacks: ReadingPack[] = soloActivos<ReadingPack>(readingModules)
export const writingPacks: WritingPack[] = soloActivos<WritingPack>(writingModules)

// Pronunciación: un pack por idioma (hoy solo inglés). Transversal, no por tema.
export const pronPacks: PronPack[] = Object.values(pronModules).map((m) => m.default)

export function getPron(idioma: Idioma): PronPack | undefined {
  return pronPacks.find((p) => p.idioma === idioma)
}

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

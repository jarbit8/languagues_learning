import { db } from '../db'
import { sincronizarPronto } from './autosync'
import { getVocabPack, getListening, getReading, getWriting, getGramatica } from '../data/packs'
import { bloqueDeTema } from './curriculum'
import { itemsDisponibles } from './deletreo'
import { resumenVocabTema } from './progreso'
import { porDia } from './porDia'

// AVANCE DEL TEMA (2026-09-08, él: "cuando ya haga todo al 100% que se marque ya hecha y eso
// pase al avance del tema que está en inicio, que solo toma vocabulario").
//
// La barra de Inicio medía palabras aprendidas y nada más, así que marcaba 100% con la
// gramática sin abrir y sin haber escuchado, leído, escrito ni hablado — justo lo que el
// examen de tema sí exige. Ahora mide los SEIS módulos del tema, los mismos que las seis
// secciones del examen.
//
// PESO IGUAL POR MÓDULO, no por pieza: con 18 palabras y 2 lecturas, contar piezas sueltas
// haría que el vocabulario fuera el 60% de la barra y el problema seguiría igual de tapado.
// Cada módulo vale 1/6 y dentro de él cuentan sus piezas.

export type ModuloTema = 'vocabulario' | 'gramatica' | 'escuchar' | 'leer' | 'escribir' | 'hablar'

export interface AvanceModulo {
  id: ModuloTema
  nombre: string
  icono: string
  hechas: number
  total: number
  ruta: string
}

export interface AvanceTema {
  pct: number
  modulos: AvanceModulo[]
  completo: boolean
}

// Las claves son 'modulo:pieza'. El deletreo cuenta dentro de escuchar (vive en esa pantalla
// y son sus dos jornadas), por eso lleva prefijo propio pero suma al mismo módulo.
export function claveEscuchar(indice: number) {
  return `escuchar:${indice}`
}
export function claveDeletreo(dia: 1 | 2) {
  return `deletreo:${dia}`
}
export function claveLeer(indice: number) {
  return `leer:${indice}`
}
export function claveEscribir(indice: number) {
  return `escribir:${indice}`
}
export function claveHablar(dia: 1 | 2) {
  return `hablar:${dia}`
}
export function claveGramatica(dia: number) {
  return `gramatica:${dia}`
}

export async function marcarHecho(tema: number, clave: string) {
  const pr = (await db.progresoTema.get(tema)) ?? { temaId: tema, estado: 'en_curso' as const, intentos: 0 }
  const hechos = pr.hechos ?? []
  if (hechos.includes(clave)) return
  pr.hechos = [...hechos, clave]
  await db.progresoTema.put(pr)
  sincronizarPronto()
}

export async function estaHecho(tema: number, clave: string): Promise<boolean> {
  const pr = await db.progresoTema.get(tema)
  return !!pr?.hechos?.includes(clave)
}

// Cuántas piezas tiene cada módulo HOY, según el contenido de /data. Si un tema no tiene
// material de un módulo, ese módulo no aparece: contarlo como 0/0 dejaría la barra clavada.
//
// SOLO CUENTA LO QUE PRACTICAR LLEGA A SERVIR. Cada tema tiene cinco diálogos y cinco
// lecturas, pero `porDia` reparte dos por jornada, así que la quinta —la que se llama
// "Examen · ..."— está reservada al examen de tema y no sale nunca en Practicar. Contarla
// dejaría el módulo atascado en 4/5 para siempre y la barra no llegaría al 100% jamás.
const servidas = <T,>(items: T[]) => new Set([...porDia(items, 1), ...porDia(items, 2)]).size

function piezas(tema: number) {
  const dialogos = servidas(getListening(tema)?.dialogos ?? [])
  const conDeletreo = itemsDisponibles(tema).length > 0 ? 2 : 0
  const consignas = getWriting(bloqueDeTema(tema))?.consignas.filter((c) => c.tema === tema) ?? []
  return {
    vocabulario: getVocabPack(tema)?.conceptos.length ?? 0,
    gramatica: getGramatica(tema) ? (getGramatica(tema)!.dias?.length ?? 1) : 0,
    escuchar: dialogos + conDeletreo,
    leer: servidas(getReading(tema)?.textos ?? []),
    // Escribir va de una en una: el día 1 sirve la primera y el día 2 la segunda, y si el
    // tema solo tiene una, los dos días sirven la misma.
    escribir: Math.min(2, consignas.length),
    // Hablar son las dos jornadas: no hay nada que corregir, se marca a mano al terminar.
    hablar: 2
  }
}

export async function avanceTema(tema: number): Promise<AvanceTema> {
  const [vocab, pr] = await Promise.all([resumenVocabTema(tema), db.progresoTema.get(tema)])
  const hechos = pr?.hechos ?? []
  const n = piezas(tema)
  const cuenta = (prefijo: string) => hechos.filter((h) => h.startsWith(`${prefijo}:`)).length

  const todos: AvanceModulo[] = [
    { id: 'vocabulario', nombre: 'Vocabulario', icono: '🗂️', hechas: vocab.aprendidas, total: n.vocabulario, ruta: '/aprender' },
    { id: 'gramatica', nombre: 'Gramática', icono: '📐', hechas: cuenta('gramatica'), total: n.gramatica, ruta: '/aprender' },
    { id: 'escuchar', nombre: 'Escuchar', icono: '🎧', hechas: cuenta('escuchar') + cuenta('deletreo'), total: n.escuchar, ruta: '/hablar' },
    { id: 'leer', nombre: 'Leer', icono: '📖', hechas: cuenta('leer'), total: n.leer, ruta: '/hablar' },
    { id: 'escribir', nombre: 'Escribir', icono: '✍️', hechas: cuenta('escribir'), total: n.escribir, ruta: '/hablar' },
    { id: 'hablar', nombre: 'Hablar', icono: '🗣️', hechas: cuenta('hablar'), total: n.hablar, ruta: '/hablar' }
  ]

  const modulos = todos
    .filter((m) => m.total > 0)
    .map((m) => ({ ...m, hechas: Math.min(m.hechas, m.total) }))
  const pct = modulos.length
    ? Math.round(modulos.reduce((s, m) => s + m.hechas / m.total, 0) * (100 / modulos.length))
    : 0
  return { pct, modulos, completo: modulos.every((m) => m.hechas >= m.total) }
}

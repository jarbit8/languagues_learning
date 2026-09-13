import { db } from '../db'
import { sincronizarPronto } from './autosync'
import { getListening, getReading, getWriting, getGramatica } from '../data/packs'
import { bloqueDeTema } from './curriculum'
import { itemsDisponibles } from './deletreo'
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
// Cada módulo vale lo mismo y dentro de él cuentan sus piezas.
//
// UN DÍA DE ESTUDIO Y OTRO DE EXAMEN (2026-09-13, él: "el día 1 será aprender la gramática y
// practicar todo, el día 2 es el examen; el vocabulario es aparte"). El avance mide solo el día
// 1 —la gramática entera y una jornada de práctica— y el vocabulario salió de aquí: va por el
// examen diario en papel y ya no entra al examen de tema.

export type ModuloTema = 'gramatica' | 'escuchar' | 'leer' | 'escribir' | 'hablar'

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
// SOLO CUENTA LO QUE PRACTICAR LLEGA A SERVIR, que desde el 2026-09-13 es lo del día 1.
// Contar piezas que la pantalla no enseña dejaría el módulo atascado y la barra no llegaría
// al 100% jamás.
function piezas(tema: number) {
  const consignas = getWriting(bloqueDeTema(tema))?.consignas.filter((c) => c.tema === tema) ?? []
  return {
    gramatica: getGramatica(tema) ? 1 : 0,
    escuchar: porDia(getListening(tema)?.dialogos ?? [], 1).length + (itemsDisponibles(tema).length > 0 ? 1 : 0),
    leer: porDia(getReading(tema)?.textos ?? [], 1).length,
    escribir: Math.min(1, consignas.length),
    // Hablar no tiene nada que corregir: se marca a mano al terminar.
    hablar: 1
  }
}

export async function avanceTema(tema: number): Promise<AvanceTema> {
  const pr = await db.progresoTema.get(tema)
  const hechos = pr?.hechos ?? []
  const n = piezas(tema)
  const cuenta = (prefijo: string) => hechos.filter((h) => h.startsWith(`${prefijo}:`)).length

  const todos: AvanceModulo[] = [
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

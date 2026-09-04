import { db } from '../db'
import { vocabPacks } from '../data/packs'
import { UN_DIA, inicioDeHoy } from './fechas'
import type { PausaPlan, PlanEstudio } from '../types'

// Cronograma del nivel: 2 días por tema → 48 días para los 24 temas.
//
// Es una GUÍA y nada más. Choca de frente con la regla 1 (ritmo libre, sin calendario), así
// que lo importante es lo que NO hace: no desbloquea temas, no los cierra, no caduca nada y
// no aparece si no lo activas. Solo responde a "¿voy al día?". Quien decide si avanzas sigue
// siendo el examen de tema.

export const ID_PLAN = 'a1'

// DÍA DE ARRANQUE. Se puede cambiar desde Progreso → Temario (2026-09-04, pedido del
// usuario: "realmente debí empezar el primero de sep pero no pude"). Este valor solo se usa
// mientras no se elija nada; en cuanto se toca la fecha, manda la guardada.
// Es un LUNES a propósito: el bloque 4 y la semana final tienen que caer en lunes, y
// arrancar en lunes hace que las pausas necesarias para conseguirlo sean las mínimas.
// El mes va en base 0 en el constructor de Date: 8 = septiembre.
export const INICIO_A1 = new Date(2026, 8, 7).getTime()

export const DIAS_POR_TEMA = 2
export const TEMAS_POR_BLOQUE = 6
// Cada bloque son sus 6 temas (2 días cada uno) MÁS un día suelto solo para su examen:
// el de bloque son ~115 preguntas y no cabe pegado al final de un día de estudio.
export const DIAS_POR_BLOQUE = TEMAS_POR_BLOQUE * DIAS_POR_TEMA + 1 // 13

export const totalTemas = () => vocabPacks.length
export const totalBloques = () => Math.ceil(totalTemas() / TEMAS_POR_BLOQUE)
// EL FINAL ES UNA SEMANA ENTERA (2026-08-30, decisión del usuario: "un examen muy completo
// practicando todo lo aprendido, que demorará una semana, hasta el domingo"). Antes eran 2
// días y ya se quedaba corto: son 230 preguntas objetivas más writing y speaking. Ahora la
// semana repasa el nivel bloque a bloque y remata con el examen partido en dos días.
// El contenido del nivel cierra el sábado 31 de octubre con el examen del bloque 4; el
// domingo 1 queda libre (pausa) para que la semana caiga limpia de lunes a domingo.
export const DIAS_FINAL = 7
// 4 bloques x 13 días + la semana final.
export const diasDelPlan = () => totalBloques() * DIAS_POR_BLOQUE + DIAS_FINAL

// Qué toca cada día de la semana final. Sin esto la semana serían siete casillas vacías y
// el usuario tendría que inventarse el repaso; el examen en sí son los dos últimos días.
export const SEMANA_FINAL: string[] = [
  'Repaso del bloque 1 — temas 1 a 6',
  'Repaso del bloque 2 — temas 7 a 12',
  'Repaso del bloque 3 — temas 13 a 18',
  'Repaso del bloque 4 — temas 19 a 24',
  'Escuchar, leer y pronunciación de todo el nivel',
  'Examen final · vocabulario, gramática, listening y reading',
  'Examen final · writing y speaking, y resultado del nivel'
]

export type Jornada =
  | { tipo: 'tema'; tema: number; diaDelTema: number }
  | { tipo: 'bloque'; bloque: number }
  | { tipo: 'final'; diaDelFinal: number }

// Qué toca el día N del plan. Los días van: 6 temas de 2 días, luego el examen de bloque,
// y así 4 veces; el último día es el examen final del nivel.
export function jornadaDelDia(dia: number): Jornada {
  const diasDeTemas = totalBloques() * DIAS_POR_BLOQUE
  if (dia > diasDeTemas) return { tipo: 'final', diaDelFinal: Math.min(DIAS_FINAL, dia - diasDeTemas) }
  const bloquesCerrados = Math.floor((dia - 1) / DIAS_POR_BLOQUE)
  const dentro = (dia - 1) % DIAS_POR_BLOQUE
  if (dentro === DIAS_POR_BLOQUE - 1) return { tipo: 'bloque', bloque: bloquesCerrados + 1 }
  const tema = bloquesCerrados * TEMAS_POR_BLOQUE + Math.floor(dentro / DIAS_POR_TEMA) + 1
  if (tema > totalTemas()) return { tipo: 'final', diaDelFinal: 1 }
  return { tipo: 'tema', tema, diaDelTema: (dentro % DIAS_POR_TEMA) + 1 }
}

// El primer día del plan que le toca a un tema (para pintar sus fechas en el temario).
export function primerDiaDeTema(tema: number): number {
  const bloque = Math.floor((tema - 1) / TEMAS_POR_BLOQUE)
  const dentro = (tema - 1) % TEMAS_POR_BLOQUE
  return bloque * DIAS_POR_BLOQUE + dentro * DIAS_POR_TEMA + 1
}

export function diaDeExamenDeBloque(bloque: number): number {
  return bloque * DIAS_POR_BLOQUE
}

// Fecha en la que terminaría el nivel con el arranque por defecto y sin pausas propias.
// Sirve para enseñar el rango ANTES de activar el cronograma, cuando aún no hay plan guardado.
export function fechaFinPrevista(): number {
  return fechaDeDia(PLAN_POR_DEFECTO, diasDelPlan())
}

// EL CRONOGRAMA ESTÁ SIEMPRE PUESTO (2026-08-30, "borra este botón, ya se sabe que empieza el
// primero"). Antes había que activarlo y se guardaba una fila en Dexie; ahora la fila solo
// existe si el usuario TOCA algo (añadir o quitar una pausa), y mientras tanto se usa este
// plan por defecto. Se fueron con el botón `empezarPlan` y `borrarPlan`: si el plan se crea
// solo, "quitar el cronograma" lo haría reaparecer en la siguiente recarga.
// LAS PAUSAS LAS PONE EL USUARIO, NO EL CRONOGRAMA (2026-09-04: "no pongan pausas
// automáticas, yo haré todo eso manual"). Hubo dos intentos antes: primero dos fechas fijas
// escritas a mano y luego un cálculo que las colocaba solas para que el bloque 4 y la semana
// final empezaran en lunes. Los dos se han quitado. Consecuencia asumida: los días caen
// donde caigan y ningún bloque tiene por qué arrancar en lunes; si eso importa, se arregla
// con una pausa a mano.
//
// Se siguen reconociendo por el motivo las que dejaron los dos sistemas viejos, para poder
// borrarlas al fijar la fecha de inicio en vez de dejarlas ahí descuadrando el calendario.
const MOTIVOS_AUTOMATICOS = new Set([
  'Pausa antes del bloque 4',
  'Descanso antes de la semana final',
  'Para empezar el último bloque en lunes',
  'Para empezar la semana final en lunes'
])

const laPusoElUsuario = (p: PausaPlan) => !p.auto && !(p.motivo && MOTIVOS_AUTOMATICOS.has(p.motivo))

// Cambiar el día de arranque. Deja solo las pausas propias que siguen teniendo sentido: se
// van las que puso el cronograma viejo y las que quedaron antes del nuevo inicio (una pausa
// anterior al día 1 no pausa nada y encima hace que la app diga "hoy estás en pausa" cuando
// el curso ni siquiera ha empezado).
export async function fijarInicio(fecha: number) {
  const plan = await getPlan()
  const fechaInicio = inicioDeHoy(fecha)
  await db.plan.put({
    ...plan,
    fechaInicio,
    pausas: (plan.pausas ?? []).filter((p) => inicioDeHoy(p.hasta) >= fechaInicio),
    actualizado: Date.now()
  })
}

export const PLAN_POR_DEFECTO: PlanEstudio = {
  id: ID_PLAN,
  fechaInicio: INICIO_A1,
  diasPorTema: DIAS_POR_TEMA,
  pausas: []
}

export async function getPlan(): Promise<PlanEstudio> {
  const guardado = await db.plan.get(ID_PLAN)
  if (!guardado) return PLAN_POR_DEFECTO
  // Las que dejaron los sistemas automáticos viejos se filtran al leer, no al fijar la
  // fecha: si no, quien ya las tiene guardadas se quedaría con ellas para siempre salvo que
  // eligiera una fecha de inicio DISTINTA, y volver a elegir la misma no dispara nada.
  return { ...guardado, pausas: (guardado.pausas ?? []).filter(laPusoElUsuario) }
}

// --- Pausas -------------------------------------------------------------------------
// Un día dentro de una pausa no cuenta como día de plan: no se avanza, solo se repasa.
// Todo lo que venga después se corre esos días solo, sin tocar el orden de los temas.

type ConPausas = { pausas?: PausaPlan[] }

export function enPausa(plan: ConPausas, t: number): boolean {
  const dia = inicioDeHoy(t)
  return (plan.pausas ?? []).some((p) => dia >= inicioDeHoy(p.desde) && dia <= inicioDeHoy(p.hasta))
}

export async function anadirPausa(desde: number, hasta: number, motivo?: string) {
  const plan = await getPlan()
  // Sin `motivo: undefined`: Firestore rechaza el documento entero si una clave va en
  // undefined, y una pausa escrita a mano casi nunca lleva motivo.
  const pausa: PausaPlan = { desde: inicioDeHoy(desde), hasta: inicioDeHoy(hasta) }
  if (motivo) pausa.motivo = motivo
  const pausas = [...(plan.pausas ?? []), pausa].sort((a, b) => a.desde - b.desde)
  await db.plan.put({ ...plan, pausas, actualizado: Date.now() })
}

export async function quitarPausa(desde: number) {
  const plan = await getPlan()
  await db.plan.put({
    ...plan,
    pausas: (plan.pausas ?? []).filter((p) => p.desde !== desde),
    actualizado: Date.now()
  })
}

// Fecha real del día N del plan: se avanza por el calendario saltándose las pausas.
export function fechaDeDia(plan: ConPausas & { fechaInicio: number }, dia: number): number {
  let fecha = plan.fechaInicio
  let contados = 1
  // Tope de seguridad: el plan son 54 días y una pausa no debería pasar de unos meses.
  for (let i = 0; i < 2000 && contados < dia; i++) {
    fecha += UN_DIA
    if (!enPausa(plan, fecha)) contados++
  }
  return fecha
}

// Cuántos días de plan van hasta hoy, descontando los de pausa.
export function diaActual(plan: PlanEstudio, ahora = Date.now()): number {
  const hoy = inicioDeHoy(ahora)
  if (hoy <= plan.fechaInicio) return 1
  let dia = 1
  for (let f = plan.fechaInicio + UN_DIA; f <= hoy; f += UN_DIA) {
    if (!enPausa(plan, f)) dia++
  }
  return dia
}

export interface EstadoPlan {
  dia: number
  totalDias: number
  jornada: Jornada
  fechaFin: number
  /** Diferencia entre el tema real y el que tocaría hoy: 0 al día, negativo atrasado. */
  desfase: number
  terminado: boolean
}

export function estadoDelPlan(plan: PlanEstudio, temaReal: number, ahora = Date.now()): EstadoPlan {
  const totalDias = diasDelPlan()
  const dia = diaActual(plan, ahora)
  const jornada = jornadaDelDia(Math.min(dia, totalDias))
  const temaPlanificado = jornada.tipo === 'tema' ? jornada.tema : totalTemas()
  return {
    dia,
    totalDias,
    jornada,
    fechaFin: fechaDeDia(plan, totalDias),
    desfase: temaReal - temaPlanificado,
    terminado: dia > totalDias
  }
}

// Los días que le tocan a un tema, para pintarlos en el temario.
export function diasDeTema(plan: PlanEstudio, tema: number): { desde: number; hasta: number } {
  const primero = primerDiaDeTema(tema)
  return { desde: fechaDeDia(plan, primero), hasta: fechaDeDia(plan, primero + DIAS_POR_TEMA - 1) }
}

export function fechaExamenDeBloque(plan: PlanEstudio, bloque: number): number {
  return fechaDeDia(plan, diaDeExamenDeBloque(bloque))
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function fechaCorta(t: number): string {
  const d = new Date(t)
  return `${d.getDate()} ${MESES[d.getMonth()]}`
}

export const cierraBloque = (tema: number) => tema % TEMAS_POR_BLOQUE === 0

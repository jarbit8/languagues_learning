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

// FECHA DE ARRANQUE FIJA (2026-08-30, pedido del usuario: "quiero que esté establecido que
// debe empezar el 1 de septiembre"). Antes el plan arrancaba el día que le dieras al botón,
// así que las fechas del temario dependían de cuándo lo activaras y no se podían calcular de
// antemano. Ahora el día 1 es siempre el 1 de septiembre de 2026, actives cuando actives:
// si lo enciendes más tarde, el cronograma ya te dirá por qué día vas.
// El mes va en base 0 en el constructor de Date: 8 = septiembre.
export const INICIO_A1 = new Date(2026, 8, 1).getTime()

// PAUSA DE FÁBRICA (2026-08-30, pedido del usuario: "voy a hacer una pausa terminando el
// bloque 3, el lunes 19 de octubre empiezo con el bloque 4"). Con el arranque el 1 de
// septiembre, el examen del bloque 3 cae el viernes 9 de octubre (día 39), así que la pausa
// va del 10 al 18 y el día 40 —el tema 19, primero del bloque 4— aterriza el lunes 19.
// Los días de pausa NO cuentan, así que todo lo posterior se corre solo: el nivel pasa de
// terminar el 24 de octubre a hacerlo el 2 de noviembre, sin tocar el orden de los temas.
// Se puede quitar desde Progreso → Temario como cualquier otra pausa.
export const PAUSAS_INICIALES: PausaPlan[] = [
  { desde: new Date(2026, 9, 10).getTime(), hasta: new Date(2026, 9, 18).getTime(), motivo: 'Pausa antes del bloque 4' },
  // Un solo día: el nivel cierra el sábado 31 de octubre y la semana final va de lunes a
  // domingo, así que el domingo 1 sobra en medio. Sin esto la semana acabaría en sábado.
  { desde: new Date(2026, 10, 1).getTime(), hasta: new Date(2026, 10, 1).getTime(), motivo: 'Descanso antes de la semana final' }
]
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

// Fecha en la que terminaría el nivel si se empieza el 1 de septiembre y no se pausa nada.
// Sirve para enseñar el rango ANTES de activar el cronograma, cuando aún no hay plan guardado.
export function fechaFinPrevista(): number {
  return fechaDeDia(PLAN_POR_DEFECTO, diasDelPlan())
}

// EL CRONOGRAMA ESTÁ SIEMPRE PUESTO (2026-08-30, "borra este botón, ya se sabe que empieza el
// primero"). Antes había que activarlo y se guardaba una fila en Dexie; ahora la fila solo
// existe si el usuario TOCA algo (añadir o quitar una pausa), y mientras tanto se usa este
// plan por defecto. Se fueron con el botón `empezarPlan` y `borrarPlan`: si el plan se crea
// solo, "quitar el cronograma" lo haría reaparecer en la siguiente recarga.
export const PLAN_POR_DEFECTO: PlanEstudio = {
  id: ID_PLAN,
  fechaInicio: INICIO_A1,
  diasPorTema: DIAS_POR_TEMA,
  pausas: PAUSAS_INICIALES
}

export async function getPlan(): Promise<PlanEstudio> {
  return (await db.plan.get(ID_PLAN)) ?? PLAN_POR_DEFECTO
}

// --- Pausas -------------------------------------------------------------------------
// Un día dentro de una pausa no cuenta como día de plan: no se avanza, solo se repasa.
// Todo lo que venga después se corre esos días solo, sin tocar el orden de los temas.

export function enPausa(plan: PlanEstudio, t: number): boolean {
  const dia = inicioDeHoy(t)
  return (plan.pausas ?? []).some((p) => dia >= inicioDeHoy(p.desde) && dia <= inicioDeHoy(p.hasta))
}

export async function anadirPausa(desde: number, hasta: number, motivo?: string) {
  const plan = await getPlan()
  const pausa: PausaPlan = { desde: inicioDeHoy(desde), hasta: inicioDeHoy(hasta), motivo }
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
export function fechaDeDia(plan: PlanEstudio, dia: number): number {
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

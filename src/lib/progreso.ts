import { db } from '../db'
import { sincronizarPronto } from './autosync'
import { vocabPacks, getVocabPack } from '../data/packs'
import { esHoy, inicioDeHoy, UN_DIA } from './fechas'
import { temasDeBloque } from './curriculum'
import type {
  ProgresoTema,
  ProgresoBloque,
  ProgresoNivel,
  NotasBloque,
  EstadoTema,
  TipoExamenHistorial,
  HistorialExamen
} from '../types'

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

export async function marcarGramaticaCompletada(tema: number) {
  const pr = (await db.progresoTema.get(tema)) ?? baseProgreso(tema)
  pr.gramaticaCompletada = true
  await db.progresoTema.put(pr)
}

export interface EstadoExamenTema {
  disponible: boolean
  faltaVocab: boolean
  faltaGramatica: boolean
  aprendidas: number
  total: number
}

// Puerta de tema: 100% del vocabulario aprendido + la lección de gramática completada una vez.
export async function estadoExamenTema(tema: number): Promise<EstadoExamenTema> {
  const resumen = await resumenVocabTema(tema)
  const pr = await db.progresoTema.get(tema)
  const faltaVocab = resumen.total === 0 || resumen.aprendidas < resumen.total
  const faltaGramatica = !pr?.gramaticaCompletada
  return {
    disponible: !faltaVocab && !faltaGramatica,
    faltaVocab,
    faltaGramatica,
    aprendidas: resumen.aprendidas,
    total: resumen.total
  }
}

// Registra el resultado del examen de tema. Hay que aprobar LAS DOS secciones con ≥80%:
// con una nota global se podía desbloquear el tema con la gramática floja, porque las 20
// preguntas de vocabulario pesaban más que las de gramática.
// El examen de tema pasó de 2 secciones a 6 (2026-08-29, pedido del usuario: "un examen
// general que involucre todo todo"). El corte sigue siendo exigente donde ya lo era —80% en
// vocabulario y 80% en gramática, que son lo medible objetivamente— y pide 75% de promedio
// en las cuatro destrezas, el mismo listón que el examen de bloque, porque writing y speaking
// se autocalifican y no sería justo exigirles 80.
export async function registrarExamenTema(tema: number, notas: NotasBloque): Promise<boolean> {
  const habilidades = [notas.listening, notas.reading, notas.writing, notas.speaking].filter(
    (n): n is number => n !== undefined
  )
  const promedioHabilidades = habilidades.length
    ? Math.round(habilidades.reduce((a, b) => a + b, 0) / habilidades.length)
    : 0
  const notaVocab = notas.vocab ?? 0
  const notaGramatica = notas.gramatica ?? 0
  const aprobado = notaVocab >= 80 && notaGramatica >= 80 && promedioHabilidades >= 75
  const todas = [notaVocab, notaGramatica, ...habilidades]
  const nota = Math.round(todas.reduce((a, b) => a + b, 0) / todas.length)
  const pr = (await db.progresoTema.get(tema)) ?? baseProgreso(tema)
  pr.intentos = (pr.intentos ?? 0) + 1
  pr.notaExamenTema = Math.max(pr.notaExamenTema ?? 0, nota)
  pr.notas = notas
  if (aprobado) pr.estado = 'aprobado'
  await db.progresoTema.put(pr)
  await registrarHistorial('tema', tema, nota, aprobado)
  return aprobado
}

// --- Mapa de temas (Progreso) ---

export async function mapaTemas(): Promise<{ tema: number; estado: EstadoTema }[]> {
  const actual = await temaEnCurso()
  const progresos = await db.progresoTema.toArray()
  return vocabPacks.map((p) => {
    const pr = progresos.find((x) => x.temaId === p.tema)
    if (pr?.estado === 'aprobado') return { tema: p.tema, estado: 'aprobado' as const }
    if (p.tema === actual) return { tema: p.tema, estado: 'en_curso' as const }
    if (p.tema < actual) return { tema: p.tema, estado: 'aprobado' as const }
    return { tema: p.tema, estado: 'bloqueado' as const }
  })
}

// --- Examen de bloque ---

export interface EstadoExamenBloque {
  disponible: boolean
  temasFaltantes: number[]
}

// Puerta de bloque: los 6 temas del bloque deben estar aprobados.
export async function estadoExamenBloque(bloque: number): Promise<EstadoExamenBloque> {
  const temas = temasDeBloque(bloque)
  const progresos = await db.progresoTema.bulkGet(temas)
  const temasFaltantes = temas.filter((t, i) => progresos[i]?.estado !== 'aprobado')
  return { disponible: temasFaltantes.length === 0, temasFaltantes }
}

function baseProgresoBloque(bloque: number): ProgresoBloque {
  return { bloqueId: bloque, estado: 'en_curso', intentos: 0, notas: {} }
}

export async function getProgresoBloque(bloque: number): Promise<ProgresoBloque | undefined> {
  return db.progresoBloque.get(bloque)
}

export async function bloqueEnCurso(): Promise<number> {
  const progresos = await db.progresoBloque.toArray()
  for (let b = 1; b <= 4; b++) {
    const pr = progresos.find((x) => x.bloqueId === b)
    if (!pr || pr.estado !== 'aprobado') return b
  }
  return 4
}

// Guarda la nota de UNA habilidad. Cuando las 4 están, calcula el promedio (≥75% aprueba).
export async function registrarNotaBloque(
  bloque: number,
  habilidad: keyof NotasBloque,
  nota: number
): Promise<{ notas: NotasBloque; aprobado: boolean; completo: boolean }> {
  const pr = (await db.progresoBloque.get(bloque)) ?? baseProgresoBloque(bloque)
  pr.notas = { ...(pr.notas ?? {}), [habilidad]: nota }
  const notas = pr.notas
  // Las 6 secciones del bloque: vocabulario y gramática acumulados + las 4 destrezas.
  const SECCIONES = ['vocab', 'gramatica', 'listening', 'reading', 'writing', 'speaking'] as const
  const completo = SECCIONES.every((s) => notas[s] !== undefined)
  let aprobado = false
  if (completo) {
    const promedio = SECCIONES.reduce((suma, s) => suma + (notas[s] ?? 0), 0) / SECCIONES.length
    aprobado = promedio >= 75
    pr.intentos += 1
    if (aprobado) pr.estado = 'aprobado'
    await registrarHistorial('bloque', bloque, Math.round(promedio), aprobado)
  }
  await db.progresoBloque.put(pr)
  return { notas, aprobado, completo }
}

export async function reiniciarNotasBloque(bloque: number) {
  const pr = (await db.progresoBloque.get(bloque)) ?? baseProgresoBloque(bloque)
  pr.notas = {}
  await db.progresoBloque.put(pr)
}

// --- Examen final A1 ---

export async function estadoExamenFinal(): Promise<{ disponible: boolean; bloquesFaltantes: number[] }> {
  const bloques = [1, 2, 3, 4]
  const progresos = await db.progresoBloque.bulkGet(bloques)
  const bloquesFaltantes = bloques.filter((b, i) => progresos[i]?.estado !== 'aprobado')
  return { disponible: bloquesFaltantes.length === 0, bloquesFaltantes }
}

function baseProgresoNivel(): ProgresoNivel {
  return { id: 'A1', estado: 'en_curso', intentos: 0 }
}

export async function getProgresoNivel(): Promise<ProgresoNivel | undefined> {
  return db.progresoNivel.get('A1')
}

// Gate: 85% vocabulario, 80% habilidades → nivel certificado.
export async function registrarExamenFinal(
  notaVocab: number,
  notaGramatica: number,
  notaHabilidades: number
): Promise<boolean> {
  const aprobado = notaVocab >= 85 && notaGramatica >= 80 && notaHabilidades >= 80
  const pr = (await db.progresoNivel.get('A1')) ?? baseProgresoNivel()
  pr.intentos += 1
  pr.notaVocab = Math.max(pr.notaVocab ?? 0, notaVocab)
  pr.notaGramatica = Math.max(pr.notaGramatica ?? 0, notaGramatica)
  pr.notaHabilidades = Math.max(pr.notaHabilidades ?? 0, notaHabilidades)
  if (aprobado) pr.estado = 'aprobado'
  await db.progresoNivel.put(pr)
  await registrarHistorial('final', 'A1', Math.round((notaVocab + notaGramatica + notaHabilidades) / 3), aprobado)
  return aprobado
}

// --- Historial y racha ---

export async function registrarHistorial(tipo: TipoExamenHistorial, ref: number | string, nota: number, aprobado: boolean) {
  await db.historialExamenes.add({ tipo, ref, fecha: Date.now(), nota, aprobado })
  // Todo examen pasa por aquí, así que es el sitio natural para subir el progreso a la
  // cuenta. Si no hay sesión iniciada no hace nada.
  sincronizarPronto()
}

export async function obtenerHistorial(): Promise<HistorialExamen[]> {
  return db.historialExamenes.orderBy('fecha').reverse().toArray()
}

export async function resumenPalabrasGlobal() {
  const todas = await db.palabras.toArray()
  return {
    dominadas: todas.filter((p) => p.estado === 'dominada').length,
    enRepaso: todas.filter((p) => p.estado === 'en_repaso').length,
    debiles: todas.filter((p) => p.fallosTotales >= 2).length,
    totalMarcadas: todas.length
  }
}

// Días consecutivos con actividad (palabra marcada o examen rendido), terminando hoy.
// Motivacional, nunca culpa: si no hay racha, simplemente es 0.
export async function calcularRacha(): Promise<number> {
  const [palabras, examenes] = await Promise.all([db.palabras.toArray(), db.historialExamenes.toArray()])
  const dias = new Set<number>()
  palabras.forEach((p) => {
    if (p.fechaAprendida) dias.add(inicioDeHoy(p.fechaAprendida))
  })
  examenes.forEach((e) => dias.add(inicioDeHoy(e.fecha)))
  let racha = 0
  let cursor = inicioDeHoy()
  while (dias.has(cursor)) {
    racha++
    cursor -= UN_DIA
  }
  return racha
}

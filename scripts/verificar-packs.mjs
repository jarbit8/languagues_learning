#!/usr/bin/env node
// Coherencia de los data packs: cosas que no rompen el build pero sí un examen en marcha
// (una respuesta que no está entre las opciones, un "ordenar" cuyas fichas no forman la frase,
// un id de vocabulario duplicado, una respuesta modelo fuera del límite de palabras).
//
//   node scripts/verificar-packs.mjs
//
// Sale con código 1 si encuentra algo.

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(RAIZ, 'data')

// Los idiomas activos salen de src/config.ts para no tener dos fuentes de verdad. Lo del idioma
// inactivo se reporta igual, pero aparte y sin hacer fallar el script: no entra al bundle.
const IDIOMAS_ACTIVOS = [
  ...readFileSync(join(RAIZ, 'src', 'config.ts'), 'utf8')
    .match(/IDIOMAS_ACTIVOS[^=]*=\s*\[([^\]]*)\]/)[1]
    .matchAll(/'(\w+)'/g)
].map((m) => m[1])
const activo = (archivo) =>
  !/-(en|fr)\.json$/.test(archivo) || IDIOMAS_ACTIVOS.some((i) => archivo.endsWith(`-${i}.json`))

const packs = (sub, filtro = () => true) =>
  readdirSync(join(DATA, sub))
    .filter((f) => f.endsWith('.json') && filtro(f))
    .sort()
    .map((f) => ({ archivo: `${sub}/${f}`, pack: JSON.parse(readFileSync(join(DATA, sub, f), 'utf8')) }))

const problemas = []
const mal = (archivo, donde, que) => problemas.push({ archivo, donde, que })

// La corrección es tolerante (ver lib/normaliza.ts): al comparar aquí se hace lo mismo.
const norm = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim()

function revisarOpcionMultiple(archivo, donde, o) {
  if (!o.opciones?.length) return mal(archivo, donde, 'opción múltiple sin opciones')
  if (!o.opciones.some((x) => norm(x) === norm(o.respuesta)))
    mal(archivo, donde, `la respuesta "${o.respuesta}" no está entre las opciones`)
  // Sin quitar tildes: en francés "télécharge" y "téléchargé" son opciones distintas a propósito.
  if (new Set(o.opciones.map((x) => String(x).toLowerCase().trim())).size !== o.opciones.length)
    mal(archivo, donde, 'opciones repetidas')
}

// Aquí NO se pueden borrar guiones ni apóstrofes: una ficha del francés es "as-tu" o "l'eau",
// una sola pieza que el estudiante arrastra entera.
const ficha = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9'-]/g, '')

// Una ficha puede ser de varias palabras ("est-ce que"), así que no vale comparar palabra a
// palabra: se comprueba que cada ficha esté dentro de la frase y que entre todas la cubran
// exactamente, sin sobrar ni faltar nada.
function revisarOrdenar(archivo, donde, o) {
  if (!o.opciones?.length) return mal(archivo, donde, 'ordenar sin fichas')
  const frase = ficha(o.respuesta)
  const sueltas = o.opciones.filter((op) => !frase.includes(ficha(op)))
  if (sueltas.length) return mal(archivo, donde, `fichas que no están en la respuesta: ${sueltas.join(', ')}`)
  const largo = o.opciones.reduce((n, op) => n + ficha(op).length, 0)
  if (largo !== frase.length)
    mal(archivo, donde, `las fichas [${o.opciones.join(' · ')}] no forman exactamente "${o.respuesta}"`)
}

// --- Vocabulario ---
const vistos = new Map()
for (const { archivo, pack } of packs('vocabulario')) {
  if (!pack.conceptos?.length) mal(archivo, 'pack', 'sin conceptos')
  for (const c of pack.conceptos ?? []) {
    const donde = c.id ?? '(sin id)'
    if (vistos.has(c.id)) mal(archivo, donde, `id repetido (también en ${vistos.get(c.id)})`)
    vistos.set(c.id, archivo)
    const esperado = `t${String(pack.tema).padStart(2, '0')}`
    if (!c.id?.includes(esperado)) mal(archivo, donde, `el id no corresponde al tema ${pack.tema}`)
    for (const lado of ['en', 'fr']) {
      if (!c[lado]?.texto) mal(archivo, donde, `falta ${lado}.texto`)
      if (!c[lado]?.ejemplo) mal(archivo, donde, `falta ${lado}.ejemplo`)
    }
    if (!c.es) mal(archivo, donde, 'falta el lado en español')
  }
}

// --- Gramática ---
for (const { archivo, pack } of packs('gramatica')) {
  // 15 es el mínimo del diseño; algunos temas llevan más porque se les añadió gramática que
  // faltaba frente al sílabo estándar. El examen de tema los toma TODOS, así que de más no rompe.
  if ((pack.ejercicios?.length ?? 0) < 15)
    mal(archivo, 'pack', `${pack.ejercicios?.length ?? 0} ejercicios (el mínimo es 15)`)
  pack.ejercicios?.forEach((e, i) => {
    const donde = `ejercicio ${i + 1}`
    if (!e.respuesta) return mal(archivo, donde, 'sin respuesta')
    if (e.tipo === 'opcion_multiple') revisarOpcionMultiple(archivo, donde, e)
    if (e.tipo === 'ordenar') revisarOrdenar(archivo, donde, e)
    if (e.tipo === 'hueco' && !e.enunciado.includes('___'))
      mal(archivo, donde, 'hueco sin ___ en el enunciado')
  })
  if (!pack.ejemplos?.length) mal(archivo, 'pack', 'sin ejemplos')
}

// --- Listening ---
const VF = ['verdadero', 'falso']
const VFND = ['verdadero', 'falso', 'no dice']
for (const { archivo, pack } of packs('listening')) {
  pack.dialogos?.forEach((d, i) => {
    if (!d.lineas?.length) mal(archivo, `diálogo ${i + 1}`, 'sin líneas')
    d.preguntas?.forEach((q, j) => {
      const donde = `diálogo ${i + 1} pregunta ${j + 1}`
      if (q.tipo === 'opcion_multiple') revisarOpcionMultiple(archivo, donde, q)
      if (q.tipo === 'vf' && !VF.includes(norm(q.respuesta)))
        mal(archivo, donde, `respuesta v/f inválida: "${q.respuesta}"`)
      if (q.tipo === 'anota_la_hora' && !/^\d{1,2}:\d{2}$/.test(q.respuesta))
        mal(archivo, donde, `hora mal formada: "${q.respuesta}"`)
    })
    if (d.preguntas?.length !== 5) mal(archivo, `diálogo ${i + 1}`, `${d.preguntas?.length ?? 0} preguntas (se esperan 5)`)
  })
}

// --- Reading ---
for (const { archivo, pack } of packs('reading')) {
  pack.textos?.forEach((t, i) => {
    if (!t.texto) mal(archivo, `texto ${i + 1}`, 'vacío')
    t.preguntas?.forEach((q, j) => {
      const donde = `texto ${i + 1} pregunta ${j + 1}`
      if (q.tipo === 'opcion_multiple') revisarOpcionMultiple(archivo, donde, q)
      if (q.tipo === 'vf' && !VF.includes(norm(q.respuesta)))
        mal(archivo, donde, `respuesta v/f inválida: "${q.respuesta}"`)
      if (q.tipo === 'vfnd' && !VFND.includes(norm(q.respuesta)))
        mal(archivo, donde, `respuesta v/f/no dice inválida: "${q.respuesta}"`)
    })
    // El examen de bloque y el final toman siempre textos[0]: ese no puede quedarse corto.
    if (i === 0 && (t.preguntas?.length ?? 0) < 5)
      mal(archivo, 'texto 1', `${t.preguntas?.length ?? 0} preguntas (los exámenes usan este texto)`)
  })
}

// --- Writing ---
for (const { archivo, pack } of packs('writing')) {
  pack.consignas?.forEach((c, i) => {
    const donde = `consigna ${i + 1}`
    const n = c.respuestaModelo?.trim().split(/\s+/).length ?? 0
    if (!c.respuestaModelo) mal(archivo, donde, 'sin respuesta modelo')
    else if (n < c.minPalabras || n > c.maxPalabras)
      mal(archivo, donde, `la respuesta modelo tiene ${n} palabras y el límite es ${c.minPalabras}-${c.maxPalabras}`)
    if (!c.checklist?.length) mal(archivo, donde, 'sin checklist de autoevaluación')
  })
}

function listar(titulo, lista) {
  if (!lista.length) return
  console.log(`${titulo}\n`)
  let ultimo = null
  for (const p of lista) {
    if (p.archivo !== ultimo) { console.log(`  ${p.archivo}`); ultimo = p.archivo }
    console.log(`    ${p.donde}: ${p.que}`)
  }
  console.log()
}

const bloquean = problemas.filter((p) => activo(p.archivo))
const informativos = problemas.filter((p) => !activo(p.archivo))

console.log(`Idiomas activos: ${IDIOMAS_ACTIVOS.join(', ')}\n`)
if (bloquean.length === 0) console.log('OK — los data packs de los idiomas activos son coherentes.\n')
listar(`${bloquean.length} problemas:`, bloquean)
listar(
  `${informativos.length} problemas en idiomas INACTIVOS (no entran al bundle; se arreglan si se reactivan):`,
  informativos
)
process.exit(bloquean.length > 0 ? 1 : 0)

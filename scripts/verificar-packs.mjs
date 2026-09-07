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

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')

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
  // Sin quitar tildes: pueden ser justo lo que distingue dos opciones.
  if (new Set(o.opciones.map((x) => String(x).toLowerCase().trim())).size !== o.opciones.length)
    mal(archivo, donde, 'opciones repetidas')
}

// Aquí NO se pueden borrar guiones ni apóstrofes: "t-shirt" o "don't" son una sola pieza
// que el estudiante arrastra entera.
const ficha = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9'-]/g, '')

// Una ficha puede ser de varias palabras, así que no vale comparar palabra a palabra: se
// comprueba que cada ficha esté dentro de la frase y que entre todas la cubran exactamente.
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
    if (!c.texto) mal(archivo, donde, 'falta la palabra en inglés')
    if (!c.ejemplo) mal(archivo, donde, 'falta el ejemplo')
    if (!c.es) mal(archivo, donde, 'falta el significado en español')
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
    // 3 a 5 preguntas. Desde el 2026-08-30 el usuario hace DOS diálogos por día y el módulo
    // de escuchar tiene un presupuesto de 5 minutos: con 5 preguntas cada uno no cabe, así que
    // los diálogos nuevos llevan 3. Los viejos siguen con 5 y también valen.
    const nq = d.preguntas?.length ?? 0
    if (nq < 3 || nq > 5) mal(archivo, `diálogo ${i + 1}`, `${nq} preguntas (se esperan entre 3 y 5)`)
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

// --- Pronunciación ---
// Era el único módulo de contenido sin verificador. NO puede pasar por el de vocabulario:
// usa a propósito palabras fuera del temario (sink, fin, tree) porque entrena SONIDOS, no
// léxico — cada ejemplo trae su traducción al español. Lo que sí debe cumplir es su forma.
for (const { archivo, pack } of packs('pronunciacion')) {
  const ids = new Set()
  pack.grupos?.forEach((g, i) => {
    const donde = `grupo ${g.id ?? i + 1}`
    if (!g.id) mal(archivo, donde, 'sin id')
    else if (ids.has(g.id)) mal(archivo, donde, 'id repetido')
    else ids.add(g.id)
    for (const campo of ['titulo', 'dificultad', 'explicacion', 'truco'])
      if (!String(g[campo] ?? '').trim()) mal(archivo, donde, `sin ${campo}`)
    if (!g.ejemplos?.length) mal(archivo, donde, 'sin ejemplos que escuchar')
    // El tipo GrupoPron declara `pares` obligatorio pero el JSON no pasa por TypeScript:
    // un grupo sin la clave reventaba la pantalla entera al leer `grupo.pares.length`.
    // Los grupos sin entrenador llevan `pares: []`, nunca la clave ausente.
    if (!Array.isArray(g.pares)) mal(archivo, donde, 'sin la clave `pares` (usa [] si no tiene entrenador)')
    // `patron` decide si el consejo de este grupo sale en la tarjeta de una palabra.
    // Un patrón que no compila dejaría al grupo mudo sin que nadie se entere.
    if (g.patron !== undefined) {
      try {
        new RegExp(g.patron)
      } catch (e) {
        mal(archivo, donde, `patrón inválido (${e.message})`)
      }
      if (typeof g.prioridad !== 'number') mal(archivo, donde, 'tiene `patron` pero no `prioridad`')
    }
    g.ejemplos?.forEach((e, j) => {
      for (const campo of ['palabra', 'pron', 'es'])
        if (!String(e[campo] ?? '').trim()) mal(archivo, `${donde}, ejemplo ${j + 1}`, `sin ${campo}`)
    })
    // El entrenador de oído suena una de las dos y hay que acertar cuál: si ambas son la
    // misma palabra, la ronda es imposible de fallar y también de acertar a propósito.
    g.pares?.forEach((par, j) => {
      const dondePar = `${donde}, par ${j + 1}`
      for (const lado of ['a', 'b']) {
        if (!par[lado]) { mal(archivo, dondePar, `sin lado ${lado}`); continue }
        for (const campo of ['palabra', 'es'])
          if (!String(par[lado][campo] ?? '').trim()) mal(archivo, dondePar, `lado ${lado} sin ${campo}`)
      }
      if (par.a?.palabra && norm(par.a.palabra) === norm(par.b?.palabra))
        mal(archivo, dondePar, `las dos palabras del par son la misma ("${par.a.palabra}")`)
    })
  })
}

// --- Expresiones ---
// Como pronunciación y rúbrica, NO pasa por el verificador de vocabulario: usa a propósito
// palabras de fuera del temario (sleepy, hurry, cake) porque enseña frases hechas, no léxico.
// Lo que sí se vigila es que cada ficha esté completa, que el `literal` diga algo DISTINTO
// del significado —si coinciden, la frase no era de las que engañan y la ficha sobra— y que
// el tema al que se ancla exista.
const totalTemas = packs('vocabulario').length
for (const { archivo, pack } of packs('expresiones')) {
  const textos = new Set()
  pack.grupos?.forEach((g, i) => {
    const grupo = g.titulo ?? `grupo ${i + 1}`
    if (!String(g.nota ?? '').trim()) mal(archivo, grupo, 'sin nota que explique el patrón')
    if (!g.expresiones?.length) mal(archivo, grupo, 'sin expresiones')
    for (const e of g.expresiones ?? []) {
      const donde = `${grupo} · ${e.texto ?? '(sin texto)'}`
      for (const campo of ['texto', 'es', 'literal', 'pron', 'ejemplo'])
        if (!String(e[campo] ?? '').trim()) mal(archivo, donde, `sin ${campo}`)
      // Sin nivel la pantalla aparenta que todo lo que hay dentro es del nivel en curso, que
      // es justo al revés: solo 14 de las 68 son A1.
      if (!['A1', 'A2', 'B1', 'B2'].includes(e.nivel)) mal(archivo, donde, `nivel inválido: ${e.nivel}`)
      if (textos.has(e.texto)) mal(archivo, donde, 'expresión repetida')
      else textos.add(e.texto)
      if (e.literal && norm(e.literal) === norm(e.es))
        mal(archivo, donde, 'el literal y el significado son el mismo: no engaña a nadie')
      if (!(e.tema >= 1 && e.tema <= totalTemas)) mal(archivo, donde, `tema fuera de rango: ${e.tema}`)
      // El ejemplo lleva la expresión CONJUGADA y con complementos por medio ("she looks
      // after her brother", "that phone costs an arm and a leg"), así que buscar la frase
      // entera marcaría media lista. Con la última palabra basta para cazar lo que importa:
      // un ejemplo pegado de otra ficha.
      const cierre = norm(e.texto ?? '').split(' ').pop()
      if (e.ejemplo && cierre && !norm(e.ejemplo).split(' ').includes(cierre))
        mal(archivo, donde, `el ejemplo no menciona "${cierre}"`)
    }
  })
}

// --- Deletreo ---
// El audio se arma letra a letra desde `texto`, asi que un espacio o un guion dentro se
// convierte en una letra que nadie puede escribir. En el escalon 3 la frase TIENE que llevar
// el hueco {}: sin el, la palabra no se deletrea por ningun lado y la pregunta no tiene
// respuesta posible.
for (const { archivo, pack } of packs('deletreo')) {
  const vistos = new Set()
  for (const it of pack.items ?? []) {
    const donde = it.texto ?? '(sin texto)'
    for (const campo of ['texto', 'es']) if (!String(it[campo] ?? '').trim()) mal(archivo, donde, `sin ${campo}`)
    if (!/^[A-Za-z]+$/.test(it.texto ?? '')) mal(archivo, donde, 'el texto debe ser una sola palabra de letras')
    if (![1, 2, 3].includes(it.escalon)) mal(archivo, donde, `escalón inválido: ${it.escalon}`)
    if (it.escalon === 1 && (it.texto ?? '').length !== 1)
      mal(archivo, donde, 'el escalón 1 es de letras sueltas')
    if (it.escalon === 3 && !String(it.frase ?? '').includes('{}'))
      mal(archivo, donde, 'el escalón 3 necesita una frase con {}')
    if (it.escalon !== 3 && it.frase) mal(archivo, donde, 'solo el escalón 3 lleva frase')
    if (!(it.tema >= 1 && it.tema <= totalTemas)) mal(archivo, donde, `tema fuera de rango: ${it.tema}`)
    const clave = `${it.escalon}:${norm(it.texto ?? '')}`
    if (vistos.has(clave)) mal(archivo, donde, 'repetido en el mismo escalón')
    else vistos.add(clave)
  }
  // Una sesion pide 3 letras + 4 palabras + 2 frases: con menos, se repite dentro de la
  // misma tanda y se nota.
  for (const [escalon, minimo] of [[1, 3], [2, 4], [3, 2]]) {
    const n = (pack.items ?? []).filter((i) => i.escalon === escalon && i.tema === 1).length
    if (n < minimo) mal(archivo, `escalón ${escalon}`, `solo ${n} ítems desde el tema 1, hacen falta ${minimo}`)
  }
}

// --- Abreviaciones ---
// Fuera del verificador de vocabulario a proposito, como las expresiones: enseña 'gonna',
// 'y'all' y 'brb', que no son ni pretenden ser lexico del temario. Lo que si se vigila es que
// cada ficha este entera, que los ids no choquen —son la clave de la tabla de Dexie donde se
// guarda "la se", asi que un id repetido marcaria dos fichas a la vez— y que el aviso de
// escritura sea uno de los cuatro que la pantalla sabe pintar.
const AVISOS = ['se escriben', 'solo hablando', 'nunca se escriben', 'solo en chats']
for (const { archivo, pack } of packs('abreviaciones')) {
  const ids = new Set()
  for (const g of pack.grupos ?? []) {
    const grupo = g.titulo ?? '(sin titulo)'
    if (!String(g.nota ?? '').trim()) mal(archivo, grupo, 'sin nota')
    if (!AVISOS.includes(g.escritura)) mal(archivo, grupo, `aviso de escritura invalido: ${g.escritura}`)
    if (!g.items?.length) mal(archivo, grupo, 'sin items')
    for (const it of g.items ?? []) {
      const donde = `${grupo} · ${it.texto ?? '(sin texto)'}`
      for (const campo of ['id', 'texto', 'es', 'pron', 'ejemplo'])
        if (!String(it[campo] ?? '').trim()) mal(archivo, donde, `sin ${campo}`)
      if (ids.has(it.id)) mal(archivo, donde, `id repetido: ${it.id}`)
      else ids.add(it.id)
      if (it.de && norm(it.de) === norm(it.texto ?? '')) mal(archivo, donde, 'la forma larga es igual que la corta')
    }
  }
}

// SESGO DE POSICION: si la opcion correcta cae casi siempre la primera, el examen se
// aprueba sin leer el texto. Paso el 2026-09-03: 94% de 557 preguntas la tenian en la
// primera posicion. La app solo baraja los ejercicios de 'ordenar', asi que el orden del
// JSON es el que se ve; se reordeno el dato y esto vigila que no vuelva a desviarse.
{
  const cuenta = []
  const contar = (q) => {
    if (q?.tipo !== 'opcion_multiple' || !Array.isArray(q.opciones) || q.opciones.length < 3) return
    const i = q.opciones.indexOf(q.respuesta)
    if (i >= 0) cuenta[i] = (cuenta[i] ?? 0) + 1
  }
  for (const { pack } of packs('reading', (f) => f.endsWith('-en.json')))
    for (const t of pack.textos ?? []) for (const q of t.preguntas ?? []) contar(q)
  for (const { pack } of packs('listening', (f) => f.endsWith('-en.json')))
    for (const d of pack.dialogos ?? []) for (const q of d.preguntas ?? []) contar(q)
  for (const { pack } of packs('gramatica', (f) => f.endsWith('-en.json')))
    for (const e of pack.ejercicios ?? []) contar(e)

  const total = cuenta.reduce((a, b) => a + (b ?? 0), 0)
  if (total >= 50) {
    const mayor = Math.max(...cuenta.map((c) => c ?? 0))
    const pct = Math.round((mayor / total) * 100)
    // Con 3-4 opciones lo esperable es 25-33%. Se avisa a partir de 45%.
    if (pct > 45)
      mal('(todos los packs)', 'opción múltiple',
        `el ${pct}% de las respuestas correctas cae en la misma posición (${total} preguntas): se aprueba sin leer`)
  }
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

if (problemas.length === 0) console.log('OK — los data packs son coherentes.')
listar(`${problemas.length} problemas:`, problemas)
process.exit(problemas.length > 0 ? 1 : 0)

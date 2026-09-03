#!/usr/bin/env node
// Complemento de verificar-vocabulario.mjs. Ese caza el vocabulario ADELANTADO (una palabra
// de un tema futuro); este caza el que NO SE ENSEÑA NUNCA, que se le escapaba: "throat",
// "drums" o "airplane" no son de ningún tema, así que pasaban sin avisar. Encontrado el
// 2026-09-03 revisando el A1 entero: había 97.
//
//   node scripts/verificar-nunca.mjs
//
// Sale con código 1 si aparece una palabra inglesa que no está en ningún tema ni en las
// listas de abajo.

import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(RAIZ, 'data')
const leer = (...p) => JSON.parse(readFileSync(join(DATA, ...p), 'utf8'))
const T = (n) => String(n).padStart(2, '0')

// Palabras gramaticales: se dan por sabidas, igual que en verificar-vocabulario.mjs.
const FUNCION = new Set(`
a an the i you he she it we they me him her us them my your his its our their mine yours hers theirs
this that these those there here am is are was were be been being do does did done have has had having
will would shall should can could may might must going gonna let lets not no nor
and or but so because if when while where what who whom whose which why how than then also too very
much many more most less least all any some none each every both either neither other another same
to of in on at for with from by about as into onto up down out off over under again only just still yet
ever never always sorry ok okay oh ah well hmm please yes hello hi bye
one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen
seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand
first second third fourth fifth sixth seventh eighth ninth tenth mr mrs miss ms
`.trim().split(/\s+/))

const PROPIOS = new Set(`
ana paul laura maria marie sofia lee marc jarbit joel reinoso smith
lima arequipa peru canada france england spain germany toronto vancouver montreal quebec ottawa
london paris madrid america europe usa york jorge rosa luis max tom
monday tuesday wednesday thursday friday saturday sunday
january february march april may june july august september october november december
english spanish peruvian canadian german
`.trim().split(/\s+/))

// ANDAMIAJE: palabras que el contenido usa pero que no tienen tarjeta propia. Se aceptan a
// propósito, no por descuido. Son de tres clases:
//   · las que se absorben del contexto sin enseñarlas (long, man, great, of course, know);
//   · formas derivadas de una palabra que SÍ se enseña (hotter de hot, women de woman,
//     taken/eaten/gone, que además se practican en la gramática de su tema);
//   · las que solo salen en el EJEMPLO de una tarjeta, donde una palabra nueva es exposición,
//     no evaluación (comfortable en "The sofa is comfortable.").
// Si aquí entra una palabra que sale en un texto de examen, mejor darle tarjeta o cambiarla.
const ANDAMIAJE = new Set(`
long man men woman women boy girl people person great course help helps know think bit
ask asks until else wait waiting ready give high low use useful helpful simple close
comfortable famous quiet interesting heavy hard life human through tonight forgot perfect
lesson season seasons hotter hottest stiff madam sir taken eaten gone
`.trim().split(/\s+/))

const IRREGULARES = {
  was: 'be', were: 'be', am: 'be', is: 'be', are: 'be', been: 'be',
  took: 'take', went: 'go', came: 'come', ate: 'eat', drank: 'drink', had: 'have', has: 'have',
  made: 'make', feet: 'foot', teeth: 'tooth', children: 'child', mice: 'mouse', knives: 'knife',
  bought: 'buy', sold: 'sell', paid: 'pay', left: 'leave', felt: 'feel', ran: 'run', sang: 'sing',
  swam: 'swim', flew: 'fly', sent: 'send', spent: 'spend', wore: 'wear', lost: 'lose', won: 'win',
  wrote: 'write', gave: 'give', found: 'find', told: 'tell', knew: 'know', thought: 'think',
  drove: 'drive', slept: 'sleep', spoke: 'speak', taught: 'teach', understood: 'understand',
  got: 'get', saw: 'see', said: 'say', stopped: 'stop'
}
const CONTRACCIONES = {
  "i'm": 'i', "you're": 'you', "he's": 'he', "she's": 'she', "it's": 'it', "we're": 'we',
  "they're": 'they', "that's": 'that', "there's": 'there', "here's": 'here', "what's": 'what',
  "where's": 'where', "who's": 'who', "how's": 'how', "let's": 'let', "don't": 'do',
  "doesn't": 'does', "didn't": 'did', "isn't": 'is', "aren't": 'are', "wasn't": 'was',
  "weren't": 'were', "can't": 'can', "won't": 'will', "haven't": 'have', "hasn't": 'has',
  "i've": 'i', "i'll": 'i', "i'd": 'i', "you'll": 'you', "we'll": 'we', "they'll": 'they',
  "it'll": 'it'
}

const tokenizar = (s) =>
  (s.toLowerCase().match(/[a-z][a-z']*/g) ?? [])
    .map((t) => t.replace(/^'+|'+$/g, ''))
    .map((t) => CONTRACCIONES[t] ?? (t.endsWith("'s") ? t.slice(0, -2) : t))
    .filter(Boolean)

function bases(t) {
  const c = new Set([t])
  const add = (x) => x.length > 1 && c.add(x)
  if (IRREGULARES[t]) add(IRREGULARES[t])
  if (t.endsWith('ies')) add(t.slice(0, -3) + 'y')
  if (t.endsWith('es')) add(t.slice(0, -2))
  if (t.endsWith('s')) add(t.slice(0, -1))
  if (t.endsWith('ing')) { const r = t.slice(0, -3); add(r); add(r + 'e'); if (r.at(-1) === r.at(-2)) add(r.slice(0, -1)) }
  if (t.endsWith('ied')) add(t.slice(0, -3) + 'y')
  if (t.endsWith('ed')) { const r = t.slice(0, -2); add(r); add(t.slice(0, -1)); if (r.at(-1) === r.at(-2)) add(r.slice(0, -1)) }
  if (t.endsWith('est')) { add(t.slice(0, -3)); add(t.slice(0, -2)) }
  if (t.endsWith('er')) { add(t.slice(0, -2)); add(t.slice(0, -1)) }
  if (t.endsWith('ly')) add(t.slice(0, -2))
  return [...c]
}

const lexico = new Set()
for (const f of readdirSync(join(DATA, 'vocabulario')))
  for (const c of leer('vocabulario', f).conceptos)
    for (const w of tokenizar(c.texto)) lexico.add(w)
for (const g of leer('rubrica', 'en.json').grupos ?? [])
  for (const w of tokenizar(JSON.stringify(g))) lexico.add(w)

const conocida = (t) =>
  bases(t).some((b) => lexico.has(b) || FUNCION.has(b) || PROPIOS.has(b) || ANDAMIAJE.has(b))

const nuevas = new Map()
const ver = (donde, texto) => {
  if (!texto) return
  for (const t of tokenizar(texto))
    if (!conocida(t)) {
      if (!nuevas.has(t)) nuevas.set(t, [])
      const d = nuevas.get(t)
      if (d.length < 3) d.push(donde)
    }
}

// Solo campos que están en INGLÉS. Los enunciados de los temas 1-8 van en español, y las
// OPCIONES de los ejercicios de gramática llevan formas mal escritas a propósito
// ("worken", "cann't"): son el distractor, no vocabulario.
const PRIMER_TEMA_ENUNCIADO_EN = 9
for (let t = 1; t <= 24; t++) {
  const re = leer('reading', `tema-${T(t)}-en.json`)
  re.textos.forEach((x, i) => {
    ver(`reading/tema-${T(t)} · texto ${i + 1}`, x.texto)
    if (t >= PRIMER_TEMA_ENUNCIADO_EN)
      x.preguntas.forEach((q, k) => {
        ver(`reading/tema-${T(t)} · texto ${i + 1} pregunta ${k + 1}`, q.enunciado)
        ;(q.opciones ?? []).forEach((o) => ver(`reading/tema-${T(t)} · texto ${i + 1} pregunta ${k + 1} opción`, o))
      })
  })

  const li = leer('listening', `tema-${T(t)}-en.json`)
  li.dialogos.forEach((d, i) => {
    d.lineas.forEach((l, k) => ver(`listening/tema-${T(t)} · diálogo ${i + 1} línea ${k + 1}`, l.texto))
    d.preguntas.forEach((q, k) =>
      (q.opciones ?? []).forEach((o) => ver(`listening/tema-${T(t)} · diálogo ${i + 1} pregunta ${k + 1} opción`, o)))
  })

  const g = leer('gramatica', `tema-${T(t)}-en.json`)
  ;(g.ejemplos ?? []).forEach((e, i) =>
    ver(`gramatica/tema-${T(t)} · ejemplo ${i + 1}`, typeof e === 'string' ? e : e.en ?? e.frase ?? ''))
}
for (const f of readdirSync(join(DATA, 'vocabulario')))
  for (const c of leer('vocabulario', f).conceptos)
    ver(`vocabulario/${f} · ejemplo de "${c.texto}"`, c.ejemplo)
for (const f of readdirSync(join(DATA, 'writing')))
  for (const c of leer('writing', f).consignas)
    ver(`writing/${f} · respuesta modelo del tema ${c.tema}`, c.respuestaModelo)

if (nuevas.size === 0) {
  console.log('OK — el contenido no usa ninguna palabra que no se enseñe.')
  process.exit(0)
}
console.log(`${nuevas.size} palabras que no se enseñan en ningún tema:\n`)
for (const [w, donde] of [...nuevas].sort()) console.log(`  ${w}\n      ${donde.join('\n      ')}`)
console.log('\nO se le da tarjeta en su tema, o se cambia por una enseñada, o entra en ANDAMIAJE.')
process.exit(1)

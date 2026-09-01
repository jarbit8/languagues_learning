#!/usr/bin/env node
// Verifica la regla 7 de CLAUDE.md: el contenido de un tema solo puede usar vocabulario
// de ese tema y de los anteriores. A ojo se escapan (ej. "bag" es del T11 y se coló en el T7),
// así que cada vez que se escriba contenido nuevo hay que pasar esto.
//
//   node scripts/verificar-vocabulario.mjs                  // solo violaciones reales
//   node scripts/verificar-vocabulario.mjs --desconocidas    // + palabras fuera del léxico
//
// Sale con código 1 si hay violaciones.

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(RAIZ, 'data')
const leer = (...p) => JSON.parse(readFileSync(join(DATA, ...p), 'utf8'))
const packs = (sub, filtro = () => true) =>
  readdirSync(join(DATA, sub))
    .filter((f) => f.endsWith('.json') && filtro(f))
    .sort()
    .map((f) => ({ archivo: sub + '/' + f, pack: leer(sub, f) }))

// La regla habla de vocabulario de CONTENIDO (sustantivos, verbos, adjetivos). Pronombres,
// artículos, preposiciones y auxiliares se dan por sabidos: si no, cualquier frase del tema 1
// daría error. Los números están aquí porque se usan como cifras mucho antes del tema 2.
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
first second third fourth fifth sixth seventh eighth ninth tenth
mr mrs miss ms
`.trim().split(/\s+/))

// Nombres propios de la historia continua de las lecturas y de los diálogos.
const PROPIOS = new Set(`
ana paul laura maria marie sofia lee jarbit joel lima arequipa peru canada france england spain
toronto vancouver montreal quebec ottawa london paris madrid america europe usa york
monday tuesday wednesday thursday friday saturday sunday
january february march april may june july august september october november december
english spanish peruvian canadian german
`.trim().split(/\s+/))

// Desde este tema los enunciados de reading se escriben en INGLÉS (decisión del 2026-08-30):
// enunciado y pasaje en el mismo idioma, como en IELTS/TOEFL, porque emparejar las palabras de
// la pregunta con las del texto ES la habilidad que mide una pregunta de lectura; con el
// enunciado en español ese paso se regala. Es 9 y no 7 porque una pregunta wh- en presente
// simple necesita `does` ("What days does Ana work?") y el auxiliar se enseña en el tema 9:
// antes de ahí habría que contorsionar los enunciados o pre-enseñar `does` y pisar esa lección.
// Los temas 1-8 se quedan en español como rampa. Listening sigue en español en TODO A1 a
// propósito: ahí el material es audio y un enunciado en inglés le añade una tarea de lectura
// a una medición de escucha, justo en los exámenes que deciden el desbloqueo del tema.
const PRIMER_TEMA_ENUNCIADO_EN = 9

// VOCABULARIO DE RÚBRICA: las palabras con las que está escrito un enunciado de examen. Se
// enseñan aparte, en data/rubrica/en.json, en vez de gastar tarjetas de un tema. Sin esta lista
// el verificador marcaría "true" o "choose" como vocabulario adelantado. Solo vale para
// enunciados: en un diálogo o en un texto esas mismas palabras sí serían violación.
const RUBRICA = new Set(`
true false given choose complete write text according says say correct word answer question
title example each following best
`.trim().split(/\s+/))

// El reductor morfológico de abajo no adivina formas irregulares: sin esta tabla marcaría
// "took", "feet" o "children" como desconocidas (falsos positivos).
const IRREGULARES = {
  was: 'be', were: 'be', been: 'be', am: 'be', is: 'be', are: 'be',
  took: 'take', taken: 'take', bought: 'buy', met: 'meet', went: 'go', gone: 'go',
  came: 'come', got: 'get', gotten: 'get', ate: 'eat', eaten: 'eat', drank: 'drink', drunk: 'drink',
  said: 'say', saw: 'see', seen: 'see', made: 'make', had: 'have', has: 'have',
  felt: 'feel', left: 'leave', paid: 'pay', sold: 'sell', slept: 'sleep',
  spoke: 'speak', spoken: 'speak', understood: 'understand', taught: 'teach', learnt: 'learn',
  ran: 'run', sang: 'sing', sung: 'sing', swam: 'swim', swum: 'swim', flew: 'fly', flown: 'fly',
  sent: 'send', spent: 'spend', wore: 'wear', worn: 'wear', brought: 'bring',
  thought: 'think', knew: 'know', known: 'know', found: 'find', told: 'tell',
  gave: 'give', given: 'give', began: 'begin', chose: 'choose', drove: 'drive', driven: 'drive',
  kept: 'keep', lost: 'lose', won: 'win', wrote: 'write', written: 'write',
  feet: 'foot', teeth: 'tooth', children: 'child', men: 'man', women: 'woman',
  people: 'person', mice: 'mouse'
}

// Partir por el apóstrofe daría "don" / "isn" / "ca". Se mapean a mano.
const CONTRACCIONES = {
  "i'm": 'i', "you're": 'you', "he's": 'he', "she's": 'she', "it's": 'it', "we're": 'we',
  "they're": 'they', "that's": 'that', "there's": 'there', "here's": 'here', "what's": 'what',
  "where's": 'where', "who's": 'who', "how's": 'how', "let's": 'let',
  "don't": 'do', "doesn't": 'does', "didn't": 'did', "isn't": 'is', "aren't": 'are',
  "wasn't": 'was', "weren't": 'were', "can't": 'can', "won't": 'will', "haven't": 'have',
  "hasn't": 'has', "hadn't": 'had', "shouldn't": 'should', "wouldn't": 'would',
  "couldn't": 'could', "mustn't": 'must', "i've": 'i', "i'll": 'i', "i'd": 'i',
  "you've": 'you', "you'll": 'you', "you'd": 'you', "we've": 'we', "we'll": 'we',
  "they've": 'they', "they'll": 'they', "he'll": 'he', "she'll": 'she', "it'll": 'it'
}

function tokenizar(texto) {
  return (texto.toLowerCase().match(/[a-z][a-z']*/g) ?? [])
    .map((t) => t.replace(/^'+|'+$/g, ''))
    .filter(Boolean)
    .map((t) => CONTRACCIONES[t] ?? (t.endsWith("'s") ? t.slice(0, -2) : t))
    .filter(Boolean)
}

// Formas base candidatas: plural, 3ª persona, gerundio, pasado regular, comparativo.
function bases(t) {
  const c = new Set([t])
  const add = (x) => x.length > 1 && c.add(x)
  if (IRREGULARES[t]) add(IRREGULARES[t])
  if (t.endsWith('ies')) add(t.slice(0, -3) + 'y')
  if (t.endsWith('es')) add(t.slice(0, -2))
  if (t.endsWith('s')) add(t.slice(0, -1))
  if (t.endsWith('ing')) {
    const r = t.slice(0, -3)
    add(r)
    add(r + 'e')
    if (r.length > 2 && r.at(-1) === r.at(-2)) add(r.slice(0, -1))
  }
  if (t.endsWith('ied')) add(t.slice(0, -3) + 'y')
  if (t.endsWith('ed')) {
    const r = t.slice(0, -2)
    add(r)
    add(t.slice(0, -1))
    if (r.length > 2 && r.at(-1) === r.at(-2)) add(r.slice(0, -1))
  }
  if (t.endsWith('est')) { add(t.slice(0, -3)); add(t.slice(0, -2)) }
  if (t.endsWith('er')) { add(t.slice(0, -2)); add(t.slice(0, -1)) }
  if (t.endsWith('ly')) add(t.slice(0, -2))
  return [...c]
}

// --- Léxico: palabra -> primer tema en que aparece ---
const primerTema = new Map()
for (const { pack } of packs('vocabulario')) {
  for (const c of pack.conceptos) {
    for (const w of tokenizar(c.texto)) {
      if (!primerTema.has(w) || primerTema.get(w) > pack.tema) primerTema.set(w, pack.tema)
    }
  }
}

function temaDe(token) {
  let min
  for (const b of bases(token)) {
    const t = primerTema.get(b)
    if (t !== undefined && (min === undefined || t < min)) min = t
  }
  return min
}

// Se mira también contra las formas base: si no, el "dos" español reduce a "do" y se
// reportaría como palabra del tema 6.
const exento = (token) => bases(token).some((b) => FUNCION.has(b) || PROPIOS.has(b))

// Los enunciados llevan pistas en español entre paréntesis ("It's half ___ seven. (y media)").
const sinParentesis = (t) => t.replace(/\([^)]*\)/g, ' ')

// Se comprueba por tres vías, porque cada una sola falla en un sentido: buscar español se le
// escapaba "No dejan propina." (sin tildes ni ¿¡), y exigir una funcional inglesa marcaba
// "Laura likes football." (no tiene ninguna). La tercera vía —¿alguna palabra está en el
// léxico inglés del curso?— es la que resuelve ese caso. Ojo: la "a" y el "no" sueltos NO
// pueden ser marca de inglés, son también palabras españolas.
const MARCA_EN =
  /\b(the|an|is|are|was|were|does|do|did|has|have|what|who|where|when|why|which|how|and|of|to|in|on|at|for|with|from|she|he|they|it|you|not|given|true|false|there|this|that|these|those|his|her|its|their|every|some|any|one|two|three|first|then|also)\b/i

// Palabras que solo existen en español; ninguna es a la vez una palabra inglesa.
const SOLO_ES = new Set(`
de del que es esta este estan son tiene tienen hay para por con una uno unos unas
su sus al lo le se cuando donde como cuanto cuantos cuantas quien cual cuales
verdadero falso dice dicen dejan ella ellos ellas nunca siempre segun mucho mucha
en ya mas muy pero sin sobre entre desde hasta cada todo toda todos todas otro otra
ese esa esos esas aquel primer proximo pasado 
`.trim().split(/\s+/))

const pareceEspanol = (t) => {
  const palabras = t.toLowerCase().split(/[^a-záéíóúñü]+/).filter(Boolean)
  if (/[¿¡ñ]/i.test(t)) return true
  if (palabras.some((w) => SOLO_ES.has(w))) return true
  if (MARCA_EN.test(t)) return false
  // Las tildes solas no bastan: "The café is expensive." es inglés. Solo deciden cuando
  // no hay ninguna marca inglesa, que es el caso de "Marie pide un café."
  if (/[áéíóú]/i.test(t)) return true
  // Sin funcionales inglesas: vale con que alguna palabra esté en el léxico del curso.
  return !palabras.some((w) => temaDe(w) !== undefined)
}

// Enunciados que deberían estar en inglés y siguen en español (ver PRIMER_TEMA_ENUNCIADO_EN).
const sinConvertir = []

// --- Todo el contenido en inglés, con el tema al que pertenece ---
const objetivos = []
const push = (archivo, tema, donde, texto, rubrica = false) =>
  texto && objetivos.push({ archivo, tema, donde, texto, rubrica })

for (const { archivo, pack } of packs('vocabulario')) {
  pack.conceptos.forEach((c, i) =>
    push(archivo, pack.tema, `ejemplo ${i + 1} (${c.texto})`, c.ejemplo))
}
for (const { archivo, pack } of packs('gramatica', (f) => f.endsWith('-en.json'))) {
  pack.ejemplos.forEach((e, i) => push(archivo, pack.tema, `ejemplo ${i + 1}`, e.frase))
  pack.ejercicios.forEach((e, i) => {
    // En "traducir" y "ordenar" el enunciado es la frase en español de origen: lo que hay
    // que revisar es la respuesta en inglés.
    if (e.tipo !== 'traducir' && e.tipo !== 'ordenar') {
      push(archivo, pack.tema, `ejercicio ${i + 1} enunciado`, sinParentesis(e.enunciado))
    }
    ;(e.opciones ?? []).forEach((o, j) =>
      push(archivo, pack.tema, `ejercicio ${i + 1} opción ${j + 1}`, o))
    push(archivo, pack.tema, `ejercicio ${i + 1} respuesta`, e.respuesta)
  })
}
for (const { archivo, pack } of packs('listening', (f) => f.endsWith('-en.json'))) {
  pack.dialogos.forEach((d, i) => {
    d.lineas.forEach((l, j) => push(archivo, pack.tema, `diálogo ${i + 1} línea ${j + 1}`, l.texto))
    d.preguntas.forEach((p, j) => {
      ;(p.opciones ?? []).forEach((o, k) =>
        push(archivo, pack.tema, `diálogo ${i + 1} pregunta ${j + 1} opción ${k + 1}`, o))
      push(archivo, pack.tema, `diálogo ${i + 1} pregunta ${j + 1} respuesta`, p.respuesta)
    })
  })
}
for (const { archivo, pack } of packs('reading', (f) => f.endsWith('-en.json'))) {
  pack.textos.forEach((t, i) => {
    push(archivo, pack.tema, `texto ${i + 1}`, t.texto)
    t.preguntas.forEach((p, j) => {
      ;(p.opciones ?? []).forEach((o, k) =>
        push(archivo, pack.tema, `texto ${i + 1} pregunta ${j + 1} opción ${k + 1}`, o))
      // El enunciado solo se revisa donde ya va en inglés; en los temas 1-6 es español y
      // meterlo aquí llenaría el informe de falsos positivos ("hospital", "taxi", "chocolate"
      // se escriben igual en los dos idiomas y saldrían como vocabulario adelantado).
      if (pack.tema >= PRIMER_TEMA_ENUNCIADO_EN) {
        push(archivo, pack.tema, `texto ${i + 1} pregunta ${j + 1} enunciado`, p.enunciado, true)
        // Red contra el olvido: si queda un enunciado en español por encima del corte, avisa.
        // Convertir 90 enunciados a mano y dejarse tres es el error más fácil de cometer aquí.
        if (pareceEspanol(p.enunciado ?? '')) {
          sinConvertir.push(`${archivo} · texto ${i + 1} pregunta ${j + 1}: ${p.enunciado}`)
        }
      }
    })
  })
}
// El writing es por bloque: su tope de vocabulario es el último tema del bloque.
for (const { archivo, pack } of packs('writing', (f) => f.endsWith('-en.json'))) {
  pack.consignas.forEach((c, i) =>
    push(archivo, pack.bloque * 6, `consigna ${i + 1} respuesta modelo`, c.respuestaModelo))
}

// --- Verificar ---
const verDesconocidas = process.argv.includes('--desconocidas')
const violaciones = []
const desconocidas = new Map()

for (const o of objetivos) {
  for (const token of tokenizar(o.texto)) {
    if (exento(token)) continue
    if (o.rubrica && bases(token).some((b) => RUBRICA.has(b))) continue
    const t = temaDe(token)
    if (t === undefined) {
      if (!desconocidas.has(token)) desconocidas.set(token, [])
      desconocidas.get(token).push(`${o.archivo} · ${o.donde}`)
    } else if (t > o.tema) {
      violaciones.push({ ...o, token, temaPalabra: t })
    }
  }
}

const porArchivo = new Map()
for (const v of violaciones) {
  if (!porArchivo.has(v.archivo)) porArchivo.set(v.archivo, [])
  porArchivo.get(v.archivo).push(v)
}

console.log(`Léxico: ${primerTema.size} palabras · ${objetivos.length} fragmentos de inglés revisados\n`)

if (porArchivo.size === 0) {
  console.log('OK — ningún contenido usa vocabulario de temas futuros.')
} else {
  console.log(`${violaciones.length} violaciones en ${porArchivo.size} archivos:\n`)
  for (const [archivo, vs] of [...porArchivo].sort()) {
    console.log(`  ${archivo} (tema ${vs[0].tema})`)
    for (const v of vs) console.log(`    "${v.token}" es del tema ${v.temaPalabra} -> ${v.donde}`)
    console.log()
  }
}

if (sinConvertir.length) {
  console.log(`
${sinConvertir.length} enunciados de reading siguen en español por encima del tema ${PRIMER_TEMA_ENUNCIADO_EN}:
`)
  for (const e of sinConvertir) console.log(`  ${e}`)
  console.log()
}

if (verDesconocidas) {
  const orden = [...desconocidas].sort((a, b) => b[1].length - a[1].length)
  console.log(`\n-- ${orden.length} palabras fuera del léxico (revisar a mano: aquí caen los`)
  console.log('   nombres propios nuevos y el español de los enunciados de gramática) --\n')
  for (const [w, donde] of orden) console.log(`  ${w} (${donde.length}x)  ej. ${donde[0]}`)
}

process.exit(violaciones.length > 0 || sinConvertir.length > 0 ? 1 : 0)

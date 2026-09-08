// Barrido de formas BRITÁNICAS en todo /data. El curso es inglés norteamericano (EE.UU. y
// Canadá) desde el 2026-09-07, pero la migración de aquel día solo tocó 17 palabras concretas.
// Esto busca lo que se quedó fuera: ortografía británica, léxico británico y giros como
// "at the weekend".
//
// Se ignoran los campos donde una forma británica es CORRECTA a propósito:
//   pron / comoSeLee  -> pronunciación figurada ("FILM" ahí es cómo se lee, no la palabra)
//   tambien / nota    -> ahí vive justamente la nota "en Reino Unido dicen ..."
//   literal           -> traducción palabra por palabra
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DATA = 'data'
// `patron` es la expresión regular de un grupo de pronunciación y lista A PROPÓSITO las dos
// grafías (color|colour) para reconocer la palabra escrita de cualquiera de las dos formas.
const IGNORAR_CAMPO = new Set(['pron', 'comoSeLee', 'tambien', 'nota', 'literal', 'rapido', 'patron'])

// [patrón, forma americana, categoría]
const BRITANICO = [
  // --- ortografía ---
  [/\bcolours?\b/gi, 'color(s)', 'ortografía'],
  [/\bcoloured\b/gi, 'colored', 'ortografía'],
  [/\bfavourite\b/gi, 'favorite', 'ortografía'],
  [/\bneighbou?rs?\b/gi, 'neighbor(s)', 'ortografía'],
  [/\bbehaviour\b/gi, 'behavior', 'ortografía'],
  [/\bflavour\b/gi, 'flavor', 'ortografía'],
  [/\bhumour\b/gi, 'humor', 'ortografía'],
  [/\bhonour\b/gi, 'honor', 'ortografía'],
  [/\blabour\b/gi, 'labor', 'ortografía'],
  [/\bcentres?\b/gi, 'center(s)', 'ortografía'],
  [/\btheatres?\b/gi, 'theater(s)', 'ortografía'],
  [/\bmetres?\b/gi, 'meter(s)', 'ortografía'],
  [/\bkilometres?\b/gi, 'kilometer(s)', 'ortografía'],
  [/\blitres?\b/gi, 'liter(s)', 'ortografía'],
  [/\bgrey\b/gi, 'gray', 'ortografía'],
  [/\brealise[ds]?\b/gi, 'realize(d)', 'ortografía'],
  [/\borganise[ds]?\b/gi, 'organize(d)', 'ortografía'],
  [/\bapologise[ds]?\b/gi, 'apologize(d)', 'ortografía'],
  [/\brecognise[ds]?\b/gi, 'recognize(d)', 'ortografía'],
  [/\banalyse[ds]?\b/gi, 'analyze(d)', 'ortografía'],
  [/\bpractis(e|es|ing|ed)\b/gi, 'practice(s/ing/d)', 'ortografía'],
  [/\btravell(ing|ed|er)\b/gi, 'travel$1 (una sola l)', 'ortografía'],
  [/\bcancelled\b/gi, 'canceled', 'ortografía'],
  [/\bprogramme\b/gi, 'program', 'ortografía'],
  [/\blicence\b/gi, 'license', 'ortografía'],
  [/\bdefence\b/gi, 'defense', 'ortografía'],
  [/\bjewellery\b/gi, 'jewelry', 'ortografía'],
  [/\bpyjamas\b/gi, 'pajamas', 'ortografía'],
  [/\btyres?\b/gi, 'tire(s)', 'ortografía'],
  [/\bstoreys?\b/gi, 'story/stories', 'ortografía'],
  [/\baluminium\b/gi, 'aluminum', 'ortografía'],
  [/\baeroplane\b/gi, 'airplane', 'ortografía'],
  [/\bwhilst\b/gi, 'while', 'ortografía'],
  [/\bamongst\b/gi, 'among', 'ortografía'],
  [/\blearnt\b/gi, 'learned', 'ortografía'],
  [/\bdreamt\b/gi, 'dreamed', 'ortografía'],
  [/\bspelt\b/gi, 'spelled', 'ortografía'],
  [/\bburnt\b/gi, 'burned', 'ortografía'],
  // --- léxico ---
  [/\bat the weekend\b/gi, 'on the weekend', 'léxico'],
  [/\brubbish\b/gi, 'trash / garbage', 'léxico'],
  [/\blorr(y|ies)\b/gi, 'truck(s)', 'léxico'],
  [/\bbiscuits?\b/gi, 'cookie(s)', 'léxico'],
  [/\bsweets\b/gi, 'candy', 'léxico'],
  [/\bcrisps\b/gi, 'chips', 'léxico'],
  [/\bpetrol\b/gi, 'gas', 'léxico'],
  [/\btimetables?\b/gi, 'schedule(s)', 'léxico'],
  [/\bqueue[ds]?\b/gi, 'line', 'léxico'],
  [/\bholidays?\b/gi, 'vacation(s)', 'léxico'],
  [/\bpostman\b/gi, 'mailman', 'léxico'],
  [/\bmobile phones?\b/gi, 'cell phone(s)', 'léxico'],
  [/\bautumn\b/gi, 'fall', 'léxico'],
  [/\bjumpers?\b/gi, 'sweater(s)', 'léxico'],
  [/\btrainers\b/gi, 'sneakers', 'léxico'],
  [/\bnapp(y|ies)\b/gi, 'diaper(s)', 'léxico'],
  [/\btorch\b/gi, 'flashlight', 'léxico'],
  [/\bchemist'?s?\b/gi, 'pharmacy / drugstore', 'léxico'],
  [/\bmaths\b/gi, 'math', 'léxico'],
  [/\bmum\b/gi, 'mom', 'léxico'],
  [/\bunderground\b/gi, 'subway', 'léxico'],
  [/\bpavement\b/gi, 'sidewalk', 'léxico'],
  [/\bcar parks?\b/gi, 'parking lot(s)', 'léxico'],
  [/\bmotorways?\b/gi, 'highway(s)', 'léxico'],
  [/\bpostcode\b/gi, 'zip code', 'léxico'],
  [/\bfull stop\b/gi, 'period', 'léxico'],
  [/\bground floor\b/gi, 'first floor', 'léxico'],
  [/\bfootball\b/gi, 'soccer', 'léxico'],
  [/\btrousers\b/gi, 'pants', 'léxico'],
  [/\bwardrobes?\b/gi, 'closet(s)', 'léxico'],
  [/\bcinemas?\b/gi, 'movie theater(s)', 'léxico'],
  [/\btown hall\b/gi, 'city hall', 'léxico'],
  // --- gramática/uso, para revisar a mano (no siempre es un error) ---
  [/\b(have|has|'ve|'s) got\b/gi, 'have / has (el americano prefiere have)', 'REVISAR'],
  [/\bShall (we|I)\b/gi, "Let's / Should I", 'REVISAR'],
  [/\bhaven'?t got\b/gi, "don't have", 'REVISAR']
]

const archivos = []
;(function recorrer(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) recorrer(p)
    else if (e.endsWith('.json')) archivos.push(p)
  }
})(DATA)

const hallazgos = []
function recorrerValor(valor, archivo, ruta, campo) {
  if (typeof valor === 'string') {
    if (IGNORAR_CAMPO.has(campo)) return
    // Una lección PUEDE nombrar la forma británica si es justo para decir que no se usa
    // ("'at the weekend' es británico"). Se reconoce por la propia explicación.
    const explicaLaDiferencia = /británic|Reino Unido|en EE\.?\s?UU\.?|americano/i.test(valor)
    for (const [re, mejor, cat] of BRITANICO) {
      const m = valor.match(re)
      if (m && !(explicaLaDiferencia && cat !== 'ortografía')) {
        hallazgos.push({ archivo, ruta, cat, encontrado: [...new Set(m)].join(', '), mejor, valor })
      }
    }
  } else if (Array.isArray(valor)) {
    valor.forEach((v, i) => recorrerValor(v, archivo, `${ruta}[${i}]`, campo))
  } else if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) recorrerValor(v, archivo, `${ruta}.${k}`, k)
  }
}

for (const a of archivos) recorrerValor(JSON.parse(readFileSync(a, 'utf8')), a, '', '')

const porCat = {}
for (const h of hallazgos) (porCat[h.cat] ??= []).push(h)
for (const cat of ['ortografía', 'léxico', 'REVISAR']) {
  const lista = porCat[cat] ?? []
  console.log(`\n########## ${cat.toUpperCase()} — ${lista.length} apariciones`)
  const agrupado = {}
  for (const h of lista) (agrupado[`${h.encontrado} → ${h.mejor}`] ??= []).push(h)
  for (const [k, hs] of Object.entries(agrupado).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  ${k}  (${hs.length})`)
    for (const h of hs.slice(0, 6)) {
      console.log(`    ${h.archivo}${h.ruta}`)
      console.log(`      "${h.valor.slice(0, 130)}"`)
    }
    if (hs.length > 6) console.log(`    … y ${hs.length - 6} más`)
  }
}
console.log(`\nTOTAL: ${hallazgos.length}`)

// Ortografía y léxico son fallo: el curso es de inglés norteamericano y ahí no hay matiz.
// REVISAR no lo es: "I've got a headache" se dice en EE.UU., y las lecciones que lo usan ya
// avisan de que la pregunta y la negación van con do/does.
const duros = hallazgos.filter((h) => h.cat !== 'REVISAR')
if (duros.length) {
  console.log(`\nFALLA: ${duros.length} formas británicas en el contenido.`)
  process.exit(1)
}
console.log('\nOK — el contenido no usa formas británicas.')

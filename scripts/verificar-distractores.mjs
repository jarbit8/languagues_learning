import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Una pregunta de opción múltiple está rota si se puede acertar SIN leer el material.
// La pista clásica: la respuesta correcta es claramente la más larga. Con 3 opciones,
// acertar por azar es 33%; con esta pista, quien la note acierta el 100% de esas.
const archivos = []
;(function rec(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e)
    if (statSync(p).isDirectory()) rec(p)
    else if (e.endsWith('.json')) archivos.push(p)
  }
})('data')

const norm = (s) => String(s).trim().toLowerCase()
const rotas = []
const total = { n: 0 }

function revisar(q, archivo, donde) {
  if (q?.tipo !== 'opcion_multiple' || !Array.isArray(q.opciones) || q.opciones.length < 2) return
  total.n++
  const buena = q.opciones.find((o) => norm(o) === norm(q.respuesta))
  if (buena === undefined) return // ya lo caza verificar-packs
  const otras = q.opciones.filter((o) => norm(o) !== norm(q.respuesta))
  const largoBuena = buena.length
  const maxOtras = Math.max(...otras.map((o) => o.length))
  // Se considera pista cuando la correcta saca al menos 4 caracteres a TODAS las demás,
  // que es cuando la diferencia se ve de un vistazo sin contar letras.
  if (largoBuena - maxOtras >= 4) {
    rotas.push({ archivo, donde, q, ventaja: largoBuena - maxOtras })
  }
}

for (const a of archivos) {
  const pack = JSON.parse(readFileSync(a, 'utf8'))
  if (pack.ejercicios) pack.ejercicios.forEach((q, i) => revisar(q, a, `ejercicio ${i}`))
  if (pack.dialogos) pack.dialogos.forEach((d, i) => d.preguntas?.forEach((q, j) => revisar(q, a, `diálogo ${i} pregunta ${j}`)))
  if (pack.textos) pack.textos.forEach((t, i) => t.preguntas?.forEach((q, j) => revisar(q, a, `texto ${i} pregunta ${j}`)))
}

rotas.sort((x, y) => y.ventaja - x.ventaja)
const porArchivo = {}
for (const r of rotas) (porArchivo[r.archivo] ??= []).push(r)

for (const [a, rs] of Object.entries(porArchivo)) {
  console.log(`\n${a}  (${rs.length})`)
  for (const r of rs) {
    console.log(`  ${r.donde}  +${r.ventaja}`)
    console.log(`    ${r.q.enunciado}`)
    console.log(`    opciones: ${r.q.opciones.map((o) => (norm(o) === norm(r.q.respuesta) ? `[${o}]` : o)).join(' | ')}`)
  }
}
console.log(`\n${rotas.length} de ${total.n} preguntas de opción múltiple delatan la respuesta por longitud.`)

// Es un fallo, no un aviso: una pregunta que se acierta sin leer el texto no mide nada, y con
// 108 de golpe quedó claro que a ojo se escapan siempre. El sesgo de POSICIÓN lo vigila
// verificar-packs.mjs; son el mismo agujero por dos puertas y hacen falta los dos.
if (rotas.length) {
  console.log(`FALLA: ${rotas.length} preguntas delatan la respuesta por longitud.`)
  process.exit(1)
}

// Render de la regla de gramática, compartido por la pantalla y por la hoja para imprimir.
// Estaba dentro de Gramatica.tsx; se sacó aquí al añadir la hoja, porque tener dos copias de
// este parseo era garantía de que una de las dos se quedaría atrás.

// Los textos de gramática citan los términos en inglés entre comillas simples ('to be', 'an').
// Ojo: las contracciones inglesas usan el mismo carácter (I'm, isn't), así que solo se toma
// como término la comilla que abre tras espacio/paréntesis y cierra antes de espacio o puntuación
// — la de una contracción va pegada a una letra. Sin lookbehind, por Safari antiguo.
const TERMINO = /(^|[\s(:—–-])'([^']+)'(?=[\s,.;:!?)]|$)/g

// `plano` es para el papel: en pantalla el término va como chip de color, pero en A4 eso se
// come el tóner y no aporta nada que no diga la negrita.
export function Resaltado({ texto, plano = false }: { texto: string; plano?: boolean }) {
  const chip = 'bg-en-soft text-en-dark dark:bg-en-dark/40 dark:text-en-soft'
  const nodos: React.ReactNode[] = []
  const re = new RegExp(TERMINO)
  let ultimo = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(texto)) !== null) {
    nodos.push(texto.slice(ultimo, m.index) + m[1])
    nodos.push(
      plano ? (
        <strong key={m.index}>{m[2]}</strong>
      ) : (
        <span key={m.index} className={`whitespace-nowrap rounded-md px-1.5 py-0.5 font-bold ${chip}`}>
          {m[2]}
        </span>
      )
    )
    ultimo = m.index + m[0].length
  }
  nodos.push(texto.slice(ultimo))
  return <>{nodos}</>
}

// La regla venía como un párrafo denso donde la conjugación quedaba enterrada. Se parte en
// bloques por fin de frase (nunca dentro de paréntesis, para no romper "(literalmente: ...)")
// y los pares "encabezado: patrón corto" se muestran como fórmula destacada.
export type BloqueRegla = { texto: string } | { label: string; patron: string }

function trocea(texto: string): string[] {
  const partes: string[] = []
  let actual = ''
  let prof = 0
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    actual += c
    if (c === '(') prof++
    else if (c === ')') prof = Math.max(0, prof - 1)
    if (prof === 0 && (c === '.' || c === ':') && /\s/.test(texto[i + 1] ?? '')) {
      const resto = texto.slice(i + 1).trimStart()
      // Tras "." se exige mayúscula para no cortar abreviaturas; tras ":" siempre corta.
      if (c === ':' || /^[A-ZÁÉÍÓÚÑ¡¿]/.test(resto)) {
        partes.push(actual.trim())
        actual = ''
      }
    }
  }
  if (actual.trim()) partes.push(actual.trim())
  return partes
}

const esPatron = (s: string) => s.length <= 70 && !s.endsWith(':')

export function bloquesDeRegla(regla: string): BloqueRegla[] {
  const b = trocea(regla)
  const out: BloqueRegla[] = []
  let i = 0
  while (i < b.length) {
    let t = b[i]
    i++
    // Un encabezado suelto se pega a lo que sigue hasta encontrar un patrón que destacar.
    while (t.endsWith(':') && i < b.length && !esPatron(b[i])) {
      t += ' ' + b[i]
      i++
    }
    if (t.endsWith(':') && i < b.length && esPatron(b[i])) {
      out.push({ label: t, patron: b[i] })
      i++
    } else {
      out.push({ texto: t })
    }
  }
  return out
}

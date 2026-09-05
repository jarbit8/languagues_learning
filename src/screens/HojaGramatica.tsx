import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { temaEnCurso } from '../lib/progreso'
import { getGramatica } from '../data/packs'
import { Resaltado, bloquesDeRegla } from '../components/ReglaGramatica'
import type { Ejercicio as EjercicioGramatica } from '../types'

// HOJA DE GRAMÁTICA PARA IMPRIMIR (2026-09-05, pedido suyo). La de Practicar deja fuera la
// gramática porque esa vive en Aprender, así que hasta ahora no había forma de estudiarla en
// papel. Aquí va la lección ENTERA —regla, ejemplos, pronunciación y trampa— y a continuación
// los ejercicios del tema, todos, con espacio para escribir. Las soluciones van en su propia
// página, con salto, para poder no imprimirla.

// En los ejercicios de ordenar, el JSON guarda las palabras YA en el orden correcto y es la
// app la que las baraja al vuelo. En papel hay que barajarlas igual o la hoja regala la
// respuesta. Se hace con una semilla fija (el número del ejercicio) por dos motivos: que lo
// impreso sea exactamente lo que se ve en pantalla, y que React no vuelva a barajar en cada
// repintado. Si el barajado sale igual que el original, se rota una posición.
function desordena(palabras: string[], semilla: number): string[] {
  let x = semilla * 2654435761 + 1
  const aleatorio = () => {
    x = (x ^ (x << 13)) >>> 0
    x = (x ^ (x >>> 17)) >>> 0
    x = (x ^ (x << 5)) >>> 0
    return x / 4294967296
  }
  const out = [...palabras]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  if (out.length > 1 && out.every((p, i) => p === palabras[i])) out.push(out.shift()!)
  return out
}

// Cada tipo de ejercicio pide una consigna distinta en papel: en la app se entiende por el
// componente que lo pinta, pero impreso hay que decir qué se espera.
const CONSIGNA: Record<string, string> = {
  hueco: 'Completa el hueco.',
  opcion_multiple: 'Marca la opción correcta.',
  ordenar: 'Ordena las palabras.',
  corregir_error: 'La frase tiene un error. Escríbela bien.',
  traducir: 'Tradúcela al inglés.'
}

function Ejercicio({ n, ej }: { n: number; ej: EjercicioGramatica }) {
  return (
    <div className="mt-3 break-inside-avoid">
      <p className="text-sm">
        <span className="font-semibold">{n}.</span>{' '}
        <span className="text-xs italic text-slate-500">{CONSIGNA[ej.tipo] ?? ''}</span>
      </p>
      {/* El enunciado de ordenar ya empieza por "Ordena:", que es lo que dice la consigna. */}
      <p className="ml-5 mt-0.5 text-sm font-medium">{ej.enunciado.replace(/^Ordena:\s*/i, '')}</p>

      {ej.tipo === 'opcion_multiple' && ej.opciones ? (
        <div className="ml-5 mt-1 flex flex-wrap gap-x-6 gap-y-0.5">
          {ej.opciones.map((o) => (
            <p key={o} className="text-sm">
              <span className="mr-2 inline-block h-3 w-3 border border-slate-400 align-middle" /> {o}
            </p>
          ))}
        </div>
      ) : ej.tipo === 'ordenar' && ej.opciones ? (
        <>
          <p className="ml-5 mt-0.5 text-sm italic text-slate-600">{desordena(ej.opciones, n).join(' · ')}</p>
          <div className="ml-5 mt-3 border-b border-slate-300" />
        </>
      ) : (
        <div className="ml-5 mt-3 border-b border-slate-300" />
      )}
    </div>
  )
}

export default function HojaGramatica() {
  const tema = useLiveQuery(() => temaEnCurso(), [], 1) ?? 1
  const pack = getGramatica(tema)

  if (!pack) {
    return (
      <div className="flex flex-col gap-3">
        <Link to="/aprender" className="text-sm text-slate-500 underline dark:text-slate-400">
          ← Volver a Aprender
        </Link>
        <p className="tarjeta text-sm">Este tema todavía no tiene lección de gramática.</p>
      </div>
    )
  }

  const soluciones = pack.ejercicios.map((e, i) => `${i + 1}. ${e.respuesta}`)

  return (
    <div className="flex flex-col gap-4">
      {/* Todo esto desaparece al imprimir. */}
      <div className="flex flex-col gap-3 print:hidden">
        <Link to="/aprender" className="text-sm text-slate-500 underline dark:text-slate-400">
          ← Volver a Aprender
        </Link>
        <h1 className="text-2xl font-bold">Gramática para imprimir</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          La lección entera del tema en curso más sus {pack.ejercicios.length} ejercicios, con espacio para
          escribir. Las soluciones salen en la última hoja: si no quieres tenerlas a mano, no la imprimas.
        </p>
        <p className="text-sm font-semibold">
          Tema {tema} — {pack.titulo}
        </p>
        <button onClick={() => window.print()} className="btn-primary">
          🖨️ Imprimir
        </button>
      </div>

      {/* La hoja. En pantalla se ve tal cual saldrá. */}
      <div className="hoja bg-white p-6 text-slate-900 print:p-0">
        <div className="border-b-2 border-slate-900 pb-2">
          <h2 className="text-lg font-black">
            Tema {tema} — {pack.titulo} · Gramática
          </h2>
          <p className="text-xs text-slate-500">Nombre: ________________________ Fecha: ____ / ____ / ______</p>
        </div>

        {/* --- 1. LA REGLA --- */}
        <section className="mt-5">
          <h3 className="text-sm font-black uppercase tracking-wide">1 · La regla</h3>
          <div className="mt-1 flex flex-col gap-2">
            {bloquesDeRegla(pack.regla).map((b, i) =>
              'patron' in b ? (
                <div key={i} className="break-inside-avoid">
                  <p className="text-sm leading-relaxed">
                    <Resaltado texto={b.label} plano />
                  </p>
                  <p className="mt-1 border-l-4 border-slate-900 bg-slate-100 px-3 py-1.5 text-sm font-bold">
                    {b.patron}
                  </p>
                </div>
              ) : (
                <p key={i} className="text-sm leading-relaxed">
                  <Resaltado texto={b.texto} plano />
                </p>
              )
            )}
          </div>
        </section>

        {/* --- 2. EJEMPLOS --- */}
        <section className="mt-5 break-inside-avoid">
          <h3 className="text-sm font-black uppercase tracking-wide">2 · Ejemplos</h3>
          <table className="mt-1 w-full text-sm">
            <tbody>
              {pack.ejemplos.map((ej, i) => (
                <tr key={i} className="break-inside-avoid align-top">
                  <td className="w-1/2 py-1 pr-3 font-semibold">
                    {ej.frase}
                    {ej.comoSeLee && <span className="block text-xs font-normal italic text-slate-500">{ej.comoSeLee}</span>}
                  </td>
                  <td className="py-1 text-slate-600">{ej.traduccion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* --- 3. CÓMO SUENA --- */}
        <section className="mt-5 break-inside-avoid">
          <h3 className="text-sm font-black uppercase tracking-wide">3 · Cómo suena</h3>
          <p className="mt-1 text-sm leading-relaxed">
            <Resaltado texto={pack.pronunciacion} plano />
          </p>
        </section>

        {/* --- 4. OJO CON ESTO --- */}
        <section className="mt-5 break-inside-avoid">
          <h3 className="text-sm font-black uppercase tracking-wide">4 · Ojo con esto</h3>
          <p className="mt-1 border border-slate-400 px-3 py-2 text-sm leading-relaxed">
            <Resaltado texto={pack.trampa} plano />
          </p>
        </section>

        {/* --- 5. EJERCICIOS --- */}
        <section className="mt-6">
          <h3 className="text-sm font-black uppercase tracking-wide">
            5 · Practica · {pack.ejercicios.length} ejercicios
          </h3>
          <p className="text-xs italic text-slate-500">
            Hazlos todos seguidos y corrige solo al final. Las respuestas se escriben en inglés.
          </p>
          {pack.ejercicios.map((ej, i) => (
            <Ejercicio key={i} n={i + 1} ej={ej} />
          ))}
        </section>

        {/* --- SOLUCIONES, en su propia página --- */}
        <section className="mt-8 break-before-page">
          <h3 className="text-sm font-black uppercase tracking-wide">
            Soluciones · Tema {tema} · Gramática
          </h3>
          <p className="text-xs italic text-slate-500">
            Vale cualquier variante equivalente: la app también acepta las contracciones (I'm, isn't...) donde
            corresponda.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {soluciones.map((s) => (
              <p key={s} className="break-inside-avoid">
                {s}
              </p>
            ))}
          </div>
        </section>

        <p className="mt-6 text-center text-[10px] text-slate-400">
          Idiomas · Inglés A1 · Tema {tema} · Gramática
        </p>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { temaEnCurso } from '../lib/progreso'
import { getReading, getVocabPack } from '../data/packs'
import { porDia } from '../lib/porDia'
import TextoLeible from '../components/TextoLeible'

// HOJA PARA IMPRIMIR — SOLO LEER (2026-09-08, él: "la impresión será solo para leer nada más,
// lo demás lo haré en la app").
//
// Nació con escuchar, escribir y leer, pero las tres en papel no se sostenían: el audio de los
// diálogos sigue estando en el móvil, así que "escuchar en papel" era responder preguntas con
// el teléfono en la mano, y escribir ya se autocalifica en la app contra la respuesta modelo.
// Leer es lo único que gana algo al salir de la pantalla, que es justo lo que él quiere hacer
// antes de dormir. La otra hoja, la de gramática, se fue por lo mismo.
// Las soluciones van en la última página, con salto de página, para poder no imprimirla.

function Pregunta({ n, enunciado, opciones }: { n: number; enunciado: string; opciones?: string[] }) {
  return (
    <div className="mt-3 break-inside-avoid">
      <p className="text-sm">
        <span className="font-semibold">{n}.</span> {enunciado}
      </p>
      {opciones ? (
        <div className="ml-5 mt-1 flex flex-col gap-0.5">
          {opciones.map((o) => (
            <p key={o} className="text-sm">
              <span className="mr-2 inline-block h-3 w-3 border border-slate-400 align-middle" /> {o}
            </p>
          ))}
        </div>
      ) : (
        <div className="ml-5 mt-3 border-b border-slate-300" />
      )}
    </div>
  )
}

export default function HojaDePractica() {
  const temaActual = useLiveQuery(() => temaEnCurso(), [], 1) ?? 1
  // Un tema son dos días y cada uno lleva sus dos lecturas.
  const [dia, setDia] = useState<1 | 2>(1)
  const t = temaActual

  const pack = getVocabPack(t)
  const reading = getReading(t)

  // Numeración corrida por toda la hoja, como en un examen de verdad. Se calcula ANTES de
  // pintar: mutar contadores dentro del JSX depende del número de renders y se desordena.
  const etiquetas = (tipo: string, opciones?: string[]) =>
    tipo === 'vf' ? ['Verdadero', 'Falso'] : tipo === 'vfnd' ? ['Verdadero', 'Falso', 'No dice'] : opciones

  const capitaliza = (r: string) => r.charAt(0).toUpperCase() + r.slice(1)

  let cont = 0
  const textosDelDia = porDia(reading?.textos ?? [], dia)
  const bloques = textosDelDia.map((tx) => ({
    texto: tx,
    preguntas: tx.preguntas.map((p) => ({
      n: ++cont,
      enunciado: p.enunciado,
      opciones: etiquetas(p.tipo, p.opciones),
      respuesta: p.respuesta
    }))
  }))
  const soluciones = bloques.flatMap((b) => b.preguntas).map((p) => `${p.n}. ${capitaliza(p.respuesta)}`)

  return (
    <div className="flex flex-col gap-4">
      {/* Todo esto desaparece al imprimir: barra, selector y botón. */}
      <div className="flex flex-col gap-3 print:hidden">
        <Link to="/hablar" className="text-sm text-slate-500 underline dark:text-slate-400">
          ← Volver a Practicar
        </Link>
        <h1 className="text-2xl font-bold">Hoja para imprimir</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Solo lectura: los textos del día y sus preguntas. Escuchar, hablar y escribir se hacen en la app.
        </p>
        <p className="text-sm font-semibold">
          Tema {t} — {pack?.titulo}
        </p>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
          {([1, 2] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDia(d)}
              className={`rounded-lg py-1.5 text-sm font-semibold ${
                dia === d ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'
              }`}
            >
              Día {d}
            </button>
          ))}
        </div>
        <button onClick={() => window.print()} className="btn-primary">
          🖨️ Imprimir
        </button>
      </div>

      {/* La hoja. En pantalla se ve tal cual saldrá. */}
      <div className="hoja bg-white p-6 text-slate-900 print:p-0">
        <div className="border-b-2 border-slate-900 pb-2">
          <h2 className="text-lg font-black">
            Leer · Tema {t} — {pack?.titulo} · Día {dia}
          </h2>
          <p className="text-xs text-slate-500">Nombre: ________________________ Fecha: ____ / ____ / ______</p>
        </div>

        {bloques.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Aún no hay lectura para el tema {t}.</p>
        ) : (
          bloques.map((b, i) => (
            <section key={i} className="mt-5">
              <h3 className="text-sm font-black uppercase tracking-wide">
                {i + 1} · {b.texto.titulo}
              </h3>
              <div className="mt-2">
                <TextoLeible texto={b.texto} />
              </div>
              {b.preguntas.map((p) => (
                <Pregunta key={p.n} n={p.n} enunciado={p.enunciado} opciones={p.opciones} />
              ))}
            </section>
          ))
        )}

        {/* SOLUCIONES, en su propia página para poder no imprimirla */}
        <section className="mt-8 break-before-page">
          <h3 className="text-sm font-black uppercase tracking-wide">
            Soluciones · Tema {t} · Día {dia}
          </h3>
          <p className="text-xs italic text-slate-500">Corrige solo cuando hayas terminado.</p>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {soluciones.map((s) => (
              <p key={s}>{s}</p>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

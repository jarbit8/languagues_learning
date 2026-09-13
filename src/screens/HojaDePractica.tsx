import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { temaEnCurso } from '../lib/progreso'
import { getListening, getReading, getVocabPack } from '../data/packs'
import { porDia } from '../lib/porDia'
import TextoLeible from '../components/TextoLeible'

// HOJA PARA IMPRIMIR — ESCUCHAR Y LEER (2026-09-13, él: "imprimir el escuchar también porque
// solo lo reproduciré en mi cel y responderé en la hoja").
//
// El 2026-09-08 se había quedado solo en leer. Vuelve escuchar: el audio suena en el móvil y
// las preguntas se responden aquí. Escribir sigue fuera, porque la corrección la hace la IA.
// Al día siguiente pasa las respuestas a la app, que es la que califica y marca el módulo:
// por eso el orden y la numeración siguen los de Practicar, sin barajar.
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
  // Un tema son dos días y cada uno lleva sus dos diálogos y sus dos lecturas.
  const [dia, setDia] = useState<1 | 2>(1)
  const t = temaActual

  const pack = getVocabPack(t)
  const listening = getListening(t)
  const reading = getReading(t)

  const etiquetas = (tipo: string, opciones?: string[]) =>
    tipo === 'vf' ? ['Verdadero', 'Falso'] : tipo === 'vfnd' ? ['Verdadero', 'Falso', 'No dice'] : opciones

  const capitaliza = (r: string) => r.charAt(0).toUpperCase() + r.slice(1)

  // Numeración corrida por toda la hoja, como en un examen de verdad. Se calcula ANTES de
  // pintar: mutar contadores dentro del JSX depende del número de renders y se desordena.
  let cont = 0
  const numeradas = <T extends { tipo: string; enunciado: string; opciones?: string[]; respuesta: string }>(ps: T[]) =>
    ps.map((p) => ({ n: ++cont, enunciado: p.enunciado, opciones: etiquetas(p.tipo, p.opciones), respuesta: p.respuesta }))

  const dialogos = porDia(listening?.dialogos ?? [], dia).map((d) => ({ titulo: d.titulo, preguntas: numeradas(d.preguntas) }))
  const textos = porDia(reading?.textos ?? [], dia).map((tx) => ({ texto: tx, preguntas: numeradas(tx.preguntas) }))
  const soluciones = (bloques: { preguntas: { n: number; respuesta: string }[] }[]) =>
    bloques.flatMap((b) => b.preguntas).map((p) => `${p.n}. ${capitaliza(p.respuesta)}`)

  return (
    <div className="flex flex-col gap-4">
      {/* Todo esto desaparece al imprimir: barra, selector y botón. */}
      <div className="flex flex-col gap-3 print:hidden">
        <Link to="/hablar" className="text-sm text-slate-500 underline dark:text-slate-400">
          ← Volver a Practicar
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">Hoja para imprimir</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Escuchar y leer del día. Los diálogos suenan en el celular y respondes en la hoja. Escribir se hace en la app,
          porque lo corrige la IA.
        </p>
        <p className="text-sm font-semibold">
          Tema {t} — {pack?.titulo}
        </p>
        <div className="segmentado grid-cols-2">
          {([1, 2] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDia(d)}
              className={`segmento py-2 text-sm ${dia === d ? 'segmento-activo' : ''}`}
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
            Tema {t} — {pack?.titulo} · Día {dia}
          </h2>
          <p className="text-xs text-slate-500">Name: ________________________ Date: ____ / ____ / ______</p>
        </div>

        <section className="mt-5">
          <h3 className="text-sm font-black uppercase tracking-wide">1 · Escuchar 🎧</h3>
          <p className="text-xs italic text-slate-500">
            Pon los diálogos en el celular (Practicar → Escuchar → Día {dia}) y responde aquí sin mirar la transcripción.
          </p>
          {dialogos.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Aún no hay listening para el tema {t}.</p>
          ) : (
            dialogos.map((d, i) => (
              <div key={i} className="mt-3">
                <p className="text-sm font-semibold">
                  Diálogo {i + 1}: {d.titulo}
                </p>
                {d.preguntas.map((p) => (
                  <Pregunta key={p.n} n={p.n} enunciado={p.enunciado} opciones={p.opciones} />
                ))}
              </div>
            ))
          )}
        </section>

        <section className="mt-6 break-before-page">
          <h3 className="text-sm font-black uppercase tracking-wide">2 · Leer 📖</h3>
          {textos.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Aún no hay lectura para el tema {t}.</p>
          ) : (
            textos.map((b, i) => (
              <div key={i} className="mt-4">
                <p className="text-sm font-semibold">
                  Lectura {i + 1}: {b.texto.titulo}
                </p>
                <div className="mt-2">
                  <TextoLeible texto={b.texto} />
                </div>
                {b.preguntas.map((p) => (
                  <Pregunta key={p.n} n={p.n} enunciado={p.enunciado} opciones={p.opciones} />
                ))}
              </div>
            ))
          )}
        </section>

        {/* SOLUCIONES, en su propia página para poder no imprimirla */}
        <section className="mt-8 break-before-page">
          <h3 className="text-sm font-black uppercase tracking-wide">
            Soluciones · Tema {t} · Día {dia}
          </h3>
          <p className="text-xs italic text-slate-500">Corrige solo cuando hayas terminado.</p>
          {[
            { titulo: 'Escuchar', lista: soluciones(dialogos) },
            { titulo: 'Leer', lista: soluciones(textos) }
          ].map((s) => (
            <div key={s.titulo} className="mt-3">
              <p className="text-sm font-semibold">{s.titulo}</p>
              <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {s.lista.map((x) => (
                  <p key={x}>{x}</p>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { temaEnCurso } from '../lib/progreso'
import { getListening, getReading, getWriting, getVocabPack, temasDisponibles } from '../data/packs'
import { bloqueDeTema } from '../lib/curriculum'

// HOJA PARA IMPRIMIR (2026-08-30, pedido del usuario): quiere hacer los 45 min de Practicar
// EN PAPEL, antes de dormir, fuera de pantallas. Van las tres destrezas que se pueden pasar a
// papel —escuchar (solo las preguntas: el audio sigue en el móvil), escribir y leer— en el
// orden que él estudia. HABLAR NO ESTÁ: es conversación con una IA, 100% en el dispositivo.
// Las soluciones van en la última página, con salto de página, para poder no imprimirla.

const Lineas = ({ n }: { n: number }) => (
  <>
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className="mt-4 border-b border-slate-300" />
    ))}
  </>
)

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
  const [tema, setTema] = useState<number | null>(null)
  // Un tema son dos días y cada uno lleva su propio material: el diálogo, el texto y la
  // consigna que le tocan. Si un tema todavía no tiene el segundo, cae en el primero.
  const [dia, setDia] = useState<1 | 2>(1)
  const t = tema ?? temaActual
  const i = dia - 1

  const pack = getVocabPack(t)
  const listening = getListening(t)
  const reading = getReading(t)
  const consignasDelTema = getWriting(bloqueDeTema(t))?.consignas.filter((c) => c.tema === t) ?? []
  const consigna = consignasDelTema[i] ?? consignasDelTema[0]

  // Numeración corrida por toda la hoja, como en un examen de verdad. Se calcula ANTES de
  // pintar: mutar contadores dentro del JSX depende del número de renders y se desordena.
  const etiquetas = (tipo: string, opciones?: string[]) =>
    tipo === 'vf' ? ['Verdadero', 'Falso'] : tipo === 'vfnd' ? ['Verdadero', 'Falso', 'No dice'] : opciones

  const capitaliza = (r: string) => r.charAt(0).toUpperCase() + r.slice(1)

  let cont = 0
  const numeradas = <T extends { tipo: string; enunciado: string; opciones?: string[]; respuesta: string }>(ps: T[]) =>
    ps.map((p) => ({ n: ++cont, enunciado: p.enunciado, opciones: etiquetas(p.tipo, p.opciones), respuesta: p.respuesta }))

  // Un diálogo y un texto por día, no los dos de golpe.
  const dialogosDelDia = (listening?.dialogos ?? []).slice(i, i + 1)
  const textosDelDia = (reading?.textos ?? []).slice(i, i + 1)
  const bloquesEscuchar = (dialogosDelDia.length ? dialogosDelDia : (listening?.dialogos ?? []).slice(0, 1)).map((d) => ({ titulo: d.titulo, preguntas: numeradas(d.preguntas) }))
  const bloquesLeer = (textosDelDia.length ? textosDelDia : (reading?.textos ?? []).slice(0, 1)).map((tx) => ({ ...tx, preguntas: numeradas(tx.preguntas) }))
  const soluciones = [...bloquesEscuchar.flatMap((b) => b.preguntas), ...bloquesLeer.flatMap((b) => b.preguntas)].map(
    (p) => `${p.n}. ${capitaliza(p.respuesta)}`
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Todo esto desaparece al imprimir: barra, selector y botón. */}
      <div className="flex flex-col gap-3 print:hidden">
        <Link to="/hablar" className="text-sm text-slate-500 underline dark:text-slate-400">
          ← Volver a Practicar
        </Link>
        <h1 className="text-2xl font-bold">Hoja para imprimir</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Escuchar, escribir y leer en papel. Hablar no está: esa es la conversación con la IA y va en el móvil. El
          audio de los diálogos también, solo las preguntas se responden aquí.
        </p>
        <select
          value={t}
          onChange={(e) => setTema(Number(e.target.value))}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
        >
          {temasDisponibles
            .filter((x) => x <= temaActual)
            .map((x) => (
              <option key={x} value={x}>
                Tema {x} — {getVocabPack(x)?.titulo}
              </option>
            ))}
        </select>
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
            Tema {t} — {pack?.titulo} · Día {dia}
          </h2>
          <p className="text-xs text-slate-500">Nombre: ________________________ Fecha: ____ / ____ / ______</p>
        </div>

        {/* --- 1. ESCUCHAR --- */}
        <section className="mt-5 break-inside-avoid">
          <h3 className="text-sm font-black uppercase tracking-wide">1 · Escuchar 🎧</h3>
          <p className="text-xs italic text-slate-500">
            Pon los diálogos en la app (Practicar → Escuchar → Tema {t}) y responde aquí sin mirar la transcripción.
          </p>
          {bloquesEscuchar.map((d, i) => (
            <div key={i} className="mt-3">
              <p className="text-sm font-semibold">
                Diálogo {dia}: {d.titulo}
              </p>
              {d.preguntas.map((p) => (
                <Pregunta key={p.n} n={p.n} enunciado={p.enunciado} opciones={p.opciones} />
              ))}
            </div>
          ))}
        </section>

        {/* --- 2. ESCRIBIR --- */}
        <section className="mt-6 break-inside-avoid">
          <h3 className="text-sm font-black uppercase tracking-wide">2 · Escribir ✍️</h3>
          {consigna ? (
            <>
              <p className="mt-1 text-sm font-semibold">{consigna.consigna}</p>
              <p className="text-xs text-slate-500">
                Entre {consigna.minPalabras} y {consigna.maxPalabras} palabras.
              </p>
              <Lineas n={10} />
            </>
          ) : (
            <p className="text-sm text-slate-500">No hay consigna para este tema.</p>
          )}
        </section>

        {/* --- 3. LEER --- */}
        <section className="mt-6">
          <h3 className="text-sm font-black uppercase tracking-wide">3 · Leer 📖</h3>
          {bloquesLeer.map((tx, i) => (
            <div key={i} className="mt-2">
              <p className="text-sm font-semibold">{tx.titulo}</p>
              <p className="mt-1 text-sm leading-relaxed">{tx.texto}</p>
              {tx.preguntas.map((p) => (
                <Pregunta key={p.n} n={p.n} enunciado={p.enunciado} opciones={p.opciones} />
              ))}
            </div>
          ))}
        </section>

        {/* --- SOLUCIONES, en su propia página para poder no imprimirla --- */}
        <section className="mt-8 break-before-page">
          <h3 className="text-sm font-black uppercase tracking-wide">Soluciones · Tema {t} · Día {dia}</h3>
          <p className="text-xs italic text-slate-500">
            Corrige solo cuando hayas terminado. Escribir no tiene solución: compárala con la respuesta modelo en la
            app.
          </p>
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

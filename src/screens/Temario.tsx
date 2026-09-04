import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { inicioDeHoy } from '../lib/fechas'
import { mapaTemas } from '../lib/progreso'
import { temasDeBloque, bloqueDeTema } from '../lib/curriculum'
import { getVocabPack, getGramatica, getListening, getReading, getWriting, vocabPacks } from '../data/packs'
import { funcionDe, nombresBloque, gramaticaBloque } from '../data/funciones'
import {
  diasDeTema,
  fechaCorta,
  cierraBloque,
  diasDelPlan,
  estadoDelPlan,
  anadirPausa,
  quitarPausa,
  enPausa,
  getPlan,
  fijarInicio,
  SEMANA_FINAL,
  fechaDeDia,
  DIAS_FINAL,
  PLAN_POR_DEFECTO
} from '../lib/plan'

// Cuántas consignas de escritura le tocan a un tema: los packs de writing son por bloque,
// pero cada consigna lleva el tema al que corresponde.
const consignasDe = (tema: number) =>
  getWriting(bloqueDeTema(tema))?.consignas.filter((c) => c.tema === tema).length ?? 0

const ESTADO_BADGE: Record<string, string> = {
  aprobado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  en_curso: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900',
  bloqueado: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
}

const ESTADO_TEXTO: Record<string, string> = {
  aprobado: 'Aprobado ✓',
  en_curso: 'En curso',
  bloqueado: 'Bloqueado 🔒'
}

export default function Temario() {
  const mapa = useLiveQuery(() => mapaTemas(), [])
  // Si hay cronograma activo, cada tema muestra los días que le tocan.
  const plan = useLiveQuery(() => getPlan(), [], PLAN_POR_DEFECTO)
  const temaActual = mapa?.find((t) => t.estado === 'en_curso')?.tema ?? 1
  const estado = estadoDelPlan(plan, temaActual)
  const empezado = inicioDeHoy() >= plan.fechaInicio
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  // Al revés que aFecha: input type=date quiere 'YYYY-MM-DD' en hora local.
  const deFecha = (t: number) => {
    const d = new Date(t)
    const dos = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
  }
  // input type=date da 'YYYY-MM-DD'; se interpreta en hora local, no UTC.
  const aFecha = (v: string) => {
    const [a, m, d] = v.split('-').map(Number)
    return new Date(a, m - 1, d).getTime()
  }
  const estadoDe = (tema: number) => mapa?.find((t) => t.tema === tema)?.estado ?? 'bloqueado'

  // Solo el titular: temas y palabras. El desglose de cada tema (ejercicios, diálogos,
  // lectura, consigna) vive en los chips de su tarjeta, que es donde se necesita — arriba
  // eran seis cifras de golpe y no se leía ninguna. Sale de los packs, se actualiza sola.
  const totalPalabras = vocabPacks.reduce((n, p) => n + (getVocabPack(p.tema)?.conceptos.length ?? 0), 0)
  const RESUMEN = [
    { n: vocabPacks.length, label: 'temas' },
    { n: totalPalabras, label: 'palabras' }
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Resumen de todo el nivel */}
      <div className="tarjeta grid grid-cols-2 text-center">
        {RESUMEN.map((r) => (
          <div key={r.label} className="px-1">
            <p className="text-xl font-black">{r.n}</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{r.label}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        El orden se desbloquea en secuencia, pero aquí ves el plan completo del nivel A1.
      </p>

      {/* El cronograma vive aquí, no en Inicio: es la vista del plan, y en Inicio molestaba. */}
      {estado ? (
        <div className="tarjeta flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">
              {estado.terminado
                ? 'Cronograma terminado'
                : empezado
                  ? `Día ${estado.dia} de ${estado.totalDias}`
                  : `Empiezas el ${fechaCorta(plan.fechaInicio)}`}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              acabas el {fechaCorta(estado.fechaFin)}
            </span>
          </div>
          {empezado && enPausa(plan, Date.now()) && (
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              ⏸ Hoy estás en pausa: repasa lo visto, no avances tema.
            </p>
          )}

          {/* El día de arranque manda sobre todo lo demás: al cambiarlo se recolocan las
              pausas automáticas y se recalculan las fechas de los 24 temas. */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Empiezo el</span>
            <input
              type="date"
              value={deFecha(plan.fechaInicio)}
              onChange={(e) => { if (e.target.value) void fijarInicio(aFecha(e.target.value)) }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-900"
            />
            <span className="text-slate-400 dark:text-slate-500">y las pausas se recolocan solas</span>
          </div>

          {/* Pausas: semanas de exámenes, viajes… Los días de pausa no cuentan y todo lo
              que viene después se corre solo, sin cambiar el orden de los temas. */}
          {(plan.pausas ?? []).map((p) => (
            <div key={p.desde} className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                ⏸ {fechaCorta(p.desde)}
                {fechaCorta(p.hasta) !== fechaCorta(p.desde) && ` – ${fechaCorta(p.hasta)}`}
              </span>
              {p.auto && <span className="text-slate-400 dark:text-slate-500">{p.motivo}</span>}
              <button onClick={() => void quitarPausa(p.desde)} className="text-slate-400 underline">
                quitar
              </button>
            </div>
          ))}

          <details className="text-xs">
            <summary className="cursor-pointer text-slate-500 dark:text-slate-400">Añadir una pausa</summary>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-900"
              />
              <span className="text-slate-400">→</span>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-900"
              />
              <button
                disabled={!desde || !hasta}
                onClick={() => {
                  void anadirPausa(aFecha(desde), aFecha(hasta))
                  setDesde('')
                  setHasta('')
                }}
                className="rounded-lg bg-slate-900 px-3 py-1 text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
              >
                Añadir
              </button>
            </div>
          </details>
        </div>
      ) : null}

      {[1, 2, 3, 4].map((bloque) => (
        <div key={bloque} className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
              Bloque {bloque} — {nombresBloque[bloque]}
            </h2>
            {/* El nombre del bloque dice de qué se habla; esto dice qué gramática se domina. */}
            <p className="text-xs text-slate-500 dark:text-slate-400">📘 {gramaticaBloque[bloque]}</p>
          </div>
          {temasDeBloque(bloque).map((tema) => {
            const pack = getVocabPack(tema)
            const estado = estadoDe(tema)
            return (
              <div key={tema} className="tarjeta flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold dark:bg-slate-800">
                    {tema}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold leading-snug">{pack?.titulo ?? `Tema ${tema}`}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{funcionDe(tema)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[estado]}`}>
                      {ESTADO_TEXTO[estado]}
                    </span>
                    {plan && (
                      <span className="text-[10px] text-sky-600 dark:text-sky-400">
                        {fechaCorta(diasDeTema(plan, tema).desde)}–{fechaCorta(diasDeTema(plan, tema).hasta)}
                        {cierraBloque(tema) && ' 🧩'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Gramática de este tema, siempre visible: es el corazón del temario */}
                {(() => {
                  const gram = getGramatica(tema)
                  if (!gram) return null
                  return (
                    <div className="flex items-start gap-2 rounded-lg bg-indigo-50 px-2.5 py-1.5 dark:bg-indigo-950/40">
                      <span className="text-sm leading-none">📘</span>
                      <p className="flex-1 text-xs font-medium text-indigo-900 dark:text-indigo-100">{gram.titulo}</p>
                    </div>
                  )
                })()}

                {/* Todo lo que trae el tema, con su número: antes solo se veían palabras y
                    ejercicios, y "listening" suelto sin contar — la lectura y la consigna de
                    escritura de cada tema no aparecían por ningún lado. */}
                <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {[
                    { n: pack?.conceptos.length ?? 0, uno: 'palabra', varias: 'palabras' },
                    { n: getGramatica(tema)?.ejercicios.length ?? 0, uno: 'ejercicio', varias: 'ejercicios' },
                    { n: getListening(tema)?.dialogos.length ?? 0, uno: 'diálogo', varias: 'diálogos' },
                    { n: getReading(tema)?.textos.length ?? 0, uno: 'lectura', varias: 'lecturas' },
                    { n: consignasDe(tema), uno: 'consigna', varias: 'consignas' }
                  ]
                    .filter((c) => c.n > 0)
                    .map((c) => (
                      <span key={c.varias} className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                        {c.n} {c.n === 1 ? c.uno : c.varias}
                      </span>
                    ))}
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {/* La semana final: el nivel ya no cierra con un examen de dos días sino con siete de
          repaso y examen. Se pinta aquí, después de los bloques, porque es lo que viene luego. */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Semana final</h2>
        <div className="tarjeta flex flex-col gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Repasas el nivel entero bloque a bloque y lo cierras con el examen final partido en dos días.
          </p>
          {SEMANA_FINAL.map((que, i) => {
            const dia = diasDelPlan() - DIAS_FINAL + 1 + i
            const esExamen = i >= SEMANA_FINAL.length - 2
            return (
              <div key={que} className="flex items-baseline gap-2 text-sm">
                <span
                  className={`w-16 shrink-0 text-xs font-semibold ${
                    esExamen ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                  }`}
                >
                  {fechaCorta(fechaDeDia(plan, dia))}
                </span>
                <span className={esExamen ? 'font-semibold' : ''}>{que}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

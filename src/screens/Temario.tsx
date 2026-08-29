import { useLiveQuery } from 'dexie-react-hooks'
import { mapaTemas } from '../lib/progreso'
import { temasDeBloque, bloqueDeTema } from '../lib/curriculum'
import { getVocabPack, getGramatica, getListening, getReading, getWriting, vocabPacks } from '../data/packs'
import { funcionDe, nombresBloque, gramaticaBloque } from '../data/funciones'
import { db } from '../db'
import { diasDeTema, fechaCorta, cierraBloque } from '../lib/plan'

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
  const plan = useLiveQuery(() => db.plan.get('a1'), [])
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
    </div>
  )
}

import { useLiveQuery } from 'dexie-react-hooks'
import { mapaTemas } from '../lib/progreso'
import { temasDeBloque, bloqueDeTema } from '../lib/curriculum'
import { getVocabPack, getGramatica, getListening, getReading, getWriting, vocabPacks, pronPack } from '../data/packs'
import { funcionDe, nombresBloque } from '../data/funciones'

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
  const estadoDe = (tema: number) => mapa?.find((t) => t.tema === tema)?.estado ?? 'bloqueado'

  // Todo el resumen sale de los packs: si se añade contenido, esta cabecera se actualiza sola.
  const suma = (f: (tema: number) => number) => vocabPacks.reduce((n, p) => n + f(p.tema), 0)
  const RESUMEN = [
    { n: vocabPacks.length, label: 'temas' },
    { n: suma((t) => getVocabPack(t)?.conceptos.length ?? 0), label: 'palabras' },
    { n: suma((t) => getGramatica(t)?.ejercicios.length ?? 0), label: 'ejercicios' },
    { n: suma((t) => getListening(t)?.dialogos.length ?? 0), label: 'diálogos' },
    { n: suma((t) => getReading(t)?.textos.length ?? 0), label: 'lecturas' },
    { n: suma(consignasDe), label: 'consignas' }
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Resumen de todo el nivel */}
      <div className="tarjeta grid grid-cols-3 gap-y-3 text-center">
        {RESUMEN.map((r) => (
          <div key={r.label} className="px-1">
            <p className="text-xl font-black">{r.n}</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{r.label}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        El orden se desbloquea en secuencia, pero aquí ves el plan completo del nivel A1. Además,{' '}
        <strong className="font-semibold">{pronPack?.grupos.length ?? 0} grupos de pronunciación</strong> que valen para
        todo el nivel, no para un tema suelto.
      </p>

      {[1, 2, 3, 4].map((bloque) => (
        <div key={bloque} className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
            Bloque {bloque} — {nombresBloque[bloque]}
          </h2>
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
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[estado]}`}>
                    {ESTADO_TEXTO[estado]}
                  </span>
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

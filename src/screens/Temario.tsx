import { useLiveQuery } from 'dexie-react-hooks'
import { mapaTemas } from '../lib/progreso'
import { IDIOMAS_ACTIVOS, idiomaUnico } from '../config'
import { temasDeBloque } from '../lib/curriculum'
import { getVocabPack, getGramatica, vocabPacks } from '../data/packs'
import { funcionDe, nombresBloque } from '../data/funciones'

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

  const totalPalabras = vocabPacks.reduce((n, p) => n + p.conceptos.length, 0)
  const totalGramatica = vocabPacks.filter((p) => IDIOMAS_ACTIVOS.some((i) => getGramatica(p.tema, i))).length

  return (
    <div className="flex flex-col gap-5">
      {/* Resumen de todo el nivel */}
      <div className="tarjeta grid grid-cols-3 divide-x divide-slate-200 text-center dark:divide-slate-700">
        <div className="px-1">
          <p className="text-xl font-black">{vocabPacks.length}</p>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">temas</p>
        </div>
        <div className="px-1">
          <p className="text-xl font-black">{totalPalabras}</p>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">palabras</p>
        </div>
        <div className="px-1">
          <p className="text-xl font-black">{totalGramatica}</p>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">lecciones</p>
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        El orden se desbloquea en secuencia, pero aquí ves el plan completo del nivel A1.
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
                {IDIOMAS_ACTIVOS.map((i) => {
                  const gram = getGramatica(tema, i)
                  if (!gram) return null
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg bg-indigo-50 px-2.5 py-1.5 dark:bg-indigo-950/40"
                    >
                      <span className="text-sm leading-none">📘</span>
                      <p className="flex-1 text-xs font-medium text-indigo-900 dark:text-indigo-100">
                        {!idiomaUnico && <span className="font-bold">{i.toUpperCase()} · </span>}
                        {gram.titulo}
                      </p>
                    </div>
                  )
                })}

                <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                    {pack?.conceptos.length ?? 30} palabras
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                    {getGramatica(tema, IDIOMAS_ACTIVOS[0])?.ejercicios.length ?? 15} ejercicios
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">listening</span>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

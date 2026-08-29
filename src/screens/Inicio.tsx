import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { temaEnCurso, resumenVocabTema } from '../lib/progreso'
import { getVocabPack } from '../data/packs'
import { repasosVencidos } from '../lib/srs'
import { getPlan, empezarPlan, estadoDelPlan, diasDelPlan, fechaCorta } from '../lib/plan'

export default function Inicio() {
  const data = useLiveQuery(async () => {
    const tema = await temaEnCurso()
    const pack = getVocabPack(tema)
    const resumen = await resumenVocabTema(tema)
    const repasos = (await repasosVencidos()).length
    const plan = await getPlan()
    return {
      tema,
      titulo: pack?.titulo ?? '',
      ...resumen,
      repasos,
      plan,
      estadoPlan: plan ? estadoDelPlan(plan, tema) : undefined
    }
  }, [])

  if (!data) return <p className="tarjeta">Cargando…</p>

  const pct = data.total ? Math.round((data.aprendidas / data.total) * 100) : 0

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Idiomas</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Inglés, a tu ritmo · A1</p>
      </header>

      {/* Cronograma: solo informa. No desbloquea ni bloquea nada. */}
      {data.plan && data.estadoPlan ? (
        <div className="tarjeta flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">
              {data.estadoPlan.terminado
                ? 'Plan terminado'
                : `Día ${data.estadoPlan.dia} de ${data.estadoPlan.totalDias}`}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              acabas el {fechaCorta(data.estadoPlan.fechaFin)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-sky-500 transition-all"
              style={{ width: `${Math.min(100, (data.estadoPlan.dia / data.estadoPlan.totalDias) * 100)}%` }}
            />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Hoy toca:{' '}
            <b>
              {data.estadoPlan.jornada.tipo === 'tema' &&
                `tema ${data.estadoPlan.jornada.tema} (día ${data.estadoPlan.jornada.diaDelTema} de 2)`}
              {data.estadoPlan.jornada.tipo === 'bloque' &&
                `examen del bloque ${data.estadoPlan.jornada.bloque} — día completo`}
              {data.estadoPlan.jornada.tipo === 'final' &&
                `examen final A1 (día ${data.estadoPlan.jornada.diaDelFinal} de 2)`}
            </b>
            {data.estadoPlan.jornada.tipo === 'tema' && data.estadoPlan.jornada.diaDelTema === 2 && (
              <span className="text-sky-600 dark:text-sky-400"> · hoy toca el examen del tema</span>
            )}
            {data.estadoPlan.desfase === 0 && ' · vas al día ✓'}
            {data.estadoPlan.desfase > 0 && ` · vas ${data.estadoPlan.desfase} tema(s) por delante 🚀`}
            {data.estadoPlan.desfase < 0 && ` · vas ${-data.estadoPlan.desfase} tema(s) por detrás`}
          </p>
        </div>
      ) : (
        <button onClick={() => empezarPlan()} className="tarjeta flex items-center gap-3 text-left">
          <span className="text-2xl">🗓️</span>
          <div className="flex-1">
            <p className="font-semibold">Empezar el plan de {diasDelPlan()} días</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              2 días por tema. Es solo una guía: no bloquea nada, solo te dice si vas al día.
            </p>
          </div>
        </button>
      )}

      <div className="tarjeta flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-500 dark:text-slate-400">Tema {data.tema}</span>
          <span className="text-sm font-semibold">{pct}%</span>
        </div>
        <h2 className="text-xl font-bold">{data.titulo}</h2>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {data.aprendidas}/{data.total} palabras aprendidas · hoy marcaste <b>{data.hoy}</b>
        </p>
        <Link to="/aprender" className="btn-primary">
          Seguir aprendiendo
        </Link>
      </div>

      <Link to="/examen" className="tarjeta flex items-center gap-3">
        <span className="text-2xl">📝</span>
        <div className="flex-1">
          <p className="font-semibold">Examen diario</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data.hoy > 0 ? `${data.hoy} palabras nuevas` : 'Solo repasos'}
            {data.repasos > 0 ? ` · ${data.repasos} repasos vencidos` : ''}
          </p>
        </div>
        {data.repasos > 0 && (
          <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{data.repasos}</span>
        )}
      </Link>
    </div>
  )
}

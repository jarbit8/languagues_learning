import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { temaEnCurso, resumenVocabTema } from '../lib/progreso'
import { avanceTema } from '../lib/avance'
import { getVocabPack } from '../data/packs'
import { repasosVencidos } from '../lib/srs'

export default function Inicio() {
  const data = useLiveQuery(async () => {
    const tema = await temaEnCurso()
    const pack = getVocabPack(tema)
    const resumen = await resumenVocabTema(tema)
    const avance = await avanceTema(tema)
    const repasos = (await repasosVencidos()).length
    return { tema, titulo: pack?.titulo ?? '', ...resumen, avance, repasos }
  }, [])

  if (!data) return <p className="tarjeta">Cargando…</p>

  // LA BARRA MIDE EL TEMA ENTERO, NO SOLO EL VOCABULARIO (2026-09-08, pedido suyo). Antes
  // marcaba 100% con las palabras marcadas y la gramática sin abrir, así que decía "tema
  // terminado" cuando faltaban cinco de las seis cosas que el examen de tema sí pregunta.
  const { pct, modulos, completo } = data.avance

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">English</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Inglés, a tu ritmo · A1</p>
      </header>

      <div className="tarjeta flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-500 dark:text-slate-400">Tema {data.tema}</span>
          <span className="text-sm font-semibold">{pct}%</span>
        </div>
        <h2 className="text-xl font-bold">{data.titulo}</h2>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className={`h-full rounded-full transition-all ${completo ? 'bg-emerald-500' : 'bg-emerald-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Los seis módulos del tema, los mismos que las seis secciones de su examen. Se ve de
            un vistazo qué falta, que es lo que la barra sola no dice. */}
        <div className="grid grid-cols-2 gap-1.5">
          {modulos.map((m) => {
            const listo = m.hechas >= m.total
            return (
              <Link
                key={m.id}
                to={m.ruta}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs ${
                  listo
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <span>{m.icono}</span>
                <span className="flex-1 font-semibold">{m.nombre}</span>
                <span className="tabular-nums">{listo ? '✓' : `${m.hechas}/${m.total}`}</span>
              </Link>
            )
          })}
        </div>

        {completo ? (
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Tema {data.tema} completo ✓ · te toca el examen del tema
          </p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data.aprendidas}/{data.total} palabras aprendidas · hoy marcaste <b>{data.hoy}</b>
          </p>
        )}

        <Link to={completo ? '/examen' : '/aprender'} className="btn-primary">
          {completo ? 'Ir al examen del tema' : 'Seguir aprendiendo'}
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

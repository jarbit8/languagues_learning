import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { temaEnCurso, resumenVocabTema } from '../lib/progreso'
import { avanceTema } from '../lib/avance'
import { getVocabPack } from '../data/packs'
import { repasosVencidos } from '../lib/srs'
import { hojaPendiente, nombreDeHoja } from '../lib/hojaVocab'

// El saludo va en inglés a propósito: son frases del tema 1.
function saludo(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 19 ? 'Good afternoon' : 'Good evening'
}

function Anillo({ pct, completo }: { pct: number; completo: boolean }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="anillo-tema" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={completo ? '#34d399' : '#818cf8'} />
            <stop offset="1" stopColor={completo ? '#059669' : '#a855f7'} />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-slate-200 dark:stroke-slate-800" />
        {/* Con 0 % el extremo redondeado pintaría un punto suelto. */}
        {pct > 0 && (
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            stroke="url(#anillo-tema)"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct / 100)}
            className="transition-[stroke-dashoffset] duration-700"
          />
        )}
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xl font-extrabold tabular-nums">{pct}%</span>
    </div>
  )
}

export default function Inicio() {
  const data = useLiveQuery(async () => {
    const tema = await temaEnCurso()
    const pack = getVocabPack(tema)
    const resumen = await resumenVocabTema(tema)
    const avance = await avanceTema(tema)
    const repasos = (await repasosVencidos()).length
    const hoja = await hojaPendiente()
    return { tema, titulo: pack?.titulo ?? '', ...resumen, avance, repasos, hoja }
  }, [])

  if (!data) return <p className="tarjeta">Cargando…</p>

  // EL AVANCE MIDE EL TEMA ENTERO, NO SOLO EL VOCABULARIO (2026-09-08, pedido suyo). Antes
  // marcaba 100% con las palabras marcadas y la gramática sin abrir, así que decía "tema
  // terminado" cuando faltaban cinco de las seis cosas que el examen de tema sí pregunta.
  const { pct, modulos, completo } = data.avance

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-500 dark:text-indigo-300">{saludo()} 👋</p>
          <h1 className="text-3xl font-extrabold tracking-tight">English</h1>
        </div>
        <span className="rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 px-3 py-1 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/30">
          A1
        </span>
      </header>

      <div className="tarjeta relative flex flex-col gap-4 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/20"
        />
        <div className="relative flex items-center gap-4">
          <Anillo pct={pct} completo={completo} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tema {data.tema}</p>
            <h2 className="mt-0.5 text-xl font-extrabold leading-tight tracking-tight">{data.titulo}</h2>
            {completo ? (
              <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Completo ✓ · te toca el examen
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {data.aprendidas}/{data.total} palabras · hoy marcaste{' '}
                <b className="text-slate-900 dark:text-white">{data.hoy}</b>
              </p>
            )}
          </div>
        </div>

        {/* Los seis módulos del tema, los mismos que las seis secciones de su examen. Se ve de
            un vistazo qué falta, que es lo que el porcentaje solo no dice. */}
        <div className="relative grid grid-cols-2 gap-2">
          {modulos.map((m) => {
            const listo = m.hechas >= m.total
            const ancho = m.total > 0 ? Math.min(100, Math.round((m.hechas / m.total) * 100)) : 0
            return (
              <Link
                key={m.id}
                to={m.ruta}
                className={`flex flex-col gap-1.5 rounded-2xl px-3 py-2.5 transition active:scale-[0.98] ${
                  listo
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-1.5 text-xs">
                  <span>{m.icono}</span>
                  <span className="flex-1 truncate font-bold">{m.nombre}</span>
                  <span className="tabular-nums opacity-80">{listo ? '✓' : `${m.hechas}/${m.total}`}</span>
                </span>
                <span className="block h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <span
                    className={`block h-full rounded-full ${
                      listo ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                    }`}
                    style={{ width: `${ancho}%` }}
                  />
                </span>
              </Link>
            )
          })}
        </div>

        <Link to={completo ? '/examen' : '/aprender'} className="btn-primary relative">
          {completo ? 'Ir al examen del tema' : 'Seguir aprendiendo'}
        </Link>
      </div>

      <Link to="/examen" className="tarjeta flex items-center gap-3 transition active:scale-[0.99]">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-2xl shadow-lg shadow-orange-500/25">
          📝
        </span>
        <div className="flex-1">
          <p className="font-bold">Examen diario</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data.hoja
              ? `✏️ Califica la hoja del ${nombreDeHoja(data.hoja.fecha)}`
              : `${data.hoy > 0 ? `${data.hoy} palabras nuevas` : 'Solo repasos'}${
                  data.repasos > 0 ? ` · ${data.repasos} repasos vencidos` : ''
                }`}
          </p>
        </div>
        {data.repasos > 0 && (
          <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{data.repasos}</span>
        )}
        <span className="text-slate-400">›</span>
      </Link>
    </div>
  )
}

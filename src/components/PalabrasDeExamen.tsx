import { rubricaPack } from '../data/packs'
import { hablar } from '../lib/audio'

// Chuleta de las palabras con las que están ESCRITAS las preguntas (what, true, choose,
// according to the text...). Desde el tema 9 los enunciados de reading van en inglés, y estas
// palabras no salen del temario: son de examen y se repiten hasta B2, así que se enseñan
// aparte en vez de gastar tarjetas de un tema. No entran al SRS ni se marcan "aprendidas".
export default function PalabrasDeExamen({ temaActual }: { temaActual: number }) {
  if (!rubricaPack) return null

  return (
    <details className="tarjeta">
      <summary className="cursor-pointer text-sm font-bold">📝 {rubricaPack.titulo}</summary>
      <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{rubricaPack.nota}</p>

      {rubricaPack.grupos.map((g) => (
        <div key={g.titulo} className="mt-4 flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">{g.titulo}</h3>
          {g.palabras.map((p) => (
            <div
              key={p.texto}
              className="flex flex-col gap-0.5 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60"
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => hablar(p.texto)}
                  aria-label={`Escuchar ${p.texto}`}
                  className="text-base leading-none"
                >
                  🔊
                </button>
                <span className="font-semibold">{p.texto}</span>
                <span className="text-xs tracking-wide text-slate-400 dark:text-slate-500">/ {p.pron} /</span>
                <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">{p.es}</span>
              </div>
              <p className="pl-7 text-xs italic text-slate-500 dark:text-slate-400">{p.ejemplo}</p>
              {/* Ojo con el tiempo verbal: varias de estas palabras tienen su tarjeta en un tema
                  POSTERIOR al que va el estudiante (why es del 21 y esto se lee desde el 9), así que
                  decir "ya la viste" sin más era mentira la mitad de las veces. */}
              {p.tema !== undefined && (
                <span className="pl-7 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {p.tema <= temaActual ? `ya la viste · tema ${p.tema}` : `la verás en el tema ${p.tema}`}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </details>
  )
}

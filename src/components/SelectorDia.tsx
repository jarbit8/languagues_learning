// Un tema son dos días de estudio y cada día tiene su material. Este selector es el mismo en
// Hablar, Escuchar, Leer y Escribir: si cada pantalla lo pintara a su manera, el usuario
// tendría que aprenderse cuatro sitios distintos para lo mismo.
export default function SelectorDia({ dia, onCambio }: { dia: 1 | 2; onCambio: (d: 1 | 2) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
      {([1, 2] as const).map((d) => (
        <button
          key={d}
          onClick={() => onCambio(d)}
          className={`rounded-lg py-1.5 text-sm font-semibold ${
            dia === d ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'
          }`}
        >
          Día {d}
        </button>
      ))}
    </div>
  )
}

// Un tema son dos días de estudio y cada día tiene su material. Este selector es el mismo en
// Hablar, Escuchar, Leer y Escribir: si cada pantalla lo pintara a su manera, el usuario
// tendría que aprenderse cuatro sitios distintos para lo mismo.
export default function SelectorDia({ dia, onCambio }: { dia: 1 | 2; onCambio: (d: 1 | 2) => void }) {
  return (
    <div className="segmentado grid-cols-2">
      {([1, 2] as const).map((d) => (
        <button
          key={d}
          onClick={() => onCambio(d)}
          className={`segmento py-2 text-sm ${dia === d ? 'segmento-activo' : ''}`}
        >
          Día {d}
        </button>
      ))}
    </div>
  )
}

import { useState } from 'react'
import type { Concepto, PalabraEstado } from '../types'
import { hablar } from '../lib/audio'

function Lado({ chip, texto, ejemplo, idioma }: { chip: string; texto: string; ejemplo: string; idioma: 'en' | 'fr' }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className={idioma === 'en' ? 'chip-en' : 'chip-fr'}>{chip}</span>
        <span className="text-lg font-semibold">{texto}</span>
        <button
          onClick={() => hablar(texto, idioma)}
          aria-label={`Escuchar ${texto}`}
          className="ml-auto text-xl"
        >
          🔊
        </button>
      </div>
      <button
        onClick={() => hablar(ejemplo, idioma)}
        className="text-left text-sm italic text-slate-500 dark:text-slate-400"
      >
        {ejemplo} <span className="not-italic">🔊</span>
      </button>
    </div>
  )
}

export default function VocabCard({
  concepto,
  estado,
  onToggle
}: {
  concepto: Concepto
  estado?: PalabraEstado
  onToggle: (id: string) => void
}) {
  const [abierta, setAbierta] = useState(false)
  const aprendida = !!estado && estado.estado !== 'nueva'

  return (
    <div className={`tarjeta ${aprendida ? 'ring-2 ring-emerald-400' : ''}`}>
      <button onClick={() => setAbierta((v) => !v)} className="flex w-full items-center gap-2 text-left">
        <span className="text-lg font-bold">{concepto.es}</span>
        {aprendida && <span className="text-emerald-500">✓</span>}
        <span className="ml-auto text-slate-400">{abierta ? '▲' : '▼'}</span>
      </button>

      {abierta && (
        <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-slate-700">
          <Lado chip="EN" texto={concepto.en.texto} ejemplo={concepto.en.ejemplo} idioma="en" />
          <Lado chip="FR" texto={concepto.fr.texto} ejemplo={concepto.fr.ejemplo} idioma="fr" />
          {concepto.nota && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              💡 {concepto.nota}
            </p>
          )}
          <button
            onClick={() => onToggle(concepto.id)}
            className={`btn ${
              aprendida
                ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                : 'btn-primary'
            }`}
          >
            {aprendida ? 'Quitar de aprendidas' : 'Aprendida ✓'}
          </button>
        </div>
      )}
    </div>
  )
}

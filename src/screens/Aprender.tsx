import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { temaEnCurso } from '../lib/progreso'
import { getVocabPack } from '../data/packs'
import Vocabulario from './Vocabulario'

export default function Aprender() {
  const tema = useLiveQuery(() => temaEnCurso(), [], 1)
  const [sub, setSub] = useState<'vocab' | 'gram'>('vocab')
  const pack = tema ? getVocabPack(tema) : undefined

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-slate-500 dark:text-slate-400">Tema {tema} en curso</p>
        <h1 className="text-2xl font-bold">{pack?.titulo ?? 'Aprender'}</h1>
      </header>

      <div className="flex rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
        {(['vocab', 'gram'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              sub === s ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'
            }`}
          >
            {s === 'vocab' ? 'Vocabulario' : 'Gramática'}
          </button>
        ))}
      </div>

      {sub === 'vocab' ? (
        tema ? (
          <Vocabulario tema={tema} />
        ) : null
      ) : (
        <p className="tarjeta text-slate-500 dark:text-slate-400">
          Las lecciones de gramática (inglés y francés) llegan en la Fase 2.
        </p>
      )}
    </div>
  )
}

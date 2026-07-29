import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { temaEnCurso } from '../lib/progreso'
import { getVocabPack } from '../data/packs'
import Vocabulario from './Vocabulario'
import Gramatica from './Gramatica'
import Pronunciacion from './Pronunciacion'

type Sub = 'vocab' | 'gram' | 'pron'

const TABS: { id: Sub; label: string }[] = [
  { id: 'vocab', label: 'Vocabulario' },
  { id: 'gram', label: 'Gramática' },
  { id: 'pron', label: 'Pronunciación' }
]

export default function Aprender() {
  const tema = useLiveQuery(() => temaEnCurso(), [], 1)
  const [sub, setSub] = useState<Sub>('vocab')
  const pack = tema ? getVocabPack(tema) : undefined

  return (
    <div className="flex flex-col gap-4">
      <header>
        {sub === 'pron' ? (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">Guía transversal · todo el nivel</p>
            <h1 className="text-2xl font-bold">Pronunciación</h1>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">Tema {tema} en curso</p>
            <h1 className="text-2xl font-bold">{pack?.titulo ?? 'Aprender'}</h1>
          </>
        )}
      </header>

      <div className="flex rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
              sub === t.id ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === 'pron' ? <Pronunciacion /> : tema ? sub === 'vocab' ? <Vocabulario tema={tema} /> : <Gramatica tema={tema} /> : null}
    </div>
  )
}

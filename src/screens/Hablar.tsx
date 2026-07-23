import { useState } from 'react'
import Conversacion from './Conversacion'
import Listening from './Listening'
import Reading from './Reading'
import Writing from './Writing'

type Sub = 'hablar' | 'escuchar' | 'leer' | 'escribir'

const TABS: { id: Sub; label: string }[] = [
  { id: 'hablar', label: '🗣️ Hablar' },
  { id: 'escuchar', label: '🎧 Escuchar' },
  { id: 'leer', label: '📖 Leer' },
  { id: 'escribir', label: '✍️ Escribir' }
]

export default function Hablar() {
  const [sub, setSub] = useState<Sub>('hablar')

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Practicar</h1>

      <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`rounded-lg py-2 text-xs font-semibold ${
              sub === t.id ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === 'hablar' && <Conversacion />}
      {sub === 'escuchar' && <Listening />}
      {sub === 'leer' && <Reading />}
      {sub === 'escribir' && <Writing />}
    </div>
  )
}

import { useState } from 'react'
import Listening from './Listening'
import Conversacion from './Conversacion'

export default function Hablar() {
  const [sub, setSub] = useState<'chat' | 'listening'>('chat')

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Hablar</h1>

      <div className="flex rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
        {(['chat', 'listening'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              sub === s ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'
            }`}
          >
            {s === 'chat' ? 'Conversación' : 'Listening'}
          </button>
        ))}
      </div>

      {sub === 'chat' ? <Conversacion /> : <Listening />}
    </div>
  )
}

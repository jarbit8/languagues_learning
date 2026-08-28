import { useState } from 'react'
import Conversacion from './Conversacion'
import Listening from './Listening'
import Reading from './Reading'
import Writing from './Writing'
import Pronunciacion from './Pronunciacion'

type Sub = 'hablar' | 'escuchar' | 'leer' | 'escribir' | 'pronunciar'

// Pronunciación vive aquí (no en Aprender): es práctica transversal a todo el nivel, como las
// otras cuatro, no contenido del tema en curso.
// Icono arriba y texto abajo: con 5 pestañas en una fila, "🔊 Pronunciar" en línea no cabe en
// pantalla de celular (375px) y desbordaba horizontalmente.
const TABS: { id: Sub; icono: string; label: string }[] = [
  { id: 'hablar', icono: '🗣️', label: 'Hablar' },
  { id: 'escuchar', icono: '🎧', label: 'Escuchar' },
  { id: 'leer', icono: '📖', label: 'Leer' },
  { id: 'escribir', icono: '✍️', label: 'Escribir' },
  { id: 'pronunciar', icono: '🔊', label: 'Pronunciar' }
]

export default function Hablar() {
  const [sub, setSub] = useState<Sub>('hablar')

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Practicar</h1>

      <div className="grid grid-cols-5 gap-1 rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[10px] font-semibold leading-tight ${
              sub === t.id ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'
            }`}
          >
            <span className="text-base leading-none">{t.icono}</span>
            <span className="w-full truncate text-center">{t.label}</span>
          </button>
        ))}
      </div>

      {sub === 'hablar' && <Conversacion />}
      {sub === 'escuchar' && <Listening />}
      {sub === 'leer' && <Reading />}
      {sub === 'escribir' && <Writing />}
      {sub === 'pronunciar' && <Pronunciacion />}
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import Conversacion from './Conversacion'
import Listening from './Listening'
import Reading from './Reading'
import Writing from './Writing'

type Sub = 'hablar' | 'escuchar' | 'leer' | 'escribir'

// Practicar = las CUATRO DESTREZAS del tema en curso. Pronunciación se fue a Aprender el
// 2026-08-30: es material de estudio transversal, no una destreza que se practique por tema.
// Icono arriba y texto abajo: con 5 pestañas en una fila, "🔊 Pronunciar" en línea no cabe en
// pantalla de celular (375px) y desbordaba horizontalmente.
const TABS: { id: Sub; icono: string; label: string }[] = [
  { id: 'hablar', icono: '🗣️', label: 'Hablar' },
  { id: 'escuchar', icono: '🎧', label: 'Escuchar' },
  { id: 'leer', icono: '📖', label: 'Leer' },
  { id: 'escribir', icono: '✍️', label: 'Escribir' }
]

export default function Hablar() {
  // Un enlace "¿cómo se hace este sonido?" desde una tarjeta de vocabulario entra con
  // ?pron=<id>: hay que caer directamente en Pronunciar, no en Hablar.
  const [sub, setSub] = useState<Sub>('hablar')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h1 className="flex-1 text-2xl font-bold">Practicar</h1>
        {/* Los 45 min de práctica los hace en papel, antes de dormir y fuera de pantallas. */}
        <Link
          to="/hoja"
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold dark:border-slate-600"
        >
          🖨️ Hoja
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
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
    </div>
  )
}

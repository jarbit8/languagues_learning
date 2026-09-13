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
//
// EL ORDEN ES EL DE SU SESIÓN (2026-09-13): escribir → escuchar → hablar → leer. Escribir va
// primero porque se hace sí o sí en la PC (lo corrige la IA); lo demás lo sigue en papel con el
// audio en el celular, y leer cierra antes de dormir.
const TABS: { id: Sub; icono: string; label: string }[] = [
  { id: 'escribir', icono: '✍️', label: 'Escribir' },
  { id: 'escuchar', icono: '🎧', label: 'Escuchar' },
  { id: 'hablar', icono: '🗣️', label: 'Hablar' },
  { id: 'leer', icono: '📖', label: 'Leer' }
]

export default function Hablar() {
  // Se abre en la primera pestaña, que es por donde empieza la sesión.
  const [sub, setSub] = useState<Sub>('escribir')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h1 className="flex-1 text-2xl font-extrabold tracking-tight">Practicar</h1>
        {/* Se imprimen escuchar y leer; escribir lo corrige la IA en la app. */}
        <Link
          to="/hoja"
          className="rounded-xl bg-white px-3 py-2 text-xs font-bold shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10"
        >
          🖨️ Hoja en papel
        </Link>
      </div>

      <div className="segmentado grid-cols-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`segmento flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-[10px] leading-tight ${
              sub === t.id ? 'segmento-activo' : ''
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

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
// EL ORDEN ES EL DE LA SESIÓN, no uno cualquiera: escuchar → hablar → escribir → leer, que es
// como él hace los 45 minutos. Empieza por el oído, que es lo que peor entra en frío, y acaba
// leyendo, que es lo más tranquilo antes de dormir. Estaba con Hablar delante y no cuadraba
// ni con la hoja para imprimir ni con la tarjeta de "Tu día".
const TABS: { id: Sub; icono: string; label: string }[] = [
  { id: 'escuchar', icono: '🎧', label: 'Escuchar' },
  { id: 'hablar', icono: '🗣️', label: 'Hablar' },
  { id: 'escribir', icono: '✍️', label: 'Escribir' },
  { id: 'leer', icono: '📖', label: 'Leer' }
]

export default function Hablar() {
  // Se abre en Escuchar, que es por donde empieza la sesión. (El comentario que había aquí
  // hablaba de caer en Pronunciar con ?pron=, pero eso vive en Aprender desde que se movió.)
  const [sub, setSub] = useState<Sub>('escuchar')

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

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useLocation } from 'react-router-dom'
import { temaEnCurso } from '../lib/progreso'
import { getVocabPack } from '../data/packs'
import Vocabulario from './Vocabulario'
import Gramatica from './Gramatica'
import Aprendidas from './Aprendidas'
import Pronunciacion from './Pronunciacion'

// APRENDER = lo que se estudia. Vocabulario y gramática son del tema en curso; Aprendido y
// Pronunciar son transversales (todo lo que ya marcó, y los sonidos del nivel entero).
// Pronunciación vivía en Practicar desde julio y el usuario la trajo aquí el 2026-08-30:
// Practicar queda como las cuatro DESTREZAS y Aprender como el material de estudio.
// Mismas pestañas con icono arriba y texto abajo que Practicar, para que las dos pantallas
// se manejen igual.
type Sub = 'vocab' | 'gram' | 'sabidas' | 'pronunciar'

const TABS: { id: Sub; icono: string; label: string }[] = [
  { id: 'vocab', icono: '📇', label: 'Vocabulario' },
  { id: 'gram', icono: '📘', label: 'Gramática' },
  { id: 'sabidas', icono: '✅', label: 'Aprendido' },
  { id: 'pronunciar', icono: '🔊', label: 'Pronunciar' }
]

export default function Aprender() {
  const tema = useLiveQuery(() => temaEnCurso(), [], 1)
  // Un enlace "practicar este sonido" desde una tarjeta de vocabulario entra con ?pron=<id>.
  const hayPron = new URLSearchParams(useLocation().search).has('pron')
  const [sub, setSub] = useState<Sub>(hayPron ? 'pronunciar' : 'vocab')
  const pack = tema ? getVocabPack(tema) : undefined

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-slate-500 dark:text-slate-400">Tema {tema} en curso</p>
        <h1 className="text-2xl font-bold">{pack?.titulo ?? 'Aprender'}</h1>
      </header>

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

      {/* Aprendido y Pronunciar no dependen del tema en curso. */}
      {sub === 'sabidas' ? (
        <Aprendidas />
      ) : sub === 'pronunciar' ? (
        <Pronunciacion />
      ) : tema ? (
        sub === 'vocab' ? (
          <Vocabulario tema={tema} />
        ) : (
          <Gramatica tema={tema} />
        )
      ) : null}
    </div>
  )
}

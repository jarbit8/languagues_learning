import { useState } from 'react'
import Temario from './Temario'
import Cuenta from '../components/Cuenta'
import Rutina from '../components/Rutina'
import { reiniciarCurso } from '../lib/reinicio'

// Volver a cero. En dos pasos a propósito: borra todo y no hay respaldo en ninguna parte,
// así que un solo toque sería demasiado fácil de dar sin querer.
function ReiniciarCurso() {
  const [confirmando, setConfirmando] = useState(false)
  const [hecho, setHecho] = useState(false)

  async function reiniciar() {
    await reiniciarCurso()
    setHecho(true)
    // Dexie no se entera de un clear() hecho fuera de sus hooks en todas las pantallas,
    // y aquí interesa además que el usuario vea la app entera como recién instalada.
    setTimeout(() => location.reload(), 600)
  }

  if (hecho) {
    return <p className="tarjeta text-sm text-emerald-600 dark:text-emerald-400">Listo, empiezas de cero. Recargando…</p>
  }

  if (!confirmando) {
    return (
      <button
        onClick={() => setConfirmando(true)}
        className="self-center text-sm text-slate-400 underline dark:text-slate-500"
      >
        Reiniciar el curso
      </button>
    )
  }

  return (
    <div className="tarjeta flex flex-col gap-3 border border-rose-300 dark:border-rose-800">
      <p className="font-semibold text-rose-600 dark:text-rose-400">¿Borrar todo y empezar de cero?</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Se borran las palabras aprendidas y sus repasos, los temas y bloques aprobados, el historial de exámenes, la
        pronunciación practicada y el cronograma. No se puede deshacer. Si tienes la cuenta conectada, al sincronizar después también se borra allí.
      </p>
      <div className="flex gap-2">
        <button onClick={() => void reiniciar()} className="btn-primary flex-1 !bg-rose-600">
          Sí, borrar todo
        </button>
        <button onClick={() => setConfirmando(false)} className="flex-1 text-sm underline">
          Cancelar
        </button>
      </div>
    </div>
  )
}



export default function Progreso() {
  // Antes esto tenía dos pestañas: "Progreso" (racha, contadores de palabras, mapa de temas e
  // historial) y "Temario". El usuario quitó la primera el 2026-08-30: el estado de cada tema
  // ya se ve en el Temario, que dice "Aprobado ✓" en verde al pasarlo, y el resto eran cifras
  // repetidas —las palabras están en Aprender → Aprendido y las notas en el propio examen—.
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Progreso</h1>
      <Cuenta />
      <Rutina />
      <Temario />
      <ReiniciarCurso />
    </div>
  )
}

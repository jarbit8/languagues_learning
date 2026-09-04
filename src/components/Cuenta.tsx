import { useSyncExternalStore } from 'react'
import { entrar, hayFirebase, salir } from '../lib/cuenta'
import { leerEstado, sincronizarAhora, suscribir } from '../lib/autosync'

// Conectar la cuenta para que el progreso viaje entre el móvil y el PC. Es OPCIONAL: sin
// conectar, la app funciona exactamente igual que antes, con todo guardado solo en este
// aparato. Por eso no hay pantalla de login al abrir ni nada que empuje a registrarse.
//
// Esta tarjeta solo PINTA lo que hace el sincronizador, que vive en la app entera
// (lib/autosync.ts) para que siga funcionando estando en cualquier pantalla. El botón es
// para forzarlo, no para que la sincronización dependa de pulsarlo.

function cuando(ms: number | null): string {
  if (!ms) return 'nunca'
  const d = new Date(ms)
  const hoy = new Date()
  const mismoDia = d.toDateString() === hoy.toDateString()
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return mismoDia ? `hoy a las ${hora}` : `${d.getDate()}/${d.getMonth() + 1} a las ${hora}`
}

export default function Cuenta() {
  const { cuenta, cargando, sincronizando, ultima, error } =
    useSyncExternalStore(suscribir, leerEstado)

  async function forzar() {
    // Al forzarlo a mano sí se recarga: es el gesto de "tráete lo del otro aparato ahora", y
    // así se repintan de golpe las pantallas que ya estuvieran montadas.
    if (await sincronizarAhora()) location.reload()
  }

  if (!hayFirebase || cargando) return null

  if (!cuenta) {
    return (
      <div className="tarjeta flex flex-col gap-2">
        <p className="font-semibold">Tu progreso, en todos tus aparatos</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ahora mismo lo aprendido vive solo en este dispositivo. Si conectas tu cuenta de Google, el móvil y el PC
          comparten el mismo avance. Sin conectar, la app funciona igual que siempre.
        </p>
        <button onClick={() => void entrar()} className="btn-primary self-start">
          Conectar con Google
        </button>
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    )
  }

  return (
    <div className="tarjeta flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {cuenta.foto && <img src={cuenta.foto} alt="" className="h-9 w-9 rounded-full" />}
        <div className="flex-1">
          <p className="font-semibold">{cuenta.nombre ?? 'Conectado'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{cuenta.correo}</p>
        </div>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {sincronizando ? 'Sincronizando…' : `Se guarda solo · última vez ${cuando(ultima)}`}
      </p>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => void forzar()} disabled={sincronizando} className="btn-primary flex-1">
          Sincronizar ahora
        </button>
        <button onClick={() => void salir()} className="flex-1 text-sm underline">
          Desconectar
        </button>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Se sincroniza sola al abrir la app y al terminar cada examen. Desconectar no borra nada: el progreso se queda
        en este aparato y en tu cuenta.
      </p>
    </div>
  )
}

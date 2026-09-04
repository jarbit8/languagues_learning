import { useEffect, useState } from 'react'
import { entrar, hayFirebase, observarCuenta, salir, type Cuenta as DatosCuenta } from '../lib/cuenta'
import { fijarUid, sincronizar, ultimaSync } from '../lib/sync'

// Conectar la cuenta para que el progreso viaje entre el móvil y el PC. Es OPCIONAL: sin
// conectar, la app funciona exactamente igual que antes, con todo guardado solo en este
// aparato. Por eso no hay pantalla de login al abrir ni nada que empuje a registrarse.

function cuando(ms: number | null): string {
  if (!ms) return 'nunca'
  const d = new Date(ms)
  const hoy = new Date()
  const mismoDia = d.toDateString() === hoy.toDateString()
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return mismoDia ? `hoy a las ${hora}` : `${d.getDate()}/${d.getMonth() + 1} a las ${hora}`
}

export default function Cuenta() {
  const [cuenta, setCuenta] = useState<DatosCuenta | null>(null)
  const [cargando, setCargando] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [ultima, setUltima] = useState<number | null>(ultimaSync())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => observarCuenta((c) => {
    setCuenta(c)
    setCargando(false)
    // para que el empuje automático de después de cada examen sepa a quién subirlo
    fijarUid(c?.uid ?? null)
  }), [])

  // Al entrar y cada vez que la app vuelve a primer plano. Lo segundo es lo que hace que
  // pasar del móvil al PC funcione sin tocar nada: al abrirla en el otro aparato, se trae
  // lo que se hizo en el primero.
  useEffect(() => {
    if (!cuenta) return
    let vivo = true
    const correr = async () => {
      if (document.hidden) return
      setSincronizando(true)
      const r = await sincronizar(cuenta.uid)
      if (!vivo) return
      setSincronizando(false)
      setError(r.ok ? null : (r.error ?? 'No se pudo sincronizar'))
      if (r.ok) setUltima(r.cuando)
    }
    void correr()
    document.addEventListener('visibilitychange', correr)
    return () => { vivo = false; document.removeEventListener('visibilitychange', correr) }
  }, [cuenta])

  async function sincronizarAhora() {
    if (!cuenta) return
    setSincronizando(true)
    const r = await sincronizar(cuenta.uid)
    setSincronizando(false)
    setError(r.ok ? null : (r.error ?? 'No se pudo sincronizar'))
    if (r.ok) { setUltima(r.cuando); location.reload() }
  }

  async function conectar() {
    setError(null)
    try {
      await entrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo entrar')
    }
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
        <button onClick={() => void conectar()} className="btn-primary self-start">
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
        {sincronizando ? 'Sincronizando…' : `Última sincronización: ${cuando(ultima)}`}
      </p>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => void sincronizarAhora()} disabled={sincronizando} className="btn-primary flex-1">
          Sincronizar ahora
        </button>
        <button onClick={() => void salir()} className="flex-1 text-sm underline">
          Desconectar
        </button>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Desconectar no borra nada: el progreso se queda en este aparato y en tu cuenta.
      </p>
    </div>
  )
}

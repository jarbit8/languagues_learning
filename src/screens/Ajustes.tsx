import { useRef, useState } from 'react'
import { buscarActualizacion } from '../lib/actualizacion'
import { exportarProgreso, importarProgreso, descargarArchivo } from '../lib/backup'

// Ajustes quedó reducido a lo único que el usuario usa: respaldar el progreso y forzar
// actualización. Se quitaron (2026-07-25, "elimina todo eso"): la API key de Anthropic (nunca la
// va a usar — sin ella los exámenes usan el prompt copiable y la autoevaluación), el diagnóstico
// de voces TTS (su equipo ya tiene voz en inglés) y la velocidad de audio.
// PENDIENTE: esta pantalla pasará a ser "Cuenta" cuando se monte la sincronización con Firebase
// (login con Google + progreso compartido entre PC y celular), pedida por el usuario.
export default function Ajustes() {
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [estadoAct, setEstadoAct] = useState<'idle' | 'buscando' | 'actualizando' | 'al-dia' | 'no-soportado'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)

  async function exportar() {
    const json = await exportarProgreso()
    descargarArchivo(json, `idiomas-progreso-${new Date().toISOString().slice(0, 10)}.json`)
  }

  async function importar(file: File) {
    try {
      const texto = await file.text()
      await importarProgreso(texto)
      setMensaje('Progreso importado ✓')
    } catch {
      setMensaje('El archivo no es válido.')
    }
    setTimeout(() => setMensaje(null), 3000)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="tarjeta flex flex-col gap-3">
        <p className="font-semibold">Tu progreso</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Por ahora tu progreso vive solo en este dispositivo. Expórtalo de vez en cuando para no perderlo.
        </p>
        <div className="flex gap-2">
          <button onClick={exportar} className="btn flex-1 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            Exportar
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="btn flex-1 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
          >
            Importar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])}
          />
        </div>
        {mensaje && <p className="text-center text-sm text-emerald-600 dark:text-emerald-400">{mensaje}</p>}
      </div>

      <div className="tarjeta flex flex-col gap-2 text-sm">
        <p className="font-semibold">Versión de la app</p>
        <p className="text-slate-500 dark:text-slate-400">
          Se actualiza sola al abrirla. Si crees que ves una versión vieja, fuérzalo aquí.
        </p>
        <button
          onClick={async () => {
            setEstadoAct('buscando')
            const r = await buscarActualizacion()
            setEstadoAct(r === 'actualizando' ? 'actualizando' : r === 'al-dia' ? 'al-dia' : 'no-soportado')
          }}
          className="btn bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
        >
          {estadoAct === 'buscando'
            ? 'Buscando…'
            : estadoAct === 'actualizando'
              ? 'Actualizando y recargando…'
              : estadoAct === 'al-dia'
                ? 'Ya tienes la última ✓'
                : estadoAct === 'no-soportado'
                  ? 'No disponible aquí'
                  : 'Buscar actualización'}
        </button>
      </div>
    </div>
  )
}

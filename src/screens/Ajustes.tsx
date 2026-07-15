import { useRef, useState } from 'react'
import { getApiKey, setApiKey } from '../lib/apiKey'
import { estadoVoces, getVelocidad, setVelocidad } from '../lib/audio'
import { getModo, setModo, type ModoApariencia } from '../lib/apariencia'
import { exportarProgreso, importarProgreso, descargarArchivo } from '../lib/backup'

export default function Ajustes() {
  const [key, setKey] = useState(getApiKey())
  const [guardada, setGuardada] = useState(false)
  const [velocidad, setVelocidadLocal] = useState(getVelocidad())
  const [modo, setModoLocal] = useState<ModoApariencia>(getModo())
  const [mensaje, setMensaje] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const voces = estadoVoces()

  function guardarKey() {
    setApiKey(key)
    setGuardada(true)
    setTimeout(() => setGuardada(false), 2000)
  }

  function cambiarVelocidad(v: number) {
    setVelocidadLocal(v)
    setVelocidad(v)
  }

  function cambiarModo(m: ModoApariencia) {
    setModoLocal(m)
    setModo(m)
  }

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
        <p className="font-semibold">API key de Anthropic</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Para hablar con el tutor IA y corregir tu writing. Tu key queda solo en este dispositivo, nunca la
          subas al repo, es público.
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-…"
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900 dark:border-slate-600 dark:bg-slate-900"
        />
        <button onClick={guardarKey} className="btn-primary">
          {guardada ? 'Guardada ✓' : 'Guardar'}
        </button>
      </div>

      <div className="tarjeta flex flex-col gap-2 text-sm">
        <p className="font-semibold">Voces de audio detectadas</p>
        <p className="text-slate-500 dark:text-slate-400">
          Inglés: {voces.en ? '✓' : '✗'} · Francés: {voces.fr ? '✓' : '✗'} · total {voces.total}
        </p>
        {(!voces.en || !voces.fr) && (
          <p className="text-amber-600 dark:text-amber-300">
            Falta alguna voz. En el celular instálala en Ajustes del sistema → Idioma → Texto a voz.
          </p>
        )}
      </div>

      <div className="tarjeta flex flex-col gap-3">
        <p className="font-semibold">Velocidad de audio</p>
        <input
          type="range"
          min={0.5}
          max={1.2}
          step={0.05}
          value={velocidad}
          onChange={(e) => cambiarVelocidad(Number(e.target.value))}
        />
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">{velocidad.toFixed(2)}x</p>
      </div>

      <div className="tarjeta flex flex-col gap-3">
        <p className="font-semibold">Apariencia</p>
        <div className="flex rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
          {(['light', 'system', 'dark'] as const).map((m) => (
            <button
              key={m}
              onClick={() => cambiarModo(m)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                modo === m ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'
              }`}
            >
              {m === 'light' ? 'Claro' : m === 'dark' ? 'Oscuro' : 'Sistema'}
            </button>
          ))}
        </div>
      </div>

      <div className="tarjeta flex flex-col gap-3">
        <p className="font-semibold">Tu progreso</p>
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
    </div>
  )
}

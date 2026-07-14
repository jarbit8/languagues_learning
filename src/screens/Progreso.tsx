import { estadoVoces } from '../lib/audio'

export default function Progreso() {
  const voces = estadoVoces()
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Progreso</h1>
      <p className="tarjeta text-slate-500 dark:text-slate-400">
        El mapa de los 24 temas, palabras dominadas/en repaso y el historial de exámenes llegan en la Fase 5.
      </p>
      <div className="tarjeta flex flex-col gap-1 text-sm">
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
    </div>
  )
}

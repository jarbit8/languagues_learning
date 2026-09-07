import { useSyncExternalStore } from 'react'
import { estadoVoces, suscribirVoces } from '../lib/audio'

// Si el aparato no tiene NINGUNA voz inglesa instalada, speechSynthesis no falla: lee el
// inglés con la voz del sistema, que aquí es española, y suena a disparate sin que nada lo
// explique. Pasaba callado —`estadoVoces` existía desde siempre y no lo llamaba nadie— y en
// las pantallas donde el audio ES el material (escuchar, pronunciar) eso arruina el ejercicio
// entero: no se sabe si oíste mal o si la voz está mal.
//
// Mientras `total` sea 0 no se pinta nada: las voces llegan de forma asíncrona y avisar antes
// de que carguen sería un falso positivo en cada arranque.
export default function AvisoVoz() {
  const estado = useSyncExternalStore(suscribirVoces, () => JSON.stringify(estadoVoces()))
  const { en, total } = JSON.parse(estado) as { en: boolean; total: number }
  if (en || total === 0) return null

  return (
    <div className="tarjeta border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30">
      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">⚠️ Este aparato no tiene voz en inglés</p>
      <p className="mt-1 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
        El audio lo va a leer la voz del sistema, en español, y sonará mal. En Android:
        Ajustes → Sistema → Idiomas → Texto a voz → instalar el paquete de inglés. En Windows:
        Configuración → Hora e idioma → Voz → agregar voces → English.
      </p>
    </div>
  )
}

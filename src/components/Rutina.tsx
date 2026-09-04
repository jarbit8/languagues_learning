import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { temaEnCurso } from '../lib/progreso'
import { getVocabPack, temasDisponibles } from '../data/packs'
import SelectorDia from './SelectorDia'
import { MIN_CANCION, MIN_SERIE, PRESUPUESTO_PRACTICAR, resumenDelNivel, tiemposDe } from '../lib/tiempos'

// TU DÍA: qué tocar cada día y cuánto dura, sacado del contenido real del tema y no de un
// número escrito a mano. Nace de una pregunta suya que merecía respuesta con datos: "¿ese
// tiempo alcanza para cubrir cada tema?".
//
// El orden del bloque de práctica es el que él fijó: escuchar → hablar → escribir → leer,
// 45 minutos antes de dormir y en papel. Aprender va aparte, en el móvil y a cualquier hora.

const min = (n: number) => `${Math.round(n)} min`

// Se calcula una vez: recorre los 24 temas y no depende de en cuál estés.
const NIVEL = resumenDelNivel(temasDisponibles)

function Fila({ icono, nombre, detalle, minutos }: { icono: string; nombre: string; detalle: string; minutos: number }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="w-5 shrink-0">{icono}</span>
      <span className="font-medium">{nombre}</span>
      <span className="flex-1 text-xs text-slate-500 dark:text-slate-400">{detalle}</span>
      <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">{min(minutos)}</span>
    </div>
  )
}

export default function Rutina() {
  const temaActual = useLiveQuery(() => temaEnCurso(), [], 1) ?? 1
  const [dia, setDia] = useState<1 | 2>(1)
  const t = tiemposDe(temaActual, dia)
  const pack = getVocabPack(temaActual)
  const palabrasDelDia = Math.round((pack?.conceptos.length ?? 0) / 2)

  const pasado = t.practicar - PRESUPUESTO_PRACTICAR
  const seVaDeLargo = pasado > 1

  return (
    <div className="tarjeta flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">Tu día · tema {temaActual}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {min(t.total)} en la app
        </span>
      </div>

      <SelectorDia dia={dia} onCambio={setDia} />

      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Aprender · en el móvil, a cualquier hora · {min(t.aprender)}
        </p>
        <Fila icono="🗂️" nombre="Tarjetas" detalle={`${palabrasDelDia} palabras nuevas`} minutos={t.tarjetas} />
        <Fila icono="📘" nombre="Gramática" detalle="la regla del tema y sus ejercicios" minutos={t.gramatica} />
        <Fila icono="📝" nombre="Examen diario" detalle="lo de hoy más los repasos que venzan" minutos={t.examen} />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Practicar · antes de dormir, en papel · {min(t.practicar)}
        </p>
        <Fila icono="🎧" nombre="Escuchar" detalle="2 diálogos, dos pasadas" minutos={t.escuchar} />
        <Fila icono="🗣️" nombre="Hablar" detalle="con la IA, en el móvil" minutos={t.hablar} />
        <Fila icono="✍️" nombre="Escribir" detalle="la consigna del día, a mano" minutos={t.escribir} />
        <Fila icono="📖" nombre="Leer" detalle="2 lecturas, dos pasadas" minutos={t.leer} />
      </div>

      <div
        className={`rounded-lg px-3 py-2 text-xs ${
          seVaDeLargo
            ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
            : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
        }`}
      >
        {seVaDeLargo ? (
          <>
            Este día sale en <strong>{min(t.practicar)}</strong>, {min(pasado)} por encima de los 45 que te pusiste.
            Todo lo que se pasa está en <strong>Leer</strong>: presupuestaste 15 min y las dos lecturas de este tema
            piden {min(t.leer)} leyéndolas dos veces. O le das 50 min al bloque, o lees cada texto una vez y solo
            relees el trozo que pide cada pregunta.
          </>
        ) : (
          <>
            Este día entra en los 45 minutos: sale en <strong>{min(t.practicar)}</strong>. El tema queda cubierto
            entero entre sus dos días.
          </>
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        En todo el A1 son {NIVEL.dias} días de práctica: {NIVEL.diasQueSePasan} se pasan de los 45 minutos y la media
        sale en {min(NIVEL.media)}. El más largo es el tema {NIVEL.peor.tema}, día {NIVEL.peor.dia}, con{' '}
        {min(NIVEL.peor.minutos)}. Cubrir el tema no es el problema — el material entra entero en los dos días; lo que
        no cuadra es el presupuesto, que se quedó corto por unos minutos.
      </p>

      <div className="flex flex-col gap-1 border-t border-slate-200 pt-2 dark:border-slate-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Fuera de la app
        </p>
        <Fila
          icono="📺"
          nombre="Un capítulo"
          detalle="serie que ya viste, audio y subtítulos en inglés"
          minutos={MIN_SERIE}
        />
        <Fila icono="🎵" nombre="Una canción" detalle="a la semana, entendida del todo" minutos={MIN_CANCION} />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          La serie es para el oído: ya sabes lo que pasa, así que tu cabeza queda libre para escuchar cómo lo dicen.
          Subtítulos en inglés, nunca en español. La canción va sin letra primero, con letra en inglés después, y solo
          al final buscas lo que se te atragantó — y no la uses de modelo de gramática, que las canciones rompen las
          reglas a propósito.
        </p>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Son estimaciones calculadas del contenido de cada tema, no un cronómetro. Con la serie, el día te sale en
        torno a {min(t.total + MIN_SERIE)}.
      </p>
    </div>
  )
}

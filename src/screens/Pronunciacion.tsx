import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { GrupoPron, ParMinimo, PracticaPron } from '../types'
import { pronPack } from '../data/packs'
import { hablar } from '../lib/audio'
import { baraja } from '../lib/preguntas'
import { db } from '../db'
import { marcarPracticado } from '../lib/pronunciacion'


// --- Entrenador de oído: suena UNA de las dos palabras del par y hay que acertar cuál fue.
// Es el ejercicio clásico de pares mínimos, lo que más entrena el oído para el listening.
function EntrenadorOido({ grupo, onSalir }: { grupo: GrupoPron; onSalir: () => void }) {
  const rondas = useMemo(() => {
    const base: { par: ParMinimo; esA: boolean }[] = []
    // 8 rondas mezclando los pares del grupo, alternando cuál de las dos suena
    for (let i = 0; i < 8; i++) {
      const par = grupo.pares![i % grupo.pares!.length]
      base.push({ par, esA: Math.random() < 0.5 })
    }
    return baraja(base)
  }, [grupo])

  const [idx, setIdx] = useState(0)
  const [elegido, setElegido] = useState<'a' | 'b' | null>(null)
  const [aciertos, setAciertos] = useState(0)
  const [fin, setFin] = useState(false)

  const ronda = rondas[idx]
  const correcta = ronda.esA ? 'a' : 'b'
  const palabraSonando = ronda.esA ? ronda.par.a : ronda.par.b

  function elegir(cual: 'a' | 'b') {
    if (elegido) return
    setElegido(cual)
    if (cual === correcta) setAciertos((n) => n + 1)
  }

  function siguiente() {
    if (idx + 1 >= rondas.length) {
      setFin(true)
      return
    }
    setIdx((i) => i + 1)
    setElegido(null)
  }

  if (fin) {
    const pct = Math.round((aciertos / rondas.length) * 100)
    void marcarPracticado(grupo.id, pct)
    const emoji = pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪'
    return (
      <div className="flex flex-col gap-4">
        <div className="tarjeta flex flex-col items-center gap-2 py-8">
          <span className="text-5xl">{emoji}</span>
          <span className="text-5xl font-black">{pct}%</span>
          <span className="text-slate-500 dark:text-slate-400">
            {aciertos} de {rondas.length} · oído entrenado
          </span>
        </div>
        <button onClick={onSalir} className="btn-primary">
          Volver a pronunciación
        </button>
      </div>
    )
  }

  const Opcion = ({ cual }: { cual: 'a' | 'b' }) => {
    const p = cual === 'a' ? ronda.par.a : ronda.par.b
    const estado = elegido && (cual === correcta ? 'bien' : cual === elegido ? 'mal' : null)
    return (
      <button
        onClick={() => elegir(cual)}
        disabled={!!elegido}
        className={`btn min-h-[64px] flex-col items-start gap-0 ${
          estado === 'bien'
            ? 'bg-emerald-500 text-white'
            : estado === 'mal'
              ? 'bg-rose-500 text-white'
              : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
        }`}
      >
        <span className="text-base font-bold">{p.palabra}</span>
        <span className="text-xs opacity-80">{p.es}</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onSalir} className="self-start text-sm text-slate-500 underline dark:text-slate-400">
        ← Salir del entrenamiento
      </button>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {grupo.titulo} · {idx + 1}/{rondas.length}
      </p>

      <div className="tarjeta flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">¿Cuál escuchaste?</p>
        <button
          onClick={() => hablar(palabraSonando.palabra)}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-3xl text-white dark:bg-white dark:text-slate-900"
        >
          🔊
        </button>
        <button
          onClick={() => hablar(palabraSonando.palabra)}
          className="text-xs text-slate-400 underline"
        >
          repetir
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Opcion cual="a" />
        <Opcion cual="b" />
      </div>

      {elegido && (
        <button onClick={siguiente} className="btn-primary">
          {idx + 1 >= rondas.length ? 'Ver resultado' : 'Siguiente'}
        </button>
      )}
    </div>
  )
}

function GrupoCard({
  grupo,
  onEntrenar,
  practica,
  abrirInicial
}: {
  grupo: GrupoPron
  onEntrenar: () => void
  practica?: PracticaPron
  abrirInicial?: boolean
}) {
  const [abierto, setAbierto] = useState(!!abrirInicial)
  const caja = useRef<HTMLDivElement>(null)

  // Al llegar desde una tarjeta de vocabulario ("¿cómo se hace este sonido?") el grupo se
  // abre solo y se trae a la vista: con 23 grupos, dejarlo al usuario sería inútil.
  // Y cuenta como practicado igual que si lo hubiera desplegado a mano: lo que importa es
  // que la lección se leyó, no por qué puerta se entró.
  useEffect(() => {
    if (!abrirInicial) return
    caja.current?.scrollIntoView({ block: 'start' })
    void marcarPracticado(grupo.id)
  }, [abrirInicial, grupo.id])

  function alternar() {
    const abriendo = !abierto
    setAbierto(abriendo)
    // Abrir el grupo ES practicarlo: se lee la explicación y se tocan los audios.
    if (abriendo) void marcarPracticado(grupo.id)
  }

  return (
    <div ref={caja} className="tarjeta flex flex-col gap-3">
      <button onClick={alternar} className="flex items-start gap-3 text-left">
        <div className="flex-1">
          <p className="font-bold leading-snug">{grupo.titulo}</p>
          <p className="text-xs text-rose-600 dark:text-rose-300">{grupo.dificultad}</p>
          {practica && (
            <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              ✓ ya lo practicaste
              {practica.ultimoPct !== undefined && ` · último oído ${practica.ultimoPct}%`}
            </p>
          )}
        </div>
        <span className="text-slate-400">{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-slate-700">
          <p className="text-sm leading-relaxed">{grupo.explicacion}</p>

          <div className="rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/40">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
              💡 Cómo hacerlo
            </p>
            <p className="mt-0.5 text-sm text-emerald-900 dark:text-emerald-100">{grupo.truco}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Escucha y repite</p>
            {grupo.ejemplos.map((ej, i) => (
              <button
                key={i}
                onClick={() => hablar(ej.palabra)}
                className="flex min-h-[52px] items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-left dark:bg-slate-900"
              >
                <span className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold">
                    {ej.palabra} <span className="font-normal text-slate-400">· {ej.es}</span>
                  </span>
                  <span className="text-xs italic text-indigo-500 dark:text-indigo-300">/ {ej.pron} /</span>
                </span>
                <span className="text-xl">🔊</span>
              </button>
            ))}
          </div>

          {!!grupo.pares?.length && (
            <button onClick={onEntrenar} className="btn-primary">
              🎧 Entrenar el oído ({grupo.pares!.length} pares)
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Pronunciacion() {
  const pack = pronPack
  const [entrenando, setEntrenando] = useState<GrupoPron | null>(null)
  // `?pron=<id>` lo pone el enlace de la tarjeta de vocabulario.
  const destacado = new URLSearchParams(useLocation().search).get('pron')
  const practicados = useLiveQuery(() => db.practicaPron.toArray(), [], [] as PracticaPron[])
  const porId = new Map((practicados ?? []).map((p) => [p.id, p]))

  if (!pack) return <p className="tarjeta">Aún no hay guía de pronunciación.</p>
  if (entrenando) return <EntrenadorOido grupo={entrenando} onSalir={() => setEntrenando(null)} />

  const conPares = pack.grupos.filter((g) => g.pares?.length).length

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Los {pack.grupos.length} puntos donde a un hispanohablante se le nota el acento — y dónde se pierde
        entendiendo. {conPares} traen entrenamiento de oído con pares mínimos.
      </p>
      {pack.grupos.map((g) => (
        <GrupoCard
          key={g.id}
          grupo={g}
          practica={porId.get(g.id)}
          abrirInicial={g.id === destacado}
          onEntrenar={() => setEntrenando(g)}
        />
      ))}
    </div>
  )
}

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import type { Pregunta } from '../types'
import {
  temaEnCurso,
  estadoExamenTema,
  registrarExamenTema,
  bloqueEnCurso,
  estadoExamenBloque,
  estadoExamenFinal,
  getProgresoNivel
} from '../lib/progreso'
import { getVocabPack } from '../data/packs'
import { construirExamenDiario, idsExamenDiario, marcarExaminadasHoy } from '../lib/examenDiario'
import { construirExamenTema } from '../lib/examenTema'
import { registrarResultado } from '../lib/srs'
import ExamRunner from '../components/ExamRunner'
import ExamenBloque from './ExamenBloque'
import ExamenFinal from './ExamenFinal'

type Vista =
  | { modo: 'hub' }
  | { modo: 'diario'; preguntas: Pregunta[] }
  | { modo: 'tema'; tema: number; preguntas: Pregunta[] }
  | { modo: 'bloque'; bloque: number }
  | { modo: 'final' }
  | { modo: 'fin'; titulo: string; aciertos: number; total: number; nota?: string }

async function actualizarSrs(p: Pregunta, acierto: boolean) {
  if (p.palabraId) await registrarResultado(p.palabraId, acierto)
}

export default function Examen() {
  const [vista, setVista] = useState<Vista>({ modo: 'hub' })

  const info = useLiveQuery(async () => {
    const tema = await temaEnCurso()
    const pendientes = (await idsExamenDiario()).length
    const gateTema = await estadoExamenTema(tema)
    const pack = getVocabPack(tema)
    const bloque = await bloqueEnCurso()
    const gateBloque = await estadoExamenBloque(bloque)
    const gateFinal = await estadoExamenFinal()
    const nivel = await getProgresoNivel()
    return { tema, titulo: pack?.titulo ?? '', pendientes, gateTema, bloque, gateBloque, gateFinal, nivel }
  }, [])

  async function iniciarDiario() {
    const preguntas = await construirExamenDiario()
    if (!preguntas.length) {
      setVista({ modo: 'fin', titulo: 'Examen diario', aciertos: 0, total: 0, nota: 'vacio' })
      return
    }
    setVista({ modo: 'diario', preguntas })
  }

  function iniciarTema(tema: number) {
    setVista({ modo: 'tema', tema, preguntas: construirExamenTema(tema) })
  }

  if (vista.modo === 'bloque') {
    return <ExamenBloque bloque={vista.bloque} onSalir={() => setVista({ modo: 'hub' })} />
  }

  if (vista.modo === 'final') {
    return <ExamenFinal onSalir={() => setVista({ modo: 'hub' })} />
  }

  if (vista.modo === 'diario') {
    return (
      <ExamRunner
        preguntas={vista.preguntas}
        etiqueta="Diario"
        onAnswer={actualizarSrs}
        onFinish={async (aciertos, total) => {
          await marcarExaminadasHoy(vista.preguntas.map((p) => p.palabraId!).filter(Boolean))
          setVista({ modo: 'fin', titulo: 'Examen diario', aciertos, total, nota: 'entrenamiento' })
        }}
      />
    )
  }

  if (vista.modo === 'tema') {
    return (
      <ExamRunner
        preguntas={vista.preguntas}
        etiqueta="Tema"
        onAnswer={actualizarSrs}
        onFinish={async (aciertos, total) => {
          const pct = Math.round((aciertos / total) * 100)
          const aprobado = await registrarExamenTema(vista.tema, pct)
          setVista({
            modo: 'fin',
            titulo: 'Examen de tema',
            aciertos,
            total,
            nota: aprobado ? 'aprobado' : 'reprobado'
          })
        }}
      />
    )
  }

  if (vista.modo === 'fin') {
    if (vista.nota === 'vacio') {
      return (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Examen diario</h1>
          <div className="tarjeta text-slate-500 dark:text-slate-400">
            No hay nada que evaluar por ahora. Marca palabras nuevas o vuelve cuando tengas repasos vencidos.
          </div>
          <button onClick={() => setVista({ modo: 'hub' })} className="btn-primary">
            Volver
          </button>
        </div>
      )
    }
    const pct = Math.round((vista.aciertos / vista.total) * 100)
    const aprobado = vista.nota === 'aprobado'
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">{vista.titulo}</h1>
        <div className="tarjeta flex flex-col items-center gap-2 py-8">
          <span className={`text-5xl font-black ${vista.nota === 'reprobado' ? 'text-rose-500' : aprobado ? 'text-emerald-500' : ''}`}>
            {pct}%
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {vista.aciertos} de {vista.total} correctas
          </span>
          {vista.nota === 'aprobado' && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              ¡Aprobado! Siguiente tema desbloqueado 🎉
            </span>
          )}
          {vista.nota === 'reprobado' && (
            <span className="text-center text-sm text-slate-500 dark:text-slate-400">
              Necesitas 80%. Las palabras falladas volvieron al repaso; puedes repetir cuando quieras.
            </span>
          )}
        </div>
        <button onClick={() => setVista({ modo: 'hub' })} className="btn-primary">
          Volver a exámenes
        </button>
      </div>
    )
  }

  // hub
  if (!info) return <p className="tarjeta">Cargando…</p>
  const gt = info.gateTema
  const gb = info.gateBloque
  const gf = info.gateFinal
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Exámenes</h1>

      <button onClick={iniciarDiario} className="tarjeta flex items-center gap-3 text-left">
        <span className="text-2xl">📅</span>
        <div className="flex-1">
          <p className="font-semibold">Examen diario</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {info.pendientes > 0 ? `${info.pendientes} por evaluar` : 'Sin pendientes ahora'} · entrenamiento
          </p>
        </div>
        <span className="text-slate-400">›</span>
      </button>

      <button
        onClick={() => gt.disponible && iniciarTema(info.tema)}
        disabled={!gt.disponible}
        className={`tarjeta flex items-center gap-3 text-left ${gt.disponible ? '' : 'opacity-70'}`}
      >
        <span className="text-2xl">{gt.disponible ? '🎯' : '🔒'}</span>
        <div className="flex-1">
          <p className="font-semibold">Examen de tema {info.tema}</p>
          {gt.disponible ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Disponible · aprueba con 80%</p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Falta: {gt.faltaVocab ? `vocabulario (${gt.aprendidas}/${gt.total})` : ''}
              {gt.faltaVocab && (gt.faltaGramEn || gt.faltaGramFr) ? ' · ' : ''}
              {gt.faltaGramEn ? 'gramática EN' : ''}
              {gt.faltaGramEn && gt.faltaGramFr ? ' y ' : ''}
              {gt.faltaGramFr ? 'gramática FR' : ''}
            </p>
          )}
        </div>
        <span className="text-slate-400">›</span>
      </button>

      <button
        onClick={() => gb.disponible && setVista({ modo: 'bloque', bloque: info.bloque })}
        disabled={!gb.disponible}
        className={`tarjeta flex items-center gap-3 text-left ${gb.disponible ? '' : 'opacity-70'}`}
      >
        <span className="text-2xl">{gb.disponible ? '🧩' : '🔒'}</span>
        <div className="flex-1">
          <p className="font-semibold">Examen de bloque {info.bloque}</p>
          {gb.disponible ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Disponible · 4 habilidades · aprueba con 75%
            </p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Faltan temas: {gb.temasFaltantes.join(', ')}
            </p>
          )}
        </div>
        <span className="text-slate-400">›</span>
      </button>

      <button
        onClick={() => gf.disponible && setVista({ modo: 'final' })}
        disabled={!gf.disponible}
        className={`tarjeta flex items-center gap-3 text-left ${gf.disponible ? '' : 'opacity-70'}`}
      >
        <span className="text-2xl">{gf.disponible ? '🏆' : '🔒'}</span>
        <div className="flex-1">
          <p className="font-semibold">Examen final A1</p>
          {info.nivel?.estado === 'aprobado' ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">¡Nivel certificado! 🎓</p>
          ) : gf.disponible ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Disponible · 85% vocab / 80% habilidades
            </p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Faltan bloques: {gf.bloquesFaltantes.join(', ')}
            </p>
          )}
        </div>
        <span className="text-slate-400">›</span>
      </button>

      <Link to="/aprender" className="text-center text-sm text-slate-500 underline dark:text-slate-400">
        Ir a estudiar el tema
      </Link>
    </div>
  )
}

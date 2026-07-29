import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import type { Pregunta } from '../types'
import { idiomaUnico } from '../config'
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
import { construirExamenTema, type ExamenTema } from '../lib/examenTema'
import { registrarResultado } from '../lib/srs'
import ExamRunner from '../components/ExamRunner'
import ExamenBloque from './ExamenBloque'
import ExamenFinal from './ExamenFinal'

type Vista =
  | { modo: 'hub' }
  | { modo: 'diario'; preguntas: Pregunta[] }
  // El examen de tema son dos secciones seguidas, con nota propia cada una.
  | { modo: 'tema'; tema: number; examen: ExamenTema; paso: 'vocab' | 'gramatica'; notaVocab?: number }
  | { modo: 'bloque'; bloque: number }
  | { modo: 'final' }
  | { modo: 'fin'; titulo: string; aciertos: number; total: number; nota?: string }
  | { modo: 'finTema'; tema: number; notaVocab: number; notaGramatica: number; aprobado: boolean }

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
    setVista({ modo: 'tema', tema, examen: construirExamenTema(tema), paso: 'vocab' })
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
    const enVocab = vista.paso === 'vocab'
    const preguntas = enVocab ? vista.examen.vocab : vista.examen.gramatica
    return (
      <ExamRunner
        // key: fuerza a ExamRunner a reiniciarse al pasar de una sección a la otra.
        key={vista.paso}
        preguntas={preguntas}
        etiqueta={enVocab ? 'Tema · Vocabulario' : 'Tema · Gramática'}
        tiempoSegundos={preguntas.length * 30}
        onAnswer={actualizarSrs}
        onFinish={async (aciertos, total) => {
          const pct = Math.round((aciertos / total) * 100)
          if (enVocab) {
            setVista({ ...vista, paso: 'gramatica', notaVocab: pct })
            return
          }
          const notaVocab = vista.notaVocab ?? 0
          const aprobado = await registrarExamenTema(vista.tema, notaVocab, pct)
          setVista({ modo: 'finTema', tema: vista.tema, notaVocab, notaGramatica: pct, aprobado })
        }}
      />
    )
  }

  if (vista.modo === 'finTema') {
    const { notaVocab, notaGramatica, aprobado } = vista
    const Seccion = ({ nombre, nota }: { nombre: string; nota: number }) => (
      <div className="flex-1">
        <p className="text-slate-500 dark:text-slate-400">{nombre}</p>
        <p className={`text-2xl font-black ${nota >= 80 ? 'text-emerald-500' : 'text-rose-500'}`}>{nota}%</p>
        <p className="text-xs text-slate-400">{nota >= 80 ? 'aprobada' : 'necesitas 80%'}</p>
      </div>
    )
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Examen de tema {vista.tema}</h1>
        <div className="tarjeta flex gap-3 text-center">
          <Seccion nombre="Vocabulario" nota={notaVocab} />
          <div className="w-px bg-slate-200 dark:bg-slate-700" />
          <Seccion nombre="Gramática" nota={notaGramatica} />
        </div>
        {aprobado ? (
          <div className="tarjeta text-center">
            <p className="font-bold text-emerald-600 dark:text-emerald-400">
              ¡Aprobado! Siguiente tema desbloqueado 🎉
            </p>
          </div>
        ) : (
          <div className="tarjeta text-center text-sm text-slate-600 dark:text-slate-300">
            <p className="font-semibold">Hay que aprobar las dos secciones con 80%.</p>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              {notaGramatica < 80
                ? 'Repasa la lección de gramática del tema y vuelve a intentarlo; puedes repetir las veces que quieras.'
                : 'Las palabras falladas volvieron al repaso. Puedes repetir cuando quieras.'}
            </p>
          </div>
        )}
        <button onClick={() => setVista({ modo: 'hub' })} className="btn-primary">
          Volver a exámenes
        </button>
      </div>
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
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Disponible · vocabulario + gramática completa · 80% en cada una
            </p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Falta: {gt.faltaVocab ? `vocabulario (${gt.aprendidas}/${gt.total})` : ''}
              {gt.faltaVocab && (gt.faltaGramEn || gt.faltaGramFr) ? ' · ' : ''}
              {gt.faltaGramEn ? (idiomaUnico ? 'gramática' : 'gramática EN') : ''}
              {gt.faltaGramEn && gt.faltaGramFr ? ' y ' : ''}
              {gt.faltaGramFr ? (idiomaUnico ? 'gramática' : 'gramática FR') : ''}
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
              Disponible · 6 secciones · repaso de los 6 temas · aprueba con 75%
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

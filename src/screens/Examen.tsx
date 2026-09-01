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
import { CICLOS, construirExamenDelTema, idsDelTema, type CicloVocab } from '../lib/examenVocabulario'
import { getPlan, estadoDelPlan } from '../lib/plan'
import { registrarResultado } from '../lib/srs'
import ExamRunner from '../components/ExamRunner'
import ExamenBloque from './ExamenBloque'
import ExamenTema from './ExamenTema'
import ExamenFinal from './ExamenFinal'

type Vista =
  | { modo: 'hub' }
  | { modo: 'diario'; preguntas: Pregunta[] }
  | { modo: 'ciclo'; ciclo: CicloVocab; titulo: string; preguntas: Pregunta[] }
  // El examen de tema son dos secciones seguidas, con nota propia cada una.
  | { modo: 'tema'; tema: number }
  | { modo: 'bloque'; bloque: number }
  | { modo: 'final' }
  | { modo: 'fin'; titulo: string; aciertos: number; total: number; nota?: string }
  | { modo: 'finTema'; tema: number; notaVocab: number; notaGramatica: number; aprobado: boolean }

async function actualizarSrs(p: Pregunta, acierto: boolean) {
  if (p.palabraId) await registrarResultado(p.palabraId, acierto)
}

export default function Examen() {
  const [vista, setVista] = useState<Vista>({ modo: 'hub' })
  // Tema elegido en el módulo de gramática; por defecto, el tema en curso.

  const info = useLiveQuery(async () => {
    const tema = await temaEnCurso()
    const pendientes = (await idsExamenDiario()).length
    const gateTema = await estadoExamenTema(tema)
    const pack = getVocabPack(tema)
    const bloque = await bloqueEnCurso()
    const gateBloque = await estadoExamenBloque(bloque)
    const gateFinal = await estadoExamenFinal()
    const nivel = await getProgresoNivel()
    // El plan dice si HOY toca el examen del tema (día 2). Sin plan, siempre disponible.
    const plan = await getPlan()
    const jornada = plan ? estadoDelPlan(plan, tema).jornada : undefined
    // El examen de vocabulario del tema YA NO SE BLOQUEA (2026-08-30). Estaba atado al 2º día
    // del cronograma, y el cronograma es una guía que por regla no bloquea ni desbloquea nada
    // (regla 1 de CLAUDE.md: ritmo libre). Ahora está siempre disponible, como el diario:
    // si aún no has marcado palabras del tema, simplemente no hay nada que preguntar.
    const delTema = (await idsDelTema(tema)).length
    const ciclos = CICLOS.map((c) => ({
      ...c,
      cuantas: c.id === 'diario' ? pendientes : delTema,
      toca: true
    }))
    return { tema, titulo: pack?.titulo ?? '', pendientes, gateTema, bloque, gateBloque, gateFinal, nivel, ciclos }
  }, [])

  async function iniciarCiclo(ciclo: CicloVocab, titulo: string) {
    // El diario tiene su propio constructor: además de lo de hoy arrastra los repasos SRS
    // vencidos, que es su razón de ser. Los ciclos largos miran solo su ventana de días.
    const preguntas = ciclo === 'diario' ? await construirExamenDiario() : await construirExamenDelTema(info!.tema)
    if (!preguntas.length) {
      setVista({ modo: 'fin', titulo, aciertos: 0, total: 0, nota: 'vacio' })
      return
    }
    if (ciclo === 'diario') setVista({ modo: 'diario', preguntas })
    else setVista({ modo: 'ciclo', ciclo, titulo, preguntas })
  }


  function iniciarTema(tema: number) {
    setVista({ modo: 'tema', tema })
  }

  if (vista.modo === 'tema') {
    return <ExamenTema tema={vista.tema} onSalir={() => setVista({ modo: 'hub' })} />
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

  if (vista.modo === 'ciclo') {
    return (
      <ExamRunner
        key={vista.ciclo}
        preguntas={vista.preguntas}
        etiqueta={vista.titulo}
        onAnswer={actualizarSrs}
        onFinish={(aciertos, total) =>
          setVista({ modo: 'fin', titulo: vista.titulo, aciertos, total, nota: 'entrenamiento' })
        }
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

      {/* --- Módulo de vocabulario: los tres ciclos de repaso --- */}
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Vocabulario</h2>
      {info.ciclos.map((c) => {
        const cuantas = c.cuantas
        return (
          <button
            key={c.id}
            onClick={() =>
              c.toca && cuantas > 0 && iniciarCiclo(c.id, c.id === 'diario' ? 'Examen diario' : `Vocabulario del tema ${info.tema}`)
            }
            disabled={!c.toca || cuantas === 0}
            className={`tarjeta flex items-center gap-3 text-left ${c.toca && cuantas > 0 ? '' : 'opacity-70'}`}
          >
            <span className="text-2xl">{c.toca ? c.icono : '🔒'}</span>
            <div className="flex-1">
              <p className="font-semibold">
                {c.id === 'diario' ? 'Examen diario' : `Vocabulario del tema ${info.tema}`}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {cuantas > 0
                  ? `${cuantas} ${cuantas === 1 ? 'palabra' : 'palabras'} · entrenamiento`
                  : 'Marca palabras del tema y aparecerán aquí'}
              </p>
            </div>
            <span className="text-slate-400">›</span>
          </button>
        )
      })}

      {/* La sección "Por tema" se eliminó (2026-08-30). Tenía una versión de entrenamiento de
          las cinco destrezas, primero como cinco botones y luego encadenada, y acabó siendo un
          segundo examen del mismo tema al lado del de verdad: dos entradas casi iguales, una
          que cuenta y otra que no. El usuario lo quiso en UNO SOLO. El examen de tema de abajo
          ya entra todo, gramática incluida; el vocabulario tiene además su propia sección
          arriba. Los modos habListening/habReading/habWriting/habHablar siguen vivos porque son
          los pasos internos del examen de tema. */}

      {/* --- Los que sí abren contenido nuevo --- */}
      <h2 className="mt-2 text-sm font-bold uppercase tracking-wide text-slate-400">Progresión</h2>

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
              Disponible · 6 secciones · 80% en vocabulario y gramática, 75% en destrezas
            </p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Falta: {gt.faltaVocab ? `vocabulario (${gt.aprendidas}/${gt.total})` : ''}
              {gt.faltaVocab && gt.faltaGramatica ? ' · ' : ''}
              {gt.faltaGramatica ? 'gramática' : ''}
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

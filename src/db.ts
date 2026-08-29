import Dexie, { type Table } from 'dexie'
import type {
  PalabraEstado,
  ProgresoTema,
  ProgresoBloque,
  ProgresoNivel,
  HistorialExamen,
  PracticaPron,
  PlanEstudio
} from './types'

// Base local del progreso. Sin backend ni auth: todo vive en el dispositivo.
export class IdiomasDB extends Dexie {
  palabras!: Table<PalabraEstado, string>
  progresoTema!: Table<ProgresoTema, number>
  progresoBloque!: Table<ProgresoBloque, number>
  progresoNivel!: Table<ProgresoNivel, string>
  historialExamenes!: Table<HistorialExamen, number>
  practicaPron!: Table<PracticaPron, string>
  plan!: Table<PlanEstudio, string>

  constructor() {
    super('idiomas')
    this.version(1).stores({
      palabras: 'id, estado, proximoRepaso, fechaAprendida',
      progresoTema: 'temaId, estado'
    })
    this.version(2).stores({
      palabras: 'id, estado, proximoRepaso, fechaAprendida',
      progresoTema: 'temaId, estado',
      progresoBloque: 'bloqueId, estado',
      progresoNivel: 'id, estado',
      historialExamenes: '++id, tipo, fecha'
    })
    // v3: qué grupos de pronunciación ya se practicaron. Dexie conserva los datos de las
    // tablas anteriores al añadir una nueva, así que no hay migración que escribir.
    this.version(3).stores({
      palabras: 'id, estado, proximoRepaso, fechaAprendida',
      progresoTema: 'temaId, estado',
      progresoBloque: 'bloqueId, estado',
      progresoNivel: 'id, estado',
      historialExamenes: '++id, tipo, fecha',
      practicaPron: 'id'
    })
    // v4: el cronograma del nivel (una sola fila, id 'a1').
    this.version(4).stores({
      palabras: 'id, estado, proximoRepaso, fechaAprendida',
      progresoTema: 'temaId, estado',
      progresoBloque: 'bloqueId, estado',
      progresoNivel: 'id, estado',
      historialExamenes: '++id, tipo, fecha',
      practicaPron: 'id',
      plan: 'id'
    })
  }
}

export const db = new IdiomasDB()

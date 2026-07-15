import Dexie, { type Table } from 'dexie'
import type { PalabraEstado, ProgresoTema, ProgresoBloque, ProgresoNivel, HistorialExamen } from './types'

// Base local del progreso. Sin backend ni auth: todo vive en el dispositivo.
export class IdiomasDB extends Dexie {
  palabras!: Table<PalabraEstado, string>
  progresoTema!: Table<ProgresoTema, number>
  progresoBloque!: Table<ProgresoBloque, number>
  progresoNivel!: Table<ProgresoNivel, string>
  historialExamenes!: Table<HistorialExamen, number>

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
  }
}

export const db = new IdiomasDB()

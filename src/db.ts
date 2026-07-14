import Dexie, { type Table } from 'dexie'
import type { PalabraEstado, ProgresoTema } from './types'

// Base local del progreso. Sin backend ni auth: todo vive en el dispositivo.
export class IdiomasDB extends Dexie {
  palabras!: Table<PalabraEstado, string>
  progresoTema!: Table<ProgresoTema, number>

  constructor() {
    super('idiomas')
    this.version(1).stores({
      palabras: 'id, estado, proximoRepaso, fechaAprendida',
      progresoTema: 'temaId, estado'
    })
  }
}

export const db = new IdiomasDB()

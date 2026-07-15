import { db } from '../db'

export async function exportarProgreso(): Promise<string> {
  const [palabras, progresoTema, progresoBloque, progresoNivel, historialExamenes] = await Promise.all([
    db.palabras.toArray(),
    db.progresoTema.toArray(),
    db.progresoBloque.toArray(),
    db.progresoNivel.toArray(),
    db.historialExamenes.toArray()
  ])
  return JSON.stringify(
    { version: 1, exportadoEn: Date.now(), palabras, progresoTema, progresoBloque, progresoNivel, historialExamenes },
    null,
    2
  )
}

export async function importarProgreso(json: string): Promise<void> {
  const data = JSON.parse(json)
  await db.transaction(
    'rw',
    [db.palabras, db.progresoTema, db.progresoBloque, db.progresoNivel, db.historialExamenes],
    async () => {
      if (Array.isArray(data.palabras)) await db.palabras.bulkPut(data.palabras)
      if (Array.isArray(data.progresoTema)) await db.progresoTema.bulkPut(data.progresoTema)
      if (Array.isArray(data.progresoBloque)) await db.progresoBloque.bulkPut(data.progresoBloque)
      if (Array.isArray(data.progresoNivel)) await db.progresoNivel.bulkPut(data.progresoNivel)
      if (Array.isArray(data.historialExamenes)) await db.historialExamenes.bulkPut(data.historialExamenes)
    }
  )
}

export function descargarArchivo(contenido: string, nombre: string) {
  const blob = new Blob([contenido], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

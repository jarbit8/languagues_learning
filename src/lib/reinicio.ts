import { db } from '../db'

// Borra TODO el progreso local y deja la app como recién instalada: palabras marcadas y su
// SRS, temas, bloques, nivel, historial de exámenes, grupos de pronunciación practicados y el
// cronograma. No toca el contenido del curso, que vive en los data packs y no en la base.
//
// Existe porque el progreso solo vive en este dispositivo (no hay cuenta ni respaldo, decisión
// del usuario), así que sin esto no había forma de volver a cero salvo borrar los datos del
// navegador a mano, que además desinstalaría la PWA.
export async function reiniciarCurso(): Promise<void> {
  await db.transaction(
    'rw',
    [db.palabras, db.progresoTema, db.progresoBloque, db.progresoNivel, db.historialExamenes, db.practicaPron, db.plan],
    async () => {
      await Promise.all([
        db.palabras.clear(),
        db.progresoTema.clear(),
        db.progresoBloque.clear(),
        db.progresoNivel.clear(),
        db.historialExamenes.clear(),
        db.practicaPron.clear(),
        db.plan.clear()
      ])
    }
  )
}

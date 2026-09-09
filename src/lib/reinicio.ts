import { db } from '../db'

// Borra TODO el progreso local y deja la app como recién instalada. No toca el contenido del
// curso, que vive en los data packs y no en la base.
//
// Existe porque el progreso solo vive en este dispositivo (no hay cuenta ni respaldo, decisión
// del usuario), así que sin esto no había forma de volver a cero salvo borrar los datos del
// navegador a mano, que además desinstalaría la PWA.
//
// RECORRE `db.tables` EN VEZ DE LISTARLAS A MANO. La versión anterior nombraba las siete que
// había cuando se escribió y al añadir `abreviaciones` (v5) nadie volvió aquí: el reinicio
// dejaba vivas las marcadas con «La sé ✓» y el curso no quedaba en cero del todo. Con la lista
// que da Dexie, cualquier tabla que se añada mañana entra sola.
export async function reiniciarCurso(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
}

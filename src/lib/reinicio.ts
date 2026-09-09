import { db } from '../db'
import { leerEstado } from './autosync'
import { borrarRemoto } from './sync'

// Borra TODO el progreso y deja la app como recién instalada. No toca el contenido del curso,
// que vive en los data packs y no en la base.
//
// BORRA EN LOS DOS LADOS, y ese es el punto (2026-09-09, él: "si le doy al reinicio del curso,
// ¿por qué sigue mi progreso?"). La fusión de `sync.ts` es una UNIÓN que por diseño nunca
// borra —entre dos aparatos, sincronizar no puede hacer perder trabajo—, así que vaciar solo
// la base local no reiniciaba nada con la cuenta conectada: al recargar, la sincronización que
// arranca sola volvía a bajarse las 34 palabras de la nube y el progreso reaparecía intacto.
// Un borrado es la única operación que la unión no sabe expresar, así que hay que hacerlo
// aparte y ANTES de tocar lo local: si fallara la red, se queda todo como estaba en vez de
// dejar el aparato vacío y la nube llena, que es la combinación que lo resucita.
//
// Recorre `db.tables` en vez de listar las tablas a mano. La versión anterior nombraba las
// siete que había cuando se escribió y al añadir `abreviaciones` (v5) nadie volvió aquí, así
// que el reinicio dejaba vivas las marcadas con «La sé ✓». Con la lista que da Dexie,
// cualquier tabla que se añada mañana entra sola.
export async function reiniciarCurso(): Promise<void> {
  const uid = leerEstado().cuenta?.uid
  if (uid) await borrarRemoto(uid)
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  // Segunda pasada por la nube: entre el primer borrado y el vaciado local cabe la
  // sincronización con retardo que dispara cada examen (`sincronizarPronto`, 4 s), y esa
  // habría vuelto a subir lo local, que todavía estaba lleno. Si falla no se levanta el
  // reinicio —lo local ya está en cero y la próxima sincronización no baja nada que no
  // hayamos vuelto a escribir—, así que no arrastra el error.
  if (uid) await borrarRemoto(uid).catch(() => undefined)
}

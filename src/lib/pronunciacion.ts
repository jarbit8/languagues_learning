import type { GrupoPron } from '../types'
import { pronPack } from '../data/packs'
import { db } from '../db'

// Une las dos mitades de la pronunciación: el módulo explica los sonidos difíciles del
// nivel entero, pero esa explicación solo servía si entrabas al módulo. Aquí se detecta,
// desde la palabra, qué sonido problemático lleva, para poder enseñar el consejo JUNTO a
// la palabra (en su tarjeta) y no solo en una pantalla aparte.
//
// El patrón vive en el propio pack (`patron` + `prioridad`), no aquí: así la explicación
// y la regla que la dispara no se separan nunca. Gana el de menor `prioridad`, porque una
// palabra puede llevar varios sonidos difíciles ("three" tiene th y r) y un solo consejo
// enfocado ayuda más que tres avisos a la vez.
const CANDIDATOS: { grupo: GrupoPron; re: RegExp }[] = (pronPack?.grupos ?? [])
  .filter((g) => g.patron)
  .sort((a, b) => (a.prioridad ?? 99) - (b.prioridad ?? 99))
  .flatMap((grupo) => {
    try {
      return [{ grupo, re: new RegExp(grupo.patron!) }]
    } catch {
      // Un patrón mal escrito no puede tumbar la app: se ignora ese grupo.
      return []
    }
  })

// Los verbos se guardan como "to run" y las tarjetas pueden ser frases ("how are you?").
const normaliza = (texto: string) =>
  texto.toLowerCase().replace(/^to /, '').replace(/[¿?¡!.,]/g, '').trim()

export function consejoDePalabra(texto: string): GrupoPron | undefined {
  const w = normaliza(texto)
  return CANDIDATOS.find(({ re }) => re.test(w))?.grupo
}

// --- Marca de práctica ---------------------------------------------------------------
// Con 23 grupos y meses de estudio, sin memoria se acaba repasando siempre los tres de
// arriba. Esto NO puntúa ni desbloquea nada (el módulo es entrenamiento libre): solo
// recuerda por dónde ibas. Guardar el último % del entrenador es informativo, no una nota.

export async function marcarPracticado(id: string, pct?: number) {
  const previo = await db.practicaPron.get(id)
  await db.practicaPron.put({
    id,
    fecha: new Date().toISOString(),
    ultimoPct: pct ?? previo?.ultimoPct
  })
}

export function practicaDe(mapa: Record<string, { fecha: string; ultimoPct?: number }> | undefined, id: string) {
  return mapa?.[id]
}

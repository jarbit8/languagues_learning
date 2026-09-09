import Dexie, { type Table } from 'dexie'
import type {
  PalabraEstado,
  ProgresoTema,
  ProgresoBloque,
  ProgresoNivel,
  HistorialExamen,
  PracticaPron,
  PlanEstudio,
  AbreviacionSabida
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
  abreviaciones!: Table<AbreviacionSabida, string>

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
    // v5: qué abreviaciones marcó como sabidas. Otra tabla suelta, como practicaPron: Dexie
    // conserva lo anterior al añadirla, así que no hay migración que escribir.
    this.version(5).stores({
      palabras: 'id, estado, proximoRepaso, fechaAprendida',
      progresoTema: 'temaId, estado',
      progresoBloque: 'bloqueId, estado',
      progresoNivel: 'id, estado',
      historialExamenes: '++id, tipo, fecha',
      practicaPron: 'id',
      plan: 'id',
      abreviaciones: 'id'
    })
    // v6: los estados de una palabra cambian de nombre y de escalón (2026-09-09). La tabla no
    // cambia de forma, así que Dexie no migraría nada por su cuenta: hay que reescribir las
    // filas a mano o el progreso ya guardado se queda con estados que la app ya no entiende.
    //
    //   aprendida (nunca examinada)  → marcada, caja 0
    //   en_repaso caja 1 (la falló)  → fallada, caja 0
    //   en_repaso caja 2 (1 acierto) → aprendida ⭐, caja 1
    //   en_repaso caja 3 (2 aciertos)→ aprendida ⭐⭐, caja 2
    //   dominada                     → dominada, caja 3
    //
    // `proximoRepaso` NO se toca: las fechas que ya tenía siguen valiendo y el siguiente
    // acierto ya reparte con los días nuevos. Mover la fecha aquí le adelantaría o le
    // atrasaría repasos que ya tenía puestos.
    this.version(6)
      .stores({
        palabras: 'id, estado, proximoRepaso, fechaAprendida',
        progresoTema: 'temaId, estado',
        progresoBloque: 'bloqueId, estado',
        progresoNivel: 'id, estado',
        historialExamenes: '++id, tipo, fecha',
        practicaPron: 'id',
        plan: 'id',
        abreviaciones: 'id'
      })
      .upgrade((tx) =>
        tx
          .table('palabras')
          .toCollection()
          // Tipado suelto a propósito: aquí `estado` todavía trae los nombres VIEJOS, que ya
          // no están en `EstadoPalabra`, y con el tipo bueno TypeScript tumba las comparaciones.
          .modify((p: { estado: string; cajaSRS?: number }) => {
            // Una fila sin `cajaSRS` (sincronizada desde otro aparato, o de una versión vieja
            // del esquema) hacía `undefined - 1` = NaN y la palabra acababa en «aprendida» sin
            // ninguna estrella. Se toma la caja 1, que es la más conservadora: si de verdad
            // iba más adelante, el siguiente acierto la vuelve a subir.
            const caja = Number.isFinite(p.cajaSRS) ? (p.cajaSRS as number) : 1
            if (p.estado === 'aprendida') {
              p.estado = 'marcada'
              p.cajaSRS = 0
            } else if (p.estado === 'en_repaso') {
              if (caja <= 1) {
                p.estado = 'fallada'
                p.cajaSRS = 0
              } else {
                p.estado = 'aprendida'
                p.cajaSRS = caja - 1
              }
            } else if (p.estado === 'dominada') {
              p.cajaSRS = 3
            } else {
              p.cajaSRS = caja
            }
          })
      )
    // v7: repara lo que dejó rota la v6 antes de arreglarla. Una fila sin `cajaSRS` salía de
    // la migración como «aprendida» con la caja en NaN, y como `'⭐'.repeat(NaN)` es la cadena
    // vacía, la insignia se quedaba en «aprendida» pelada: todas las palabras se veían iguales.
    // La v6 ya no lo produce, pero a quien la haya corrido no le vuelve a pasar por encima —
    // Dexie ejecuta cada upgrade una sola vez—, así que la reparación va en su propia versión.
    this.version(7)
      .stores({
        palabras: 'id, estado, proximoRepaso, fechaAprendida',
        progresoTema: 'temaId, estado',
        progresoBloque: 'bloqueId, estado',
        progresoNivel: 'id, estado',
        historialExamenes: '++id, tipo, fecha',
        practicaPron: 'id',
        plan: 'id',
        abreviaciones: 'id'
      })
      .upgrade((tx) =>
        tx
          .table('palabras')
          .toCollection()
          .modify((p: { estado: string; cajaSRS?: number }) => {
            if (Number.isFinite(p.cajaSRS)) return
            p.cajaSRS = p.estado === 'dominada' ? 3 : p.estado === 'aprendida' ? 1 : 0
          })
      )
    // v8: RECONSTRUYE el escalón desde `aciertosSeguidos`, que es el único campo que ninguna
    // migración ha tocado nunca — lo escribe solo el SRS (0 al marcar, +1 al acertar, 0 al
    // fallar), así que dice exactamente cuántos aciertos seguidos lleva la palabra, que es
    // justo lo que define la caja.
    //
    // Hace falta porque la v7 reparaba a ojo: a toda fila con la caja rota le ponía ⭐, y si
    // eran muchas dejaba el vocabulario entero con una estrella, aplastando el progreso real
    // en vez de arreglarlo. Aquí no se adivina nada: se recalcula.
    //
    //   0 aciertos y algún fallo → ❌ fallada      0 aciertos y ninguno → 📌 marcada
    //   1 / 2 / 3 aciertos       → ⭐ / ⭐⭐ / ⭐⭐⭐    4 o más              → 🏆 dominada
    //
    // Las `dominada` de antes se respetan aunque lleven 3: se ganaron con las reglas viejas y
    // bajarlas a ⭐⭐⭐ sería cobrarles un repaso que ya habían pagado.
    this.version(8)
      .stores({
        palabras: 'id, estado, proximoRepaso, fechaAprendida',
        progresoTema: 'temaId, estado',
        progresoBloque: 'bloqueId, estado',
        progresoNivel: 'id, estado',
        historialExamenes: '++id, tipo, fecha',
        practicaPron: 'id',
        plan: 'id',
        abreviaciones: 'id'
      })
      .upgrade((tx) =>
        tx
          .table('palabras')
          .toCollection()
          .modify((p: { estado: string; cajaSRS?: number; aciertosSeguidos?: number; fallosTotales?: number }) => {
            if (p.estado === 'dominada') {
              p.cajaSRS = 3
              return
            }
            const aciertos = Number.isFinite(p.aciertosSeguidos) ? (p.aciertosSeguidos as number) : 0
            const fallos = Number.isFinite(p.fallosTotales) ? (p.fallosTotales as number) : 0
            if (aciertos >= 4) {
              p.estado = 'dominada'
              p.cajaSRS = 3
            } else if (aciertos >= 1) {
              p.estado = 'aprendida'
              p.cajaSRS = aciertos
            } else {
              // Sin ningún acierto encadenado: si alguna vez falló, lo último que pasó fue un
              // fallo (cualquier acierto habría dejado el contador en 1 o más).
              p.estado = fallos > 0 ? 'fallada' : 'marcada'
              p.cajaSRS = 0
            }
          })
      )
  }
}

export const db = new IdiomasDB()

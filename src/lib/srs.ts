import { db } from '../db'
import type { PalabraEstado } from '../types'
import { enDias } from './fechas'

// SRS de cuatro escalones. La caja decide CUÁNDO vuelve a salir una palabra, nunca cómo se
// pregunta. Los días se cuentan desde la medianoche de hoy, así que "vuelve en 2 días" es un
// día del calendario y no 48 horas exactas: si te examinas de noche, no se te adelanta.
//
//   caja 0 (📌 marcada / ❌ fallada)  → mañana
//   caja 1 (⭐)                        → +2 días
//   caja 2 (⭐⭐)                       → +5 días
//   caja 3 (⭐⭐⭐)                      → +7 días
//   acierto desde la caja 3           → 🏆 dominada, fuera del examen diario
const ESPERA = [1, 2, 5, 7]
const ULTIMA_CAJA = 3

export async function estadoDe(id: string) {
  return db.palabras.get(id)
}

// Marca/desmarca una palabra. Devuelve el nuevo estado (true = marcada).
export async function toggleAprendida(id: string): Promise<boolean> {
  const existente = await db.palabras.get(id)
  if (existente && existente.estado !== 'nueva') {
    await db.palabras.delete(id) // desmarcar (útil el mismo día)
    return false
  }
  const nueva: PalabraEstado = {
    id,
    estado: 'marcada',
    fechaAprendida: Date.now(),
    cajaSRS: 0,
    proximoRepaso: enDias(ESPERA[0]),
    aciertosSeguidos: 0,
    fallosTotales: 0
  }
  await db.palabras.put(nueva)
  return true
}

// Resultado en cualquier examen: sube un escalón o cae al principio. `desde` es el día del
// examen; solo la hoja en papel lo cambia, porque se califica al día siguiente de hacerla.
// Deja `ultimoExamen` puesto SIEMPRE, venga del examen que venga: sin eso, una palabra
// respondida en el examen de tema salía otra vez esa noche en la hoja, y al calificar una hoja
// impresa antes del examen se contaba dos veces el mismo repaso.
export async function registrarResultado(id: string, acierto: boolean, desde = Date.now()) {
  const p = await db.palabras.get(id)
  if (!p) return
  // Una fila con la caja rota (sin valor, o NaN de una migración vieja) haría NaN + 1 = NaN y
  // la palabra se quedaría atascada sin escalón. Se trata como caja 0: sube desde abajo.
  const actual = Number.isFinite(p.cajaSRS) ? p.cajaSRS : 0
  if (acierto) {
    const caja = actual + 1
    if (caja > ULTIMA_CAJA) {
      await db.palabras.update(id, {
        estado: 'dominada',
        cajaSRS: ULTIMA_CAJA,
        aciertosSeguidos: p.aciertosSeguidos + 1,
        proximoRepaso: undefined,
        ultimoExamen: Date.now()
      })
    } else {
      await db.palabras.update(id, {
        estado: 'aprendida',
        cajaSRS: caja,
        aciertosSeguidos: p.aciertosSeguidos + 1,
        proximoRepaso: enDias(ESPERA[caja], desde),
        ultimoExamen: Date.now()
      })
    }
  } else {
    // Un fallo devuelve al principio, venga de donde venga: si no te acuerdas, no te acuerdas.
    await db.palabras.update(id, {
      estado: 'fallada',
      cajaSRS: 0,
      aciertosSeguidos: 0,
      fallosTotales: p.fallosTotales + 1,
      proximoRepaso: enDias(ESPERA[0], desde),
      ultimoExamen: Date.now()
    })
  }
}

// Repasos vencidos (proximoRepaso <= ahora), sin castigo: solo se acumulan. Las dominadas no
// tienen fecha, así que quedan fuera por sí solas.
export async function repasosVencidos(): Promise<PalabraEstado[]> {
  const ahora = Date.now()
  const todas = await db.palabras.where('estado').anyOf('marcada', 'fallada', 'aprendida').toArray()
  return todas.filter((p) => p.proximoRepaso !== undefined && p.proximoRepaso <= ahora)
}

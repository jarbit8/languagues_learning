import { db } from '../db'
import type { PalabraEstado } from '../types'
import { enDias } from './fechas'

// SRS de 3 cajas: aprendida → en_repaso → dominada. Repaso a +1, +3, +7 días.
export async function estadoDe(id: string) {
  return db.palabras.get(id)
}

// Marca/desmarca una palabra como aprendida. Devuelve el nuevo estado (true = aprendida).
export async function toggleAprendida(id: string): Promise<boolean> {
  const existente = await db.palabras.get(id)
  if (existente && existente.estado !== 'nueva') {
    await db.palabras.delete(id) // desmarcar (útil el mismo día)
    return false
  }
  const nueva: PalabraEstado = {
    id,
    estado: 'aprendida',
    fechaAprendida: Date.now(),
    cajaSRS: 1,
    proximoRepaso: enDias(1),
    aciertosSeguidos: 0,
    fallosTotales: 0
  }
  await db.palabras.put(nueva)
  return true
}

// Resultado en cualquier examen: avanza o reinicia la caja SRS.
export async function registrarResultado(id: string, acierto: boolean) {
  const p = await db.palabras.get(id)
  if (!p) return
  if (acierto) {
    if (p.cajaSRS >= 3) {
      await db.palabras.update(id, {
        estado: 'dominada',
        aciertosSeguidos: p.aciertosSeguidos + 1,
        proximoRepaso: undefined
      })
    } else {
      const caja = p.cajaSRS + 1
      await db.palabras.update(id, {
        estado: 'en_repaso',
        cajaSRS: caja,
        aciertosSeguidos: p.aciertosSeguidos + 1,
        proximoRepaso: enDias(caja === 2 ? 3 : 7)
      })
    }
  } else {
    await db.palabras.update(id, {
      estado: 'en_repaso',
      cajaSRS: 1,
      aciertosSeguidos: 0,
      fallosTotales: p.fallosTotales + 1,
      proximoRepaso: enDias(1)
    })
  }
}

// Repasos vencidos (proximoRepaso <= ahora), sin castigo: solo se acumulan.
export async function repasosVencidos(): Promise<PalabraEstado[]> {
  const ahora = Date.now()
  const todas = await db.palabras.where('estado').anyOf('aprendida', 'en_repaso').toArray()
  return todas.filter((p) => p.proximoRepaso !== undefined && p.proximoRepaso <= ahora)
}

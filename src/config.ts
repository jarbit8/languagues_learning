import type { Idioma } from './types'

// ────────────────────────────────────────────────────────────────────────────
// INTERRUPTOR DE IDIOMAS DEL CURSO
//
// Decisión del usuario (2026-07-23): enfocar SOLO inglés. El francés era para la
// vía canadiense, que quedó descartada frente al plan directo a USA.
//
// Para volver a estudiar francés (solo, o en paralelo) basta EDITAR ESTA LÍNEA:
//   ['en']        → solo inglés (actual)
//   ['fr']        → solo francés
//   ['en', 'fr']  → los dos en paralelo (como estaba antes)
//
// Todo el contenido en francés sigue en /data intacto: los packs, la gramática,
// los diálogos, las lecturas y las consignas. No hay que regenerar NADA, solo
// cambiar este array — la UI, los exámenes y el gating se adaptan solos.
// ────────────────────────────────────────────────────────────────────────────
export const IDIOMAS_ACTIVOS: Idioma[] = ['en']

export const esIdiomaActivo = (i: Idioma): boolean => IDIOMAS_ACTIVOS.includes(i)

/** true cuando se estudia un solo idioma: la UI oculta los selectores EN/FR. */
export const idiomaUnico: Idioma | null = IDIOMAS_ACTIVOS.length === 1 ? IDIOMAS_ACTIVOS[0] : null

export const nombreIdioma = (i: Idioma): string => (i === 'en' ? 'inglés' : 'francés')

// Las notas 💡 del vocabulario siguen la convención "FR: ..." / "EN: ..." (o sin prefijo cuando
// valen para todos). Muchas comparan los dos idiomas ("EN usa 'to be'; FR usa 'avoir'"), así que
// con un solo idioma activo se ocultan las que hablan del otro y se limpia el prefijo redundante.
// Ojo: la comparación de "FR" es sensible a mayúsculas, si no el "en" del español haría match.
export function notaVisible(nota?: string): string | null {
  if (!nota) return null
  const inactivos = (['en', 'fr'] as Idioma[]).filter((i) => !esIdiomaActivo(i))
  for (const i of inactivos) {
    const sigla = i.toUpperCase()
    const nombre = nombreIdioma(i)
    if (new RegExp(`\\b${sigla}\\b`).test(nota) || new RegExp(nombre, 'i').test(nota)) return null
  }
  return idiomaUnico ? nota.replace(/^(EN|FR)\s*:\s*/, '') : nota
}

/** Título de la app según los idiomas activos, para la pantalla de Inicio. */
export function subtituloCurso(): string {
  const nombres = IDIOMAS_ACTIVOS.map(nombreIdioma)
  if (nombres.length === 1) return `${nombres[0][0].toUpperCase()}${nombres[0].slice(1)}, a tu ritmo · A1`
  return `${nombres.join(' y ')}, a tu ritmo · A1`
}

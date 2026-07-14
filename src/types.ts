// Tipos compartidos. El contenido vive en /data (JSON); Dexie solo guarda estado.

export type Idioma = 'en' | 'fr'

export interface ConceptoLado {
  texto: string
  ejemplo: string
}

export interface Concepto {
  id: string
  es: string
  en: ConceptoLado
  fr: ConceptoLado
  nota?: string
}

export interface VocabPack {
  tema: number
  titulo: string
  conceptos: Concepto[]
}

// --- Estado persistido (Dexie) ---

export type EstadoPalabra = 'nueva' | 'aprendida' | 'en_repaso' | 'dominada'

export interface PalabraEstado {
  id: string
  estado: EstadoPalabra
  fechaAprendida?: number
  cajaSRS: number
  proximoRepaso?: number
  aciertosSeguidos: number
  fallosTotales: number
  ultimoExamen?: number
}

export type EstadoTema = 'bloqueado' | 'en_curso' | 'aprobado'

export interface ProgresoTema {
  temaId: number
  estado: EstadoTema
  notaExamenTema?: number
  intentos: number
  gramaticaEnCompletada?: boolean
  gramaticaFrCompletada?: boolean
}

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

// --- Gramática (packs en /data/gramatica) ---

export type TipoEjercicio = 'hueco' | 'opcion_multiple' | 'ordenar' | 'corregir_error' | 'traducir'

export interface Ejercicio {
  tipo: TipoEjercicio
  enunciado: string
  opciones?: string[]
  respuesta: string
  aceptadas?: string[]
  pista?: string
}

export interface GramaticaPack {
  tema: number
  idioma: Idioma
  titulo: string
  regla: string
  trampa: string
  ejemplos: { frase: string; traduccion: string }[]
  ejercicios: Ejercicio[]
}

// --- Pregunta unificada (examen diario, de tema, ejercicios de gramática) ---

export type TipoPregunta =
  | 'audio_escribir'
  | 'es_a_en'
  | 'es_a_fr'
  | 'opcion_multiple'
  | 'hueco'
  | 'ordenar'
  | 'corregir_error'
  | 'traducir'

export interface Pregunta {
  tipo: TipoPregunta
  idioma: Idioma
  enunciado: string
  audioTexto?: string | null
  opciones?: string[]
  respuesta: string
  aceptadas?: string[]
  palabraId?: string
  pista?: string
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

// Tipos compartidos. El contenido vive en /data (JSON); Dexie solo guarda estado.

export type Idioma = 'en' | 'fr'

export interface ConceptoLado {
  texto: string
  ejemplo: string
  pron?: string
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
  pronunciacion: string
  trampa: string
  ejemplos: { frase: string; traduccion: string; comoSeLee?: string }[]
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
  | 'completar_dato'
  | 'anota_la_hora'
  | 'formulario'

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

// --- Listening (packs en /data/listening) ---

export interface LineaDialogo {
  hablante: string
  texto: string
}

export type TipoPreguntaListening = 'opcion_multiple' | 'vf' | 'completar_dato' | 'anota_la_hora'

export interface PreguntaListening {
  tipo: TipoPreguntaListening
  enunciado: string
  opciones?: string[]
  respuesta: string
  aceptadas?: string[]
}

export interface DialogoListening {
  titulo: string
  lineas: LineaDialogo[]
  preguntas: PreguntaListening[]
}

export interface ListeningPack {
  tema: number
  idioma: Idioma
  dialogos: DialogoListening[]
}

// Un diálogo ya "aplanado" con su tema/idioma, para pantallas que listan varios juntos.
export type DialogoConTema = DialogoListening & { tema: number; idioma: Idioma }

export type EstadoTema = 'bloqueado' | 'en_curso' | 'aprobado'

export interface ProgresoTema {
  temaId: number
  estado: EstadoTema
  notaExamenTema?: number
  intentos: number
  gramaticaEnCompletada?: boolean
  gramaticaFrCompletada?: boolean
}

// --- Speaking IA ---

export interface ErrorSpeaking {
  dijo: string
  correcto: string
  porque: string
}

export interface FeedbackSpeaking {
  tipo: 'feedback'
  bien: string
  errores: ErrorSpeaking[]
  nota?: number
}

// --- Bloques y nivel ---

export interface NotasBloque {
  listening?: number
  reading?: number
  writing?: number
  speaking?: number
}

export interface ProgresoBloque {
  bloqueId: number
  estado: EstadoTema
  notas?: NotasBloque
  intentos: number
}

export interface ProgresoNivel {
  id: string
  estado: EstadoTema
  notaVocab?: number
  notaHabilidades?: number
  intentos: number
}

export type TipoExamenHistorial = 'tema' | 'bloque' | 'final'

export interface HistorialExamen {
  id?: number
  tipo: TipoExamenHistorial
  ref: number | string
  fecha: number
  nota: number
  aprobado: boolean
}

// --- Reading (packs en /data/reading) ---

export interface PreguntaReading {
  tipo: 'vf' | 'opcion_multiple'
  enunciado: string
  opciones?: string[]
  respuesta: string
}

export interface ReadingPack {
  bloque: number
  idioma: Idioma
  titulo: string
  texto: string
  preguntas: PreguntaReading[]
}

// --- Writing (packs en /data/writing) ---

export interface WritingPack {
  bloque: number
  idioma: Idioma
  consigna: string
  minPalabras: number
  maxPalabras: number
  respuestaModelo: string
  checklist: string[]
}

// Tipos compartidos. El contenido vive en /data (JSON); Dexie solo guarda estado.

export interface Concepto {
  id: string
  es: string
  texto: string
  ejemplo: string
  pron?: string
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
  titulo: string
  regla: string
  pronunciacion: string
  trampa: string
  ejemplos: { frase: string; traduccion: string; comoSeLee?: string }[]
  ejercicios: Ejercicio[]
}

// --- Pregunta unificada (examen diario, de tema, ejercicios de gramática) ---

export type TipoPregunta =
  // Vocabulario: un solo tipo desde el 2026-08-30 (ver preguntas.ts). Se fueron
  // 'audio_escribir' y 'es_a_en', que ya no los produce nadie.
  | 'significado_escrito'
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

export type TipoPreguntaListening = 'opcion_multiple' | 'vf' | 'vfnd' | 'completar_dato' | 'anota_la_hora'

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
  dialogos: DialogoListening[]
}

// Un diálogo ya "aplanado" con su tema, para pantallas que listan varios juntos.
export type DialogoConTema = DialogoListening & { tema: number }

export type EstadoTema = 'bloqueado' | 'en_curso' | 'aprobado'

// Cronograma del nivel. Es una GUÍA, no una puerta: dice qué tema tocaría hoy según el
// plan y si vas al día, pero no desbloquea ni bloquea nada — eso lo sigue decidiendo el
// examen de tema (regla 1: se avanza por dominio). Sin plan, la app funciona igual que antes.
// Un parón: días de calendario en los que NO se avanza (semana de exámenes, viaje...).
// El plan no cuenta esos días, así que todo lo que venga después se corre solo.
export interface PausaPlan {
  desde: number
  hasta: number
  motivo?: string
}

export interface PlanEstudio {
  id: string
  fechaInicio: number
  diasPorTema: number
  pausas?: PausaPlan[]
}

export interface NotasBloque {
  vocab?: number
  gramatica?: number
  listening?: number
  reading?: number
  writing?: number
  speaking?: number
}

export interface ProgresoTema {
  temaId: number
  estado: EstadoTema
  notaExamenTema?: number
  intentos: number
  gramaticaCompletada?: boolean
  // Desde 2026-08-29 el examen de tema mide las 6 secciones, no solo vocab y gramática.
  notas?: NotasBloque
}

// --- Bloques y nivel ---


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
  notaGramatica?: number
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

// Misma forma que PreguntaListening: los packs de reading llevan desde siempre preguntas
// `completar_dato` con `aceptadas`, pero el tipo no las declaraba y los cuatro sitios que
// rearmaban la pregunta a mano se dejaban `aceptadas` fuera, asi que la correccion solo
// admitia la cadena exacta.
export interface PreguntaReading {
  tipo: TipoPreguntaListening
  enunciado: string
  opciones?: string[]
  respuesta: string
  aceptadas?: string[]
}

export interface TextoReading {
  titulo: string
  texto: string
  preguntas: PreguntaReading[]
}

export interface ReadingPack {
  tema: number
  textos: TextoReading[]
}

// --- Pronunciación (packs en /data/pronunciacion) ---

export interface EjemploPron {
  palabra: string
  pron: string
  es: string
}

export interface ParMinimo {
  a: { palabra: string; es: string }
  b: { palabra: string; es: string }
}

// Marca de "ya lo practiqué" por grupo de pronunciación. NO es una nota ni una puerta:
// el módulo es entrenamiento libre y transversal. Solo sirve para no repetir siempre los
// mismos grupos de arriba cuando son 23 y se repasan a lo largo de meses.
export interface PracticaPron {
  id: string
  fecha: string
  // Resultado del entrenador de oído: un dato, se guarda solo.
  ultimoPct?: number
  // Lo marca el USUARIO cuando decide que ya lo tiene claro, igual que "Aprendida ✓" en
  // vocabulario (regla de producto 2). Abrir el grupo o escuchar un audio NO lo marca:
  // eso solo decía que entraste, no que lo entendiste.
  claro?: boolean
}

export interface GrupoPron {
  id: string
  titulo: string
  dificultad: string
  explicacion: string
  truco: string
  ejemplos: EjemploPron[]
  pares: ParMinimo[]
  // Con qué palabras salta este consejo en la tarjeta de vocabulario, y en qué orden se
  // prueban los grupos (gana el número más bajo). Solo lo llevan los grupos detectables
  // desde la escritura de la palabra; los demás (ritmo, entonación, schwa…) no.
  patron?: string
  prioridad?: number
}

export interface PronPack {
  grupos: GrupoPron[]
}

// --- Rúbrica de examen (pack en /data/rubrica) ---

// Las palabras con las que está ESCRITA una pregunta, no las del temario. Desde el tema 9 los
// enunciados de reading van en inglés y se apoyan en este juego cerrado. Es una chuleta, no un
// pack de vocabulario: no entra al SRS ni se marca "aprendida" (la nota de producto 2 habla de
// las palabras que el usuario decide aprender; esto es material de consulta, como Pronunciación).
export interface PalabraRubrica {
  texto: string
  es: string
  pron: string
  ejemplo: string
  /** Si ya tiene tarjeta de vocabulario, en qué tema. Sin esto, es palabra solo de rúbrica. */
  tema?: number
}

export interface GrupoRubrica {
  titulo: string
  palabras: PalabraRubrica[]
}

export interface RubricaPack {
  titulo: string
  nota: string
  grupos: GrupoRubrica[]
}

// --- Writing (packs en /data/writing) ---

export interface ConsignaWriting {
  tema?: number
  consigna: string
  minPalabras: number
  maxPalabras: number
  respuestaModelo: string
  checklist: string[]
}

export interface WritingPack {
  bloque: number
  consignas: ConsignaWriting[]
}

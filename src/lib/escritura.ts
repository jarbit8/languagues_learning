import type { ConsignaWriting } from '../types'
import { gramaticaDelTema, vocabularioDesbloqueado } from './speaking'

// CORRECCIÓN DE ESCRITURA POR IA (2026-09-08, él: "lo de escribir corrige, y ese texto te lo
// voy a pasar a ti y tú calificarás qué tal lo hice; tú me debes decir si marco la casilla, ya
// que la IA me aprobó que está bien mi texto. Así como el de hablar").
//
// Antes escribía, veía la respuesta modelo y se autocalificaba con un checklist: era él
// puntuándose a sí mismo, que es justo lo que no sirve para detectar un error que no sabes que
// tienes. Ahora su texto entra dentro de un prompt copiable y quien decide es la IA, con el
// mismo veredicto LISTO/AÚN NO que ya usa hablar. La app sigue sin llamar a ninguna IA: el
// prompt se copia y se pega fuera.
//
// LA CORRECCIÓN VA EN ESPAÑOL, al revés que el tutor de hablar, que es inmersión total. No es
// una incoherencia: con las 34 palabras que conoce en el tema 1 no se puede explicar en inglés
// por qué falta el sujeto de una oración. Corregir es metalenguaje, como el veredicto.

// El checklist de la consigna deja de ser una casilla que marca él y pasa a ser el criterio
// con el que corrige la IA: son las condiciones escritas para ESA consigna, así que sirven
// mejor ahí que como autoevaluación.
function bloqueVeredictoEscritura(meta: string): string {
  return `\n\nDECISIÓN FINAL — es la parte más importante: esto decide ${meta}. Cierra SIEMPRE con el veredicto, en este formato exacto:\nVEREDICTO: LISTO ✅   (o bien)   VEREDICTO: AÚN NO ⏳\ny debajo UNA sola frase: si es LISTO, qué es lo que ya domina; si es AÚN NO, exactamente qué tiene que arreglar antes de volver a escribirlo.\nDi LISTO solo si cumple casi todo esto: hace lo que la consigna pide, está dentro del límite de palabras, se entiende de principio a fin, usa la gramática del tema sin errores graves, y no hay palabras en español ni inventadas. Una falta de ortografía suelta no lo tumba; un verbo mal conjugado, una frase sin sujeto o no responder a lo que se pedía, sí.\nSé honesto y exigente: si todavía no está, dile AÚN NO. Aprobarlo antes de tiempo no le hace ningún favor, porque se va a encontrar el problema más adelante.`
}

export function construirPromptCorreccion(
  consigna: ConsignaWriting,
  tema: number,
  dia: 1 | 2,
  texto: string,
  meta: string
): string {
  const gramatica = gramaticaDelTema(tema, dia)
  return `Eres un corrector de inglés escrito de nivel A1, con el criterio de un examinador de IELTS/TOEFL. Te paso una consigna y el texto que escribió el estudiante, y lo corriges tú: no le pidas que lo reescriba antes de corregirlo.

LA CONSIGNA: ${consigna.consigna}
LÍMITE: entre ${consigna.minPalabras} y ${consigna.maxPalabras} palabras.
LO QUE EL TEXTO TIENE QUE CUMPLIR: ${consigna.checklist.join(' · ')}
${gramatica ? `GRAMÁTICA QUE ESTÁ PRACTICANDO: ${gramatica}\n` : ''}EL ESTUDIANTE SOLO CONOCE ESTAS PALABRAS, así que no le corrijas metiéndole otras: ${vocabularioDesbloqueado(tema)}

SU TEXTO:
"""
${texto.trim()}
"""

Contéstame en ESPAÑOL (esto es corrección, no práctica del idioma) y en este orden:
1) UNA cosa concreta que hizo bien.
2) LOS ERRORES, máximo 6, uno por línea, con esta forma: lo que escribió → cómo se dice bien → por qué, en una frase corta. Di de cada uno si es de gramática, de vocabulario o de ortografía. Si no hay errores, dilo claramente en vez de inventarte alguno.
3) SU TEXTO REESCRITO BIEN, sin salirte de las palabras que él conoce, para que compare línea a línea.
4) Cuántas palabras tiene su texto y si entra en el límite.${bloqueVeredictoEscritura(meta)}`
}

import { getApiKey } from './apiKey'

// Llamada DIRECTA del navegador a Anthropic, sin backend. La key vive solo en localStorage.
const MODELO = 'claude-sonnet-4-5-20250929'

export interface MensajeChat {
  role: 'user' | 'assistant'
  content: string
}

export type ErrorIA = { tipo: 'sin_key' | 'sin_red' | 'key_invalida' | 'limite' | 'desconocido'; mensaje: string }

export class AnthropicError extends Error {
  info: ErrorIA
  constructor(info: ErrorIA) {
    super(info.mensaje)
    this.info = info
  }
}

async function llamar(systemPrompt: string, mensajes: MensajeChat[]): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new AnthropicError({ tipo: 'sin_key', mensaje: 'Necesitas pegar tu API key de Anthropic en Ajustes.' })
  }

  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 1000,
        system: systemPrompt,
        messages: mensajes
      })
    })
  } catch {
    throw new AnthropicError({ tipo: 'sin_red', mensaje: 'Necesitas conexión a internet para esto.' })
  }

  if (res.status === 401) {
    throw new AnthropicError({ tipo: 'key_invalida', mensaje: 'Tu API key no es válida. Revísala en Ajustes.' })
  }
  if (res.status === 429) {
    throw new AnthropicError({ tipo: 'limite', mensaje: 'Llegaste al límite de uso de tu API key. Intenta más tarde.' })
  }
  if (!res.ok) {
    throw new AnthropicError({ tipo: 'desconocido', mensaje: `Error de la API (${res.status}).` })
  }

  const data = await res.json()
  const texto = data?.content?.[0]?.text
  if (typeof texto !== 'string') {
    throw new AnthropicError({ tipo: 'desconocido', mensaje: 'Respuesta inesperada de la API.' })
  }
  return texto
}

export async function enviarMensaje(systemPrompt: string, historial: MensajeChat[]): Promise<string> {
  return llamar(systemPrompt, historial)
}

export async function corregirTexto(systemPrompt: string, texto: string): Promise<string> {
  return llamar(systemPrompt, [{ role: 'user', content: texto }])
}

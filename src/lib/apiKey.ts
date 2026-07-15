const CLAVE = 'anthropic.apiKey'

export function getApiKey(): string {
  return localStorage.getItem(CLAVE) ?? ''
}

export function setApiKey(key: string) {
  if (key.trim()) localStorage.setItem(CLAVE, key.trim())
  else localStorage.removeItem(CLAVE)
}

export function hayApiKey(): boolean {
  return getApiKey().length > 0
}

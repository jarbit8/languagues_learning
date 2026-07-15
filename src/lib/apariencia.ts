const CLAVE = 'apariencia.modo'

export type ModoApariencia = 'light' | 'dark' | 'system'

export function getModo(): ModoApariencia {
  return (localStorage.getItem(CLAVE) as ModoApariencia | null) ?? 'system'
}

export function aplicarModo(modo: ModoApariencia) {
  const oscuro = modo === 'dark' || (modo === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', oscuro)
}

export function setModo(modo: ModoApariencia) {
  localStorage.setItem(CLAVE, modo)
  aplicarModo(modo)
}

export function inicializarApariencia() {
  aplicarModo(getModo())
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getModo() === 'system') aplicarModo('system')
  })
}

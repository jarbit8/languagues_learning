import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User
} from 'firebase/auth'
import { getAuthRemoto, hayFirebase } from './firebase'

// Entrar con Google y nada más. No hay registro con correo y contraseña a propósito: la app
// no debe pedir ni guardar una contraseña, y con Google el usuario ya tiene cuenta.
//
// La sesión se guarda en el navegador (browserLocalPersistence), así que solo hay que entrar
// una vez por dispositivo.

export interface Cuenta {
  uid: string
  nombre: string | null
  correo: string | null
  foto: string | null
}

const aCuenta = (u: User): Cuenta => ({
  uid: u.uid,
  nombre: u.displayName,
  correo: u.email,
  foto: u.photoURL
})

// Avisa cada vez que cambia la sesión. Devuelve la función para dejar de escuchar.
// Si Firebase no está configurado, avisa una vez con null y no hace nada más.
export function observarCuenta(cb: (c: Cuenta | null) => void): () => void {
  const auth = getAuthRemoto()
  if (!auth) {
    cb(null)
    return () => {}
  }
  // Al volver de la redirección de Google la sesión ya viene resuelta aquí.
  getRedirectResult(auth).catch(() => {})
  return onAuthStateChanged(auth, (u) => cb(u ? aCuenta(u) : null))
}

export async function entrar(): Promise<void> {
  const auth = getAuthRemoto()
  if (!auth) throw new Error('Firebase no está configurado')
  await setPersistence(auth, browserLocalPersistence)
  const proveedor = new GoogleAuthProvider()
  try {
    await signInWithPopup(auth, proveedor)
  } catch (e) {
    // En la PWA instalada y en algunos navegadores de móvil la ventana emergente se bloquea;
    // ahí la redirección sí funciona.
    const codigo = (e as { code?: string }).code ?? ''
    if (/popup-blocked|popup-closed|operation-not-supported|cancelled-popup/.test(codigo)) {
      await signInWithRedirect(auth, proveedor)
      return
    }
    throw e
  }
}

export async function salir(): Promise<void> {
  const auth = getAuthRemoto()
  if (auth) await signOut(auth)
}

export { hayFirebase }

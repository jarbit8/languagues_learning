import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { initializeFirestore, type Firestore } from 'firebase/firestore/lite'

// Sincronización del progreso entre dispositivos (2026-09-03, pedido del usuario: "un día
// usaré celular, otro día el pc"). Firebase es SOLO una capa de sincronización: la fuente de
// verdad local sigue siendo Dexie y la app funciona entera sin red, como hasta ahora. Si no
// hay configuración o no hay internet, no pasa nada: no se sincroniza y ya está.
//
// Se usa `firestore/lite` a propósito: no hace falta tiempo real (el usuario usa un aparato
// cada vez, no dos a la vez) y pesa mucho menos que el SDK completo, que es lo que importa
// en una PWA que se precachea entera.
//
// La config va por variables de entorno y NO en el repo, que es público. Ojo: esto es
// higiene, no seguridad — la config viaja igual dentro del bundle y cualquiera puede leerla
// desde el navegador. Lo que de verdad protege los datos son las reglas de Firestore
// (firestore.rules) y que haya que iniciar sesión: cada usuario solo puede tocar su propio
// documento.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

export const hayFirebase = Boolean(config.apiKey && config.projectId && config.appId)

let app: FirebaseApp | undefined
let auth: Auth | undefined
let dbRemota: Firestore | undefined

export function getApp(): FirebaseApp | undefined {
  if (!hayFirebase) return undefined
  if (!app) app = initializeApp(config)
  return app
}

export function getAuthRemoto(): Auth | undefined {
  const a = getApp()
  if (!a) return undefined
  if (!auth) auth = getAuth(a)
  return auth
}

export function getDbRemota(): Firestore | undefined {
  const a = getApp()
  if (!a) return undefined
  // `ignoreUndefinedProperties` no es un capricho: Firestore revienta con "Unsupported field
  // value: undefined" en cuanto un objeto lleva una clave puesta a undefined, y aquí pasa
  // constantemente —una pausa sin motivo, un tema sin nota, una palabra sin ultimoExamen—
  // porque en Dexie y en TypeScript un opcional ausente y uno en undefined son lo mismo.
  // Con esto se manda como si la clave no estuviera, que es justo lo que significa.
  if (!dbRemota) dbRemota = initializeFirestore(a, { ignoreUndefinedProperties: true })
  return dbRemota
}

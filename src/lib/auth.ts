import { LS_SESSION_KEY } from './constants'

export interface Session {
  email: string
  workspaceSlug: string
  exp: number
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(LS_SESSION_KEY)
    if (!raw) return null
    const payload = JSON.parse(atob(raw.split('.')[1]))
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem(LS_SESSION_KEY)
      return null
    }
    return { email: payload.sub, workspaceSlug: payload.wsp, exp: payload.exp }
  } catch {
    return null
  }
}

export function saveToken(jwt: string) {
  localStorage.setItem(LS_SESSION_KEY, jwt)
}

export function clearSession() {
  localStorage.removeItem(LS_SESSION_KEY)
}

export function getToken(): string | null {
  return localStorage.getItem(LS_SESSION_KEY)
}

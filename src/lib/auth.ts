export interface Session {
  email: string
  workspaceSlug: string
  exp: number
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem('isol_session')
    if (!raw) return null
    const payload = JSON.parse(atob(raw.split('.')[1]))
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('isol_session')
      return null
    }
    return { email: payload.sub, workspaceSlug: payload.wsp, exp: payload.exp }
  } catch {
    return null
  }
}

export function saveToken(jwt: string) {
  localStorage.setItem('isol_session', jwt)
}

export function clearSession() {
  localStorage.removeItem('isol_session')
}

export function getToken(): string | null {
  return localStorage.getItem('isol_session')
}

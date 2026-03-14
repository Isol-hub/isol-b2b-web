import * as Sentry from '@sentry/react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import LandingPage from './pages/LandingPage'
import WorkspacePage from './pages/WorkspacePage'
import SettingsPage from './pages/SettingsPage'
import SessionsPage from './pages/SessionsPage'
import ViewerPage from './pages/ViewerPage'
import SharedSessionPage from './pages/SharedSessionPage'
import LegalPage from './pages/LegalPage'
import { getSession } from './lib/auth'

const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes)

function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = getSession()
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Syncs the logged-in user's email to Sentry so every event is attributed. */
function SentryUserSync() {
  useEffect(() => {
    const session = getSession()
    if (session) {
      Sentry.setUser({ email: session.email, username: session.workspaceSlug })
    } else {
      Sentry.setUser(null)
    }
  }, [])
  return null
}

function ErrorFallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#07090F', color: '#fff', gap: 16, padding: 32,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ fontSize: 28 }}>⚠</div>
      <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Something went wrong</p>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
        The error has been reported. Try refreshing the page.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 8, padding: '9px 22px', borderRadius: 8,
          background: '#6366f1', color: '#fff', border: 'none',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Refresh
      </button>
    </div>
  )
}

export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />} showDialog={false}>
      <BrowserRouter>
        <SentryUserSync />
        <SentryRoutes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/share/:token" element={<SharedSessionPage />} />
          <Route path="/join/:workspaceSlug/:sessionId" element={<ViewerPage />} />
          <Route path="/:workspaceSlug/settings" element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          } />
          <Route path="/:workspaceSlug/sessions" element={
            <RequireAuth>
              <SessionsPage />
            </RequireAuth>
          } />
          <Route path="/:workspaceSlug" element={
            <RequireAuth>
              <WorkspacePage />
            </RequireAuth>
          } />
          <Route path="/legal/:doc" element={<LegalPage />} />
          <Route path="/" element={<LandingPage />} />
        </SentryRoutes>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  )
}

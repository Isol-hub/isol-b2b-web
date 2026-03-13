import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import LandingPage from './pages/LandingPage'
import WorkspacePage from './pages/WorkspacePage'
import SettingsPage from './pages/SettingsPage'
import SessionsPage from './pages/SessionsPage'
import ViewerPage from './pages/ViewerPage'
import SharedSessionPage from './pages/SharedSessionPage'
import LegalPage from './pages/LegalPage'
import { getSession } from './lib/auth'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = getSession()
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
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
      </Routes>
    </BrowserRouter>
  )
}

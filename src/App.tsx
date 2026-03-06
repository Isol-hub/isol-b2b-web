import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import WorkspacePage from './pages/WorkspacePage'
import ViewerPage from './pages/ViewerPage'
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
        <Route path="/join/:workspaceSlug/:sessionId" element={
          <RequireAuth>
            <ViewerPage />
          </RequireAuth>
        } />
        <Route path="/:workspaceSlug" element={
          <RequireAuth>
            <WorkspacePage />
          </RequireAuth>
        } />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

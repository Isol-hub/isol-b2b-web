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

function BgBlobs() {
  return (
    <div className="bg-blobs">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="blob blob-4" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <BgBlobs />
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

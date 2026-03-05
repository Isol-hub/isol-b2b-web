import { useParams, useNavigate } from 'react-router-dom'
import { useState, useCallback } from 'react'
import { getSession } from '../lib/auth'
import { useWebSocket } from '../hooks/useWebSocket'
import type { SubtitleMessage } from '../hooks/useWebSocket'
import SubtitleView from '../components/SubtitleView'
import LanguageSelector from '../components/LanguageSelector'

export default function ViewerPage() {
  const { workspaceSlug, sessionId } = useParams<{ workspaceSlug: string; sessionId: string }>()
  const navigate = useNavigate()
  const session = getSession()

  const [targetLang, setTargetLang] = useState('en')
  const [currentLine, setCurrentLine] = useState('')
  const [prevLine, setPrevLine] = useState('')
  const [joined, setJoined] = useState(false)

  const wssUrl = import.meta.env.VITE_WSS_URL ?? 'wss://api.isol.live/audio'

  const handleMessage = useCallback((msg: SubtitleMessage) => {
    if (msg.line_final) setPrevLine(msg.line_final)
    setCurrentLine(msg.line_next || '')
  }, [])

  const ws = useWebSocket({
    url: wssUrl,
    targetLang,
    onMessage: handleMessage,
    viewerSessionId: sessionId,
  })

  if (!session) {
    // Redirect to login, then back here
    navigate(`/login?next=/join/${workspaceSlug}/${sessionId}`, { replace: true })
    return null
  }

  const handleJoin = useCallback(() => {
    ws.open()
    setJoined(true)
  }, [ws])

  const isActive = ws.state === 'connected'
  const statusColor = ws.state === 'error' ? 'var(--red)'
    : ws.state === 'reconnecting' ? 'var(--orange)'
    : isActive ? 'var(--green)'
    : 'var(--text-dim)'
  const statusLabel = ws.state === 'error' ? 'Error'
    : ws.state === 'reconnecting' ? 'Reconnecting…'
    : ws.state === 'connecting' ? 'Connecting…'
    : isActive ? 'Live'
    : 'Ready'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,15,26,0.92)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, background: 'var(--blue)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#0a0f1a', fontWeight: 900, fontSize: 14 }}>i</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em' }}>ISOL</span>
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>/ {workspaceSlug}</span>
          <span style={{ fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px' }}>
            Viewer
          </span>
        </div>

        {joined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: isActive ? `0 0 6px ${statusColor}` : 'none', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{statusLabel}</span>
          </div>
        )}
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 820, margin: '0 auto', width: '100%', padding: '32px 24px', gap: 20 }}>

        {!joined ? (
          /* Join screen */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 480 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>You've been invited</h2>
              <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                Someone is sharing a live captioned session. Choose your language and join to see real-time subtitles.
              </p>
            </div>

            <div style={{ width: 220 }}>
              <LanguageSelector value={targetLang} onChange={setTargetLang} disabled={false} />
            </div>

            <button
              onClick={handleJoin}
              style={{
                background: 'var(--blue)', color: '#0a0f1a',
                fontWeight: 700, fontSize: 15,
                padding: '12px 32px', borderRadius: 10, border: 'none',
                cursor: 'pointer', alignSelf: 'flex-start',
              }}
            >
              Join session →
            </button>
          </div>
        ) : (
          /* Live subtitles */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Translating to</div>
              <div style={{ width: 180 }}>
                <LanguageSelector value={targetLang} onChange={(lang) => {
                  setTargetLang(lang)
                  // Reconnect with new language
                  ws.close()
                  setTimeout(() => ws.open(), 100)
                }} disabled={false} />
              </div>
            </div>

            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, minHeight: 200, display: 'flex', flexDirection: 'column',
              justifyContent: currentLine || prevLine ? 'flex-end' : 'center',
              flex: 1,
            }}>
              {!isActive && !currentLine && !prevLine ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
                  <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>Waiting for the host to start…</p>
                </div>
              ) : (
                <SubtitleView current={currentLine} previous={prevLine} />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

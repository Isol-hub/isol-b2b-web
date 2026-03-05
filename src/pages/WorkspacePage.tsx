import { useParams, useNavigate } from 'react-router-dom'
import { useState, useCallback, useRef } from 'react'
import { getSession, clearSession } from '../lib/auth'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { useWebSocket } from '../hooks/useWebSocket'
import type { SubtitleMessage } from '../hooks/useWebSocket'
import SubtitleView from '../components/SubtitleView'
import CompactPanel from '../components/CompactPanel'
import StatusBadge from '../components/StatusBadge'
import LanguageSelector from '../components/LanguageSelector'
import ErrorBanner from '../components/ErrorBanner'

export default function WorkspacePage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>()
  const navigate = useNavigate()
  const session = getSession()

  const [targetLang, setTargetLang] = useState('en')
  const [currentLine, setCurrentLine] = useState('')
  const [prevLine, setPrevLine] = useState('')
  const [error, setError] = useState('')
  const [compact, setCompact] = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
  const lastFinalRef = useRef('')

  const wssUrl = import.meta.env.VITE_WSS_URL ?? 'wss://wss.isol.live'

  const handleMessage = useCallback((msg: SubtitleMessage) => {
    const text = msg.translation || msg.original
    if (!text) return
    if (msg.is_final) {
      setPrevLine(text)
      setCurrentLine('')
      lastFinalRef.current = text
    } else {
      setCurrentLine(text)
    }
  }, [])

  const ws = useWebSocket({
    url: wssUrl,
    targetLang,
    onMessage: handleMessage,
  })

  const audio = useAudioCapture({
    chunkMs: 200,
    onChunk: ws.sendChunk,
    onError: setError,
  })

  const handleStart = useCallback(async () => {
    setError('')
    setCurrentLine('')
    setPrevLine('')
    ws.open()
    await audio.start()
    setSessionActive(true)
  }, [ws, audio])

  const handleStop = useCallback(() => {
    audio.stop()
    ws.close()
    setSessionActive(false)
    setCurrentLine('')
  }, [audio, ws])

  const handleLogout = useCallback(() => {
    handleStop()
    clearSession()
    navigate('/login', { replace: true })
  }, [handleStop, navigate])

  if (!session) {
    navigate('/login', { replace: true })
    return null
  }

  const isUnsupportedBrowser = !('getDisplayMedia' in navigator.mediaDevices)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,15,26,0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)', letterSpacing: '0.1em' }}>ISOL</span>
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>/ {workspaceSlug}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <StatusBadge wsState={ws.state} audioState={audio.state} />
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{session.email}</span>
          <button onClick={handleLogout} className="btn-icon" style={{ fontSize: 12, padding: '7px 12px' }}>Sign out</button>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 780, margin: '0 auto', width: '100%', padding: '32px 24px', gap: 24 }}>

        {isUnsupportedBrowser && (
          <div style={{
            background: 'rgba(251,191,36,0.10)',
            border: '1px solid rgba(251,191,36,0.30)',
            borderRadius: 10, padding: '12px 16px',
            fontSize: 13, color: 'var(--orange)',
          }}>
            Your browser may not support audio capture. Please use Chrome or Edge for best results.
          </div>
        )}

        {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

        {/* Controls row */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 220px' }}>
            <LanguageSelector value={targetLang} onChange={setTargetLang} disabled={sessionActive} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            {sessionActive ? (
              <button onClick={handleStop} style={{
                background: 'rgba(248,113,113,0.15)',
                border: '1px solid rgba(248,113,113,0.30)',
                color: 'var(--red)',
                fontWeight: 600, fontSize: 14,
                padding: '10px 22px', borderRadius: 10,
                cursor: 'pointer',
              }}>
                Stop
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={isUnsupportedBrowser}
                style={{
                  background: 'var(--blue)',
                  color: '#0a0f1a',
                  fontWeight: 700, fontSize: 15,
                  padding: '10px 28px', borderRadius: 10,
                  cursor: isUnsupportedBrowser ? 'not-allowed' : 'pointer',
                  opacity: isUnsupportedBrowser ? 0.45 : 1,
                  border: 'none',
                }}
              >
                Start captions
              </button>
            )}
            <button
              onClick={() => setCompact(c => !c)}
              className="btn-icon"
              title="Toggle compact floating panel"
              style={{ fontSize: 18 }}
            >
              &#8861;
            </button>
          </div>
        </div>

        {/* Subtitle area */}
        {!compact && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            minHeight: 160,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: currentLine || prevLine ? 'flex-end' : 'center',
          }}>
            <SubtitleView current={currentLine} previous={prevLine} />
          </div>
        )}

        {/* Privacy + info */}
        <div style={{
          background: 'rgba(26,210,255,0.06)',
          border: '1px solid rgba(26,210,255,0.14)',
          borderRadius: 10,
          padding: '12px 16px',
        }}>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            <strong style={{ color: 'rgba(249,250,251,0.70)' }}>How it works:</strong>
            {' '}Click "Start captions", then share your screen or a browser tab with audio in the dialog.
            Audio is streamed for live captioning and is not stored.
            Supported: Chrome 74+, Edge 79+.
          </p>
        </div>
      </main>

      {/* Compact floating panel */}
      {compact && (
        <CompactPanel
          current={currentLine}
          previous={prevLine}
          wsState={ws.state}
          audioState={audio.state}
          onClose={() => setCompact(false)}
        />
      )}
    </div>
  )
}

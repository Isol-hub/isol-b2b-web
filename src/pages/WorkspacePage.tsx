import { useParams, useNavigate } from 'react-router-dom'
import { useState, useCallback, useRef, useEffect } from 'react'
import { getSession, clearSession } from '../lib/auth'
import { useAudioCapture, type AudioSource } from '../hooks/useAudioCapture'
import { useWebSocket } from '../hooks/useWebSocket'
import type { SubtitleMessage } from '../hooks/useWebSocket'
import SubtitleView from '../components/SubtitleView'
import CompactPanel from '../components/CompactPanel'
import LanguageSelector from '../components/LanguageSelector'
import ErrorBanner from '../components/ErrorBanner'
import { LANGUAGES } from '../lib/languages'

interface TranscriptLine {
  text: string
  time: Date
}

const ONBOARDING_KEY = 'isol_onboarded_v1'

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
  const [audioSource, setAudioSource] = useState<AudioSource>('display')
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [copied, setCopied] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const lastFinalRef = useRef('')

  // Show onboarding on first visit
  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      setShowOnboarding(true)
    }
  }, [])

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false)
    localStorage.setItem(ONBOARDING_KEY, '1')
  }, [])

  const wssUrl = import.meta.env.VITE_WSS_URL ?? 'wss://api.isol.live/audio'

  const handleMessage = useCallback((msg: SubtitleMessage) => {
    if (msg.line_final) {
      setPrevLine(msg.line_final)
      lastFinalRef.current = msg.line_final
      setTranscript(prev => [...prev, { text: msg.line_final, time: new Date() }])
    }
    setCurrentLine(msg.line_next || '')
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
    setTranscript([])
    dismissOnboarding()
    ws.open()
    await audio.start(audioSource)
    setSessionActive(true)
  }, [ws, audio, audioSource, dismissOnboarding])

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

  // Share link — generated once we have a session_id from WSS hello
  const shareUrl = ws.sessionId
    ? `${window.location.origin}/join/${workspaceSlug}/${ws.sessionId}`
    : null

  const handleCopyLink = useCallback(() => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [shareUrl])

  // Download transcript as TXT
  const handleDownload = useCallback(() => {
    if (!transcript.length) return
    const lines = transcript.map(l => {
      const t = l.time.toLocaleTimeString()
      return `[${t}] ${l.text}`
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `isol-transcript-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [transcript])

  if (!session) {
    navigate('/login', { replace: true })
    return null
  }

  const isUnsupported = audioSource === 'display' && !('getDisplayMedia' in navigator.mediaDevices)
  const targetLangLabel = LANGUAGES.find(l => l.code === targetLang)

  const isActive = audio.state === 'active' && ws.state === 'connected'
  const statusColor = ws.state === 'error' || audio.state === 'error' ? 'var(--red)'
    : ws.state === 'reconnecting' ? 'var(--orange)'
    : isActive ? 'var(--green)'
    : 'var(--text-dim)'
  const statusLabel = ws.state === 'error' || audio.state === 'error' ? 'Error'
    : ws.state === 'reconnecting' ? 'Reconnecting…'
    : ws.state === 'connecting' ? 'Connecting…'
    : audio.state === 'requesting' ? 'Requesting permission…'
    : isActive ? `Listening  •  → ${targetLangLabel?.flag ?? ''} ${targetLangLabel?.label ?? targetLang}`
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
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '5px 12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 20,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: statusColor,
              boxShadow: isActive ? `0 0 6px ${statusColor}` : 'none',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{statusLabel}</span>
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-dim)', marginLeft: 8 }}>{session.email}</span>
          <button onClick={handleLogout} className="btn-icon" style={{ fontSize: 12, padding: '7px 12px' }}>Sign out</button>
        </div>
      </header>

      {/* Onboarding banner */}
      {showOnboarding && (
        <div style={{
          background: 'rgba(26,210,255,0.07)',
          borderBottom: '1px solid rgba(26,210,255,0.15)',
          padding: '12px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {[
              { n: '1', text: 'Choose audio source (screen or mic)' },
              { n: '2', text: 'Pick your target language' },
              { n: '3', text: 'Click "Start captions" and share audio' },
            ].map(({ n, text }) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'var(--blue)', color: '#0a0f1a',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{n}</span>
                <span style={{ fontSize: 13, color: 'rgba(249,250,251,0.70)' }}>{text}</span>
              </div>
            ))}
          </div>
          <button onClick={dismissOnboarding} style={{
            background: 'none', color: 'var(--text-dim)', fontSize: 13,
            padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
          }}>Got it</button>
        </div>
      )}

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 820, margin: '0 auto', width: '100%', padding: '32px 24px', gap: 20 }}>

        {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

        {!sessionActive ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Audio source selector */}
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>Audio source</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className={`source-btn${audioSource === 'display' ? ' active' : ''}`}
                  onClick={() => setAudioSource('display')}
                >
                  <span style={{ fontSize: 24 }}>🖥</span>
                  <span>Share screen / tab</span>
                  <span style={{ fontSize: 11, opacity: 0.6 }}>System audio · Chrome / Edge</span>
                </button>
                <button
                  className={`source-btn${audioSource === 'microphone' ? ' active' : ''}`}
                  onClick={() => setAudioSource('microphone')}
                >
                  <span style={{ fontSize: 24 }}>🎤</span>
                  <span>Microphone</span>
                  <span style={{ fontSize: 11, opacity: 0.6 }}>All browsers</span>
                </button>
              </div>
            </div>

            {/* Language + Start */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '0 0 220px' }}>
                <LanguageSelector value={targetLang} onChange={setTargetLang} disabled={false} />
              </div>
              <button
                onClick={handleStart}
                disabled={isUnsupported}
                style={{
                  background: 'var(--blue)', color: '#0a0f1a',
                  fontWeight: 700, fontSize: 15,
                  padding: '11px 32px', borderRadius: 10,
                  cursor: isUnsupported ? 'not-allowed' : 'pointer',
                  opacity: isUnsupported ? 0.45 : 1, border: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Start captions →
              </button>
              <button onClick={() => setCompact(c => !c)} className="btn-icon" title="Compact panel" style={{ fontSize: 18 }}>
                &#8861;
              </button>
            </div>

            {isUnsupported && (
              <div style={{
                background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.30)',
                borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--orange)',
              }}>
                Screen audio capture is not supported in this browser. Switch to Microphone, or use Chrome / Edge.
              </div>
            )}

            {audioSource === 'display' && !isUnsupported && (
              <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                Click <strong style={{ color: 'rgba(249,250,251,0.7)' }}>Start captions</strong>, share a browser tab or screen with audio, and check <em>"Share tab audio"</em> in the dialog.
              </p>
            )}
          </div>
        ) : (
          /* Active session controls */
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <LanguageSelector value={targetLang} onChange={setTargetLang} disabled={true} />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              {/* Share link button */}
              {shareUrl && (
                <button
                  onClick={handleCopyLink}
                  className="btn-icon"
                  title="Copy share link for viewers"
                  style={{ fontSize: 13, gap: 6, display: 'flex', alignItems: 'center' }}
                >
                  {copied ? '✓ Copied!' : '🔗 Share link'}
                </button>
              )}
              <button onClick={handleStop} style={{
                background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.30)',
                color: 'var(--red)', fontWeight: 600, fontSize: 14,
                padding: '10px 22px', borderRadius: 10, cursor: 'pointer',
              }}>
                Stop
              </button>
              <button onClick={() => setCompact(c => !c)} className="btn-icon" title="Compact panel" style={{ fontSize: 18 }}>
                &#8861;
              </button>
            </div>
          </div>
        )}

        {/* Subtitle area */}
        {!compact && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, minHeight: 180, display: 'flex', flexDirection: 'column',
            justifyContent: currentLine || prevLine ? 'flex-end' : 'center',
          }}>
            <SubtitleView current={currentLine} previous={prevLine} />
          </div>
        )}

        {/* Transcript download (shown after session ends with content) */}
        {!sessionActive && transcript.length > 0 && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Session ended</p>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                {transcript.length} line{transcript.length !== 1 ? 's' : ''} captured
              </p>
            </div>
            <button onClick={handleDownload} style={{
              background: 'var(--blue)', color: '#0a0f1a',
              fontWeight: 600, fontSize: 13,
              padding: '9px 20px', borderRadius: 10, border: 'none',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              ↓ Download transcript
            </button>
          </div>
        )}
      </main>

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

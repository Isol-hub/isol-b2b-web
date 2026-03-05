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

interface TranscriptLine { text: string; time: Date }

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

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_KEY)) setShowOnboarding(true)
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

  const ws = useWebSocket({ url: wssUrl, targetLang, onMessage: handleMessage })
  const audio = useAudioCapture({ chunkMs: 200, onChunk: ws.sendChunk, onError: setError })

  const handleStart = useCallback(async () => {
    setError(''); setCurrentLine(''); setPrevLine(''); setTranscript([])
    dismissOnboarding()
    ws.open()
    await audio.start(audioSource)
    setSessionActive(true)
  }, [ws, audio, audioSource, dismissOnboarding])

  const handleStop = useCallback(() => {
    audio.stop(); ws.close()
    setSessionActive(false); setCurrentLine('')
  }, [audio, ws])

  const handleLogout = useCallback(() => {
    handleStop(); clearSession()
    navigate('/login', { replace: true })
  }, [handleStop, navigate])

  const shareUrl = ws.sessionId
    ? `${window.location.origin}/join/${workspaceSlug}/${ws.sessionId}`
    : null

  const handleCopyLink = useCallback(() => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }, [shareUrl])

  const handleDownload = useCallback(() => {
    if (!transcript.length) return
    const lines = transcript.map(l => `[${l.time.toLocaleTimeString()}] ${l.text}`)
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `isol-transcript-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [transcript])

  if (!session) { navigate('/login', { replace: true }); return null }

  const isUnsupported = audioSource === 'display' && !('getDisplayMedia' in navigator.mediaDevices)
  const targetLangLabel = LANGUAGES.find(l => l.code === targetLang)
  const isActive = audio.state === 'active' && ws.state === 'connected'

  const statusColor = ws.state === 'error' || audio.state === 'error' ? 'var(--red)'
    : ws.state === 'reconnecting' ? 'var(--orange)'
    : isActive ? 'var(--green)'
    : 'rgba(238,242,255,0.3)'

  const statusLabel = ws.state === 'error' || audio.state === 'error' ? 'Error'
    : ws.state === 'reconnecting' ? 'Reconnecting…'
    : ws.state === 'connecting' ? 'Connecting…'
    : audio.state === 'requesting' ? 'Requesting permission…'
    : isActive ? `Listening  ·  → ${targetLangLabel?.flag ?? ''} ${targetLangLabel?.label ?? targetLang}`
    : 'Ready'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header className="header-glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="logo-mark" style={{ width: 30, height: 30 }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>i</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em' }}>ISOL</span>
          <span style={{ fontSize: 13, color: 'var(--text-dim)', marginLeft: 2 }}>/ {workspaceSlug}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="status-pill">
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: isActive ? `0 0 8px ${statusColor}` : 'none', flexShrink: 0, transition: 'all 0.3s' }} />
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{statusLabel}</span>
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-dim)', marginLeft: 4 }}>{session.email}</span>
          <button onClick={handleLogout} className="btn-icon" style={{ fontSize: 12, padding: '7px 14px' }}>Sign out</button>
        </div>
      </header>

      {/* Onboarding */}
      {showOnboarding && (
        <div className="onboarding-banner" style={{ padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
            {[
              { n: '1', text: 'Choose audio source' },
              { n: '2', text: 'Pick target language' },
              { n: '3', text: 'Click Start and share audio' },
            ].map(({ n, text }) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#0ea5e9)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
                <span style={{ fontSize: 13, color: 'rgba(238,242,255,0.75)' }}>{text}</span>
              </div>
            ))}
          </div>
          <button onClick={dismissOnboarding} style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)', fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>Got it</button>
        </div>
      )}

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 860, margin: '0 auto', width: '100%', padding: '36px 28px', gap: 24 }}>

        {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

        {!sessionActive ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Audio source */}
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Audio source</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className={`source-btn${audioSource === 'display' ? ' active' : ''}`} onClick={() => setAudioSource('display')}>
                  <span style={{ fontSize: 26 }}>🖥</span>
                  <span style={{ fontWeight: 600 }}>Screen / Tab</span>
                  <span style={{ fontSize: 11, opacity: 0.6 }}>Chrome · Edge</span>
                </button>
                <button className={`source-btn${audioSource === 'microphone' ? ' active' : ''}`} onClick={() => setAudioSource('microphone')}>
                  <span style={{ fontSize: 26 }}>🎤</span>
                  <span style={{ fontWeight: 600 }}>Microphone</span>
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
                  background: 'linear-gradient(135deg, #7c3aed 0%, #0ea5e9 100%)',
                  color: '#fff', fontWeight: 700, fontSize: 15,
                  padding: '12px 36px', borderRadius: 13, border: 'none',
                  cursor: isUnsupported ? 'not-allowed' : 'pointer',
                  opacity: isUnsupported ? 0.4 : 1,
                  boxShadow: '0 0 28px rgba(124,58,237,0.35), 0 4px 12px rgba(0,0,0,0.25)',
                  transition: 'box-shadow 0.2s, transform 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!isUnsupported) (e.target as HTMLElement).style.boxShadow = '0 0 44px rgba(124,58,237,0.55)' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.boxShadow = '0 0 28px rgba(124,58,237,0.35), 0 4px 12px rgba(0,0,0,0.25)' }}
              >
                Start captions →
              </button>
              <button onClick={() => setCompact(c => !c)} className="btn-icon" title="Compact panel" style={{ fontSize: 18 }}>⊟</button>
            </div>

            {isUnsupported && (
              <div style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--orange)' }}>
                Screen audio not supported. Switch to Microphone, or use Chrome / Edge.
              </div>
            )}
            {audioSource === 'display' && !isUnsupported && (
              <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                After clicking Start, share a browser tab or screen. Make sure to check <em>"Share tab audio"</em>.
              </p>
            )}
          </div>
        ) : (
          /* Active session */
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <LanguageSelector value={targetLang} onChange={setTargetLang} disabled={true} />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              {shareUrl && (
                <button onClick={handleCopyLink} className="btn-icon" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {copied ? '✓ Copied!' : '🔗 Share link'}
                </button>
              )}
              <button onClick={handleStop} style={{
                background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)',
                color: 'var(--red)', fontWeight: 600, fontSize: 14,
                padding: '10px 24px', borderRadius: 12, cursor: 'pointer',
              }}>
                Stop
              </button>
              <button onClick={() => setCompact(c => !c)} className="btn-icon" style={{ fontSize: 18 }}>⊟</button>
            </div>
          </div>
        )}

        {/* Subtitle area */}
        {!compact && (
          <div
            className={`subtitle-card${isActive ? ' active' : ''}`}
            style={{ minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: currentLine || prevLine ? 'flex-end' : 'center' }}
          >
            <SubtitleView current={currentLine} previous={prevLine} />
          </div>
        )}

        {/* Transcript download */}
        {!sessionActive && transcript.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.20)',
            borderRadius: 14, padding: '18px 22px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            backdropFilter: 'blur(16px)',
            boxShadow: '0 0 24px rgba(124,58,237,0.08)',
          }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>Session complete</p>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                {transcript.length} line{transcript.length !== 1 ? 's' : ''} captured
              </p>
            </div>
            <button onClick={handleDownload} style={{
              background: 'linear-gradient(135deg,#7c3aed,#0ea5e9)',
              color: '#fff', fontWeight: 600, fontSize: 13,
              padding: '10px 22px', borderRadius: 11, border: 'none',
              cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: '0 0 20px rgba(124,58,237,0.30)',
            }}>
              ↓ Download transcript
            </button>
          </div>
        )}
      </main>

      {compact && (
        <CompactPanel
          current={currentLine} previous={prevLine}
          wsState={ws.state} audioState={audio.state}
          onClose={() => setCompact(false)}
        />
      )}
    </div>
  )
}

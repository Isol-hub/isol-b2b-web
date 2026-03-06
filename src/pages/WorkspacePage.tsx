import { useParams, useNavigate } from 'react-router-dom'
import { useState, useCallback, useRef, useEffect } from 'react'
import { getSession, clearSession } from '../lib/auth'
import { useAudioCapture, type AudioSource } from '../hooks/useAudioCapture'
import { useWebSocket } from '../hooks/useWebSocket'
import type { SubtitleMessage } from '../hooks/useWebSocket'
import DocumentView from '../components/DocumentView'
import CompactPanel from '../components/CompactPanel'
import RoomPanel from '../components/RoomPanel'
import TranscriptModal from '../components/TranscriptModal'
import GlossaryPanel from '../components/GlossaryPanel'
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
  const [error, setError] = useState('')
  const [compact, setCompact] = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
  const [audioSource, setAudioSource] = useState<AudioSource>('display')
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const [glossaryWord, setGlossaryWord] = useState<{ word: string; sentence: string } | null>(null)

  const [aiFormatted, setAiFormatted] = useState<string | undefined>()
  const [aiFormattedAt, setAiFormattedAt] = useState<number | undefined>()
  const [aiLoading, setAiLoading] = useState(false)
  const aiRunningRef = useRef(false)
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const wordIndex = useRef<Map<string, string[]>>(new Map())

  useEffect(() => {
    if (transcript.length < 5) return
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current)
    aiDebounceRef.current = setTimeout(() => {
      if (aiRunningRef.current) return
      if (aiFormattedAt !== undefined && transcript.length <= aiFormattedAt) return
      aiRunningRef.current = true
      setAiLoading(true)
      const snapLength = transcript.length
      fetch('/api/ai/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: transcript.map(l => l.text) }),
      })
        .then(r => {
          if (!r.ok) { r.text().then(t => setError(`AI format error ${r.status}: ${t}`)); return null }
          return r.json()
        })
        .then((data: { formatted?: string } | null) => {
          if (data?.formatted) { setAiFormatted(data.formatted); setAiFormattedAt(snapLength) }
        })
        .catch(e => setError(`AI format failed: ${e.message}`))
        .finally(() => { setAiLoading(false); aiRunningRef.current = false })
    }, 2000)
  }, [transcript.length])

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
      const entry: TranscriptLine = { text: msg.line_final, time: new Date() }
      setTranscript(prev => [...prev, entry])
      msg.line_final.split(/\s+/).forEach(raw => {
        const w = raw.toLowerCase().replace(/[^\w]/g, '')
        if (w.length < 3) return
        const existing = wordIndex.current.get(w) ?? []
        wordIndex.current.set(w, [...existing, msg.line_final])
      })
    }
    setCurrentLine(msg.line_next || '')
  }, [])

  const ws = useWebSocket({ url: wssUrl, targetLang, onMessage: handleMessage })
  const audio = useAudioCapture({ chunkMs: 200, onChunk: ws.sendChunk, onError: setError })

  const handleStart = useCallback(async () => {
    setError(''); setCurrentLine(''); setTranscript([])
    setAiFormatted(undefined); setAiFormattedAt(undefined); setAiLoading(false)
    wordIndex.current.clear()
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

  const handleWordClick = useCallback((word: string, sentence: string) => {
    setGlossaryWord({ word: word.toLowerCase(), sentence })
  }, [])

  if (!session) { navigate('/login', { replace: true }); return null }

  const isUnsupported = audioSource === 'display' && !('getDisplayMedia' in navigator.mediaDevices)
  const targetLangLabel = LANGUAGES.find(l => l.code === targetLang)
  const isActive = audio.state === 'active' && ws.state === 'connected'

  const statusColor = ws.state === 'error' || audio.state === 'error' ? 'var(--red)'
    : ws.state === 'reconnecting' ? 'var(--orange)'
    : isActive ? 'var(--live)'
    : 'rgba(255,255,255,0.2)'

  const statusLabel = ws.state === 'error' || audio.state === 'error' ? 'Error'
    : ws.state === 'reconnecting' ? 'Reconnecting…'
    : ws.state === 'connecting' ? 'Connecting…'
    : audio.state === 'requesting' ? 'Requesting…'
    : isActive ? 'Live'
    : 'Ready'

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ━━ TOP NAV ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="header-glass" style={{
        display: 'flex', alignItems: 'center',
        padding: '0 24px', height: 52, gap: 16,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div className="logo-mark" style={{ width: 26, height: 26 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>i</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>ISOL Studio</span>
          {workspaceSlug && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/ {workspaceSlug}</span>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Live status */}
        {sessionActive && (
          <div className="status-pill">
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: statusColor,
              transition: 'background 0.3s',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{statusLabel}</span>
          </div>
        )}

        {/* Lang */}
        {sessionActive && targetLangLabel && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {targetLangLabel.flag} {targetLangLabel.label}
          </span>
        )}

        {/* User + sign out */}
        <span style={{
          fontSize: 12, color: 'var(--text-muted)',
          maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{session.email}</span>
        <button onClick={handleLogout} className="btn-icon" style={{ fontSize: 12, padding: '5px 12px' }}>
          Sign out
        </button>
      </header>

      {/* Onboarding banner */}
      {showOnboarding && (
        <div className="onboarding-banner" style={{
          padding: '10px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {[
              { n: '1', text: 'Choose audio source' },
              { n: '2', text: 'Pick target language' },
              { n: '3', text: 'Start and share your screen audio' },
            ].map(({ n, text }) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'var(--accent)',
                  color: '#fff', fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{n}</span>
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{text}</span>
              </div>
            ))}
          </div>
          <button
            onClick={dismissOnboarding}
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-muted)', fontSize: 12,
              padding: '4px 12px', borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
            }}
          >Got it</button>
        </div>
      )}

      {/* ━━ BODY: 3-COLUMN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT SIDEBAR ─────────────────────────────────────── */}
        <aside style={{
          width: 220,
          flexShrink: 0,
          borderRight: '1px solid var(--divider)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          overflowY: 'auto',
          background: 'var(--surface)',
        }}>

          {!sessionActive ? (
            <>
              {/* CAPTURE */}
              <div className="sidebar-group">
                <p className="sidebar-group-label">Capture</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className={`source-btn${audioSource === 'display' ? ' active' : ''}`}
                    onClick={() => setAudioSource('display')}
                  >
                    <span style={{ fontSize: 18 }}>🖥</span>
                    <span>Screen</span>
                  </button>
                  <button
                    className={`source-btn${audioSource === 'microphone' ? ' active' : ''}`}
                    onClick={() => setAudioSource('microphone')}
                  >
                    <span style={{ fontSize: 18 }}>🎤</span>
                    <span>Mic</span>
                  </button>
                </div>
                {isUnsupported && (
                  <p style={{ fontSize: 12, color: 'var(--orange)', lineHeight: 1.5, marginTop: 2 }}>
                    Screen audio not supported. Use Mic or Chrome/Edge.
                  </p>
                )}
              </div>

              {/* LANGUAGE */}
              <div className="sidebar-group">
                <LanguageSelector value={targetLang} onChange={setTargetLang} disabled={false} />
              </div>

              {/* START */}
              <div className="sidebar-group">
                <button
                  onClick={handleStart}
                  disabled={isUnsupported}
                  className="btn-primary"
                  style={{ width: '100%' }}
                >
                  Start session →
                </button>
              </div>
            </>
          ) : (
            <>
              {/* LANGUAGE (disabled during session) */}
              <div className="sidebar-group">
                <LanguageSelector value={targetLang} onChange={setTargetLang} disabled={true} />
              </div>

              {/* ROOM */}
              {ws.sessionId && workspaceSlug && (
                <div className="sidebar-group">
                  <p className="sidebar-group-label">Room</p>
                  <RoomPanel sessionId={ws.sessionId} workspaceSlug={workspaceSlug} />
                </div>
              )}

              {/* STOP */}
              <div className="sidebar-group">
                <button onClick={handleStop} className="btn-stop">
                  Stop session
                </button>
              </div>
            </>
          )}

          {/* COMPACT VIEW */}
          <button
            onClick={() => setCompact(c => !c)}
            className="btn-icon"
            style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
          >
            {compact ? 'Show document' : '⊟ Compact view'}
          </button>

          {/* EXPORT (post-session) */}
          {!sessionActive && transcript.length > 0 && (
            <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                {transcript.length} lines captured
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary"
                style={{ width: '100%' }}
              >
                Edit & Export →
              </button>
            </div>
          )}

          {/* Bottom spacer */}
          <div style={{ flex: 1 }} />
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────── */}
        <main style={{
          flex: 1,
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          minWidth: 0,
        }}>
          {error && (
            <div style={{ marginBottom: 16, flexShrink: 0 }}>
              <ErrorBanner message={error} onDismiss={() => setError('')} />
            </div>
          )}

          {!compact && (
            <div style={{ flex: 1 }}>
              <DocumentView
                transcript={transcript}
                currentLine={currentLine}
                isActive={isActive}
                targetLang={targetLangLabel ? `${targetLangLabel.flag} ${targetLangLabel.label}` : targetLang}
                aiFormatted={aiFormatted}
                aiFormattedAt={aiFormattedAt}
                aiLoading={aiLoading}
                onWordClick={handleWordClick}
              />
            </div>
          )}
        </main>

        {/* ── RIGHT PANEL: KNOWLEDGE / GLOSSARY ────────────────── */}
        <aside style={{
          width: glossaryWord ? 300 : 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 0.25s ease',
          borderLeft: '1px solid var(--divider)',
          background: 'var(--surface)',
        }}>
          {glossaryWord && (
            <div style={{ width: 300, height: '100%' }}>
              <GlossaryPanel
                word={glossaryWord.word}
                sentences={wordIndex.current.get(glossaryWord.word) ?? [glossaryWord.sentence]}
                currentSentence={glossaryWord.sentence}
                targetLang={targetLang}
                onClose={() => setGlossaryWord(null)}
              />
            </div>
          )}
        </aside>

      </div>

      {/* ━━ FLOATING OVERLAYS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {compact && (
        <CompactPanel
          current={currentLine}
          previous={transcript[transcript.length - 1]?.text ?? ''}
          wsState={ws.state}
          audioState={audio.state}
          onClose={() => setCompact(false)}
        />
      )}

      {showModal && (
        <TranscriptModal
          transcript={transcript}
          targetLang={targetLang}
          aiFormatted={aiFormatted}
          onClose={() => setShowModal(false)}
        />
      )}

    </div>
  )
}

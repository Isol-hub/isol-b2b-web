import { useParams, useNavigate } from 'react-router-dom'
import { useState, useCallback, useRef, useEffect } from 'react'
import { getSession, clearSession } from '../lib/auth'
import { useAudioCapture, type AudioSource } from '../hooks/useAudioCapture'
import { useWebSocket } from '../hooks/useWebSocket'
import type { SubtitleMessage } from '../hooks/useWebSocket'
import DocumentView from '../components/DocumentView'
import CompactPanel from '../components/CompactPanel'
import TranscriptModal from '../components/TranscriptModal'
import GlossaryPanel from '../components/GlossaryPanel'
import LanguageSelector from '../components/LanguageSelector'
import ErrorBanner from '../components/ErrorBanner'
import { LANGUAGES } from '../lib/languages'

interface TranscriptLine { text: string; time: Date }

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
  const [roomCopied, setRoomCopied] = useState(false)
  const [aiMode, setAiMode] = useState(false)

  const [glossaryWord, setGlossaryWord] = useState<{ word: string; sentence: string } | null>(null)

  const [aiFormatted, setAiFormatted] = useState<string | undefined>()
  const [aiFormattedAt, setAiFormattedAt] = useState<number | undefined>()
  const [aiLoading, setAiLoading] = useState(false)
  const aiRunningRef = useRef(false)
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const wordIndex = useRef<Map<string, string[]>>(new Map())

  // Auto-enable AI mode when formatting arrives
  useEffect(() => {
    if (aiFormatted && !aiMode) setAiMode(true)
  }, [aiFormatted])

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
    setAiFormatted(undefined); setAiFormattedAt(undefined); setAiLoading(false); setAiMode(false)
    wordIndex.current.clear()
    ws.open()
    await audio.start(audioSource)
    setSessionActive(true)
  }, [ws, audio, audioSource])

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
  const canAi = !!(aiFormatted)

  const statusColor = ws.state === 'error' || audio.state === 'error' ? 'var(--red)'
    : ws.state === 'reconnecting' ? 'var(--orange)'
    : isActive ? 'var(--live)'
    : 'rgba(0,0,0,0.12)'

  const statusLabel = ws.state === 'error' || audio.state === 'error' ? 'Error'
    : ws.state === 'reconnecting' ? 'Reconnecting…'
    : ws.state === 'connecting' ? 'Connecting…'
    : audio.state === 'requesting' ? 'Requesting…'
    : isActive ? 'Live'
    : 'Ready'

  const shareUrl = ws.sessionId
    ? `${window.location.origin}/join/${workspaceSlug}/${ws.sessionId}`
    : ''

  const roomCode = ws.sessionId
    ? (() => {
        const raw = ws.sessionId.replace(/-/g, '').slice(-8).toUpperCase()
        return `${raw.slice(0, 4)}-${raw.slice(4)}`
      })()
    : ''

  const handleCopyRoom = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      setRoomCopied(true)
      setTimeout(() => setRoomCopied(false), 2400)
    })
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>

      {/* ━━ SYSTEM BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="header-glass" style={{
        height: 'var(--header-h)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 12,
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="logo-mark" style={{ width: 24, height: 24 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>i</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>ISOL Studio</span>
        </div>

        {workspaceSlug && (
          <>
            <span style={{ color: 'var(--divider)', fontSize: 14 }}>·</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{workspaceSlug}</span>
          </>
        )}

        {/* Session metadata strip */}
        {sessionActive && (
          <>
            <span style={{ color: 'var(--divider)', fontSize: 14, marginLeft: 4 }}>·</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: statusColor, flexShrink: 0,
                transition: 'background 0.3s',
                animation: isActive ? 'livePulse 2s ease-in-out infinite' : undefined,
              }} />
              <span style={{ color: isActive ? 'var(--live)' : 'var(--text-muted)', fontWeight: 600 }}>
                {statusLabel}
              </span>
            </div>
            {targetLangLabel && (
              <>
                <span style={{ color: 'var(--divider)', fontSize: 14 }}>·</span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {targetLangLabel.flag} {targetLangLabel.label}
                </span>
              </>
            )}
            {roomCode && (
              <>
                <span style={{ color: 'var(--divider)', fontSize: 14 }}>·</span>
                <span style={{
                  fontFamily: 'monospace', fontSize: 11,
                  letterSpacing: '0.07em', color: 'var(--text-muted)',
                }}>{roomCode}</span>
                <button
                  onClick={handleCopyRoom}
                  style={{
                    background: 'none', border: 'none',
                    color: roomCopied ? 'var(--live)' : 'var(--text-muted)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    padding: '1px 6px', borderRadius: 4,
                    transition: 'color 0.2s',
                  }}
                >
                  {roomCopied ? '✓' : 'Copy'}
                </button>
              </>
            )}
          </>
        )}

        <div style={{ flex: 1 }} />

        <span style={{
          fontSize: 11, color: 'var(--text-muted)',
          maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{session.email}</span>
        <button onClick={handleLogout} className="btn-icon" style={{ fontSize: 11, padding: '4px 10px', height: 28 }}>
          Sign out
        </button>
      </header>

      {/* ━━ BODY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT RAIL ──────────────────────────────────────── */}
        <aside className="workspace-rail" style={{ padding: '20px 14px' }}>

          {/* CAPTURE */}
          <div>
            <p className="rail-label">Capture</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`source-btn${audioSource === 'display' ? ' active' : ''}`}
                onClick={() => !sessionActive && setAudioSource('display')}
                disabled={sessionActive}
                style={{ opacity: sessionActive ? 0.4 : 1 }}
              >
                <span style={{ fontSize: 14 }}>🖥</span>
                <span>Screen</span>
              </button>
              <button
                className={`source-btn${audioSource === 'microphone' ? ' active' : ''}`}
                onClick={() => !sessionActive && setAudioSource('microphone')}
                disabled={sessionActive}
                style={{ opacity: sessionActive ? 0.4 : 1 }}
              >
                <span style={{ fontSize: 14 }}>🎤</span>
                <span>Mic</span>
              </button>
            </div>
            {isUnsupported && (
              <p style={{ fontSize: 11, color: 'var(--orange)', lineHeight: 1.5, marginTop: 8 }}>
                Screen audio requires Chrome or Edge.
              </p>
            )}
          </div>

          <div className="rail-divider" />

          {/* LANGUAGE */}
          <div>
            <p className="rail-label">Language</p>
            <LanguageSelector value={targetLang} onChange={setTargetLang} disabled={sessionActive} />
          </div>

          <div className="rail-divider" />

          {/* SESSION */}
          <div>
            <p className="rail-label">Session</p>
            {!sessionActive ? (
              <button
                onClick={handleStart}
                disabled={isUnsupported}
                className="btn-primary"
              >
                Start session →
              </button>
            ) : (
              <button onClick={handleStop} className="btn-stop">
                <span style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: 'var(--red)', flexShrink: 0, marginRight: 4,
                }} />
                Stop session
              </button>
            )}
          </div>

          {/* ROOM — shown only when session active and sessionId known */}
          {sessionActive && ws.sessionId && (
            <>
              <div className="rail-divider" />
              <div>
                <p className="rail-label">Room</p>

                {/* Room code row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  marginBottom: 10,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--live)',
                    animation: 'roomPulse 2s ease-in-out infinite',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                    letterSpacing: '0.08em', color: 'var(--text)',
                  }}>{roomCode}</span>
                </div>

                {/* Copy link button */}
                <button
                  onClick={handleCopyRoom}
                  style={{
                    width: '100%',
                    background: roomCopied
                      ? 'rgba(34,197,94,0.08)'
                      : 'rgba(0,0,0,0.03)',
                    border: `1px solid ${roomCopied ? 'rgba(34,197,94,0.22)' : 'var(--border)'}`,
                    color: roomCopied ? 'var(--live)' : 'var(--text-dim)',
                    fontWeight: 600, fontSize: 12,
                    padding: '7px 12px',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}
                >
                  {roomCopied ? '✓ Copied' : '↗ Copy invite link'}
                </button>
              </div>
            </>
          )}

          <div style={{ flex: 1 }} />

          {/* Compact mode toggle */}
          {sessionActive && (
            <button
              onClick={() => setCompact(c => !c)}
              className="btn-icon"
              style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
            >
              {compact ? '⊞ Show document' : '⊟ Compact'}
            </button>
          )}

        </aside>

        {/* ── MAIN CANVAS ────────────────────────────────────── */}
        <main className="workspace-canvas">

          {/* Error */}
          {error && (
            <div style={{ padding: '10px 24px 0', flexShrink: 0 }}>
              <ErrorBanner message={error} onDismiss={() => setError('')} />
            </div>
          )}

          {/* Canvas content */}
          {!compact && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <DocumentView
                transcript={transcript}
                currentLine={currentLine}
                isActive={isActive}
                targetLang={targetLangLabel ? `${targetLangLabel.flag} ${targetLangLabel.label}` : targetLang}
                aiFormatted={aiFormatted}
                aiFormattedAt={aiFormattedAt}
                aiLoading={aiLoading}
                aiMode={aiMode}
                onAiModeChange={setAiMode}
                onWordClick={handleWordClick}
              />
            </div>
          )}

          {/* ── FLOATING TOOLBAR ────────────────────────────── */}
          <div className="workspace-toolbar">

            {/* AI Enhanced */}
            <button
              onClick={() => canAi && setAiMode(m => !m)}
              className={`toolbar-btn${aiMode && canAi ? ' active' : ''}`}
              disabled={!canAi}
              title={canAi ? undefined : 'Available after 5+ lines are captured'}
            >
              <span>✦</span>
              AI Enhanced
            </button>

            <div className="toolbar-sep" />

            {/* Glossary */}
            <button
              onClick={() => glossaryWord && setGlossaryWord(null)}
              className={`toolbar-btn${glossaryWord ? ' active' : ''}`}
              disabled={!glossaryWord}
              title={glossaryWord ? undefined : 'Click any word in the document to look it up'}
            >
              <span style={{ fontSize: 11 }}>◉</span>
              Glossary
            </button>

            <div className="toolbar-sep" />

            {/* Export */}
            <button
              onClick={() => transcript.length > 0 && setShowModal(true)}
              className="toolbar-btn"
              disabled={transcript.length === 0}
            >
              <span>↑</span>
              Export
            </button>

            <div className="toolbar-sep" />

            {/* Share */}
            <button
              onClick={handleCopyRoom}
              className={`toolbar-btn${roomCopied ? ' live-active' : ''}`}
              disabled={!ws.sessionId}
              title={ws.sessionId ? undefined : 'Start a session to get a share link'}
            >
              {roomCopied ? <><span>✓</span> Copied</> : <><span>↗</span> Share</>}
            </button>

          </div>

        </main>

      </div>

      {/* ━━ OVERLAYS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

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

      {/* Glossary drawer */}
      {glossaryWord && (
        <>
          <div className="glossary-backdrop" onClick={() => setGlossaryWord(null)} />
          <div className="glossary-drawer">
            <GlossaryPanel
              word={glossaryWord.word}
              sentences={wordIndex.current.get(glossaryWord.word) ?? [glossaryWord.sentence]}
              currentSentence={glossaryWord.sentence}
              targetLang={targetLang}
              onClose={() => setGlossaryWord(null)}
            />
          </div>
        </>
      )}

    </div>
  )
}

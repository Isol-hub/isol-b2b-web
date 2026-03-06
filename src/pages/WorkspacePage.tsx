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
    : 'rgba(255,255,255,0.2)'

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
      setTimeout(() => setRoomCopied(false), 2000)
    })
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ━━ TOP BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="header-glass" style={{
        display: 'flex', alignItems: 'center',
        padding: '0 24px', height: 52, gap: 14, flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div className="logo-mark" style={{ width: 26, height: 26 }}>
            <span style={{ color: '#111', fontWeight: 800, fontSize: 13 }}>i</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>ISOL Studio</span>
          {workspaceSlug && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/ {workspaceSlug}</span>
          )}
        </div>

        {/* Session metadata — shown when active */}
        {sessionActive && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '4px 14px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--divider)',
            borderRadius: 20,
            fontSize: 12, color: 'var(--text-dim)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: statusColor,
              transition: 'background 0.3s', flexShrink: 0,
              animation: isActive ? 'livePulse 2s ease-in-out infinite' : undefined,
            }} />
            <span style={{ fontWeight: 500 }}>{statusLabel}</span>
            {targetLangLabel && (
              <>
                <span style={{ color: 'var(--divider)' }}>·</span>
                <span>{targetLangLabel.flag} {targetLangLabel.label}</span>
              </>
            )}
            {roomCode && (
              <>
                <span style={{ color: 'var(--divider)' }}>·</span>
                <span style={{
                  fontFamily: 'monospace', fontSize: 11,
                  letterSpacing: '0.06em', color: 'var(--text-muted)',
                }}>{roomCode}</span>
                <button
                  onClick={handleCopyRoom}
                  style={{
                    background: 'none',
                    color: roomCopied ? 'var(--live)' : 'var(--text-muted)',
                    fontSize: 11, fontWeight: 600,
                    padding: '2px 6px', borderRadius: 4,
                    border: 'none', cursor: 'pointer',
                    transition: 'color 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {roomCopied ? '✓' : 'Copy'}
                </button>
              </>
            )}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <span style={{
          fontSize: 12, color: 'var(--text-muted)',
          maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{session.email}</span>
        <button onClick={handleLogout} className="btn-icon" style={{ fontSize: 12, padding: '5px 12px' }}>
          Sign out
        </button>
      </header>

      {/* ━━ BODY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── MAIN: canvas + dock ───────────────────────────── */}
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}>

          {/* Error */}
          {error && (
            <div style={{ padding: '12px 32px 0', flexShrink: 0 }}>
              <ErrorBanner message={error} onDismiss={() => setError('')} />
            </div>
          )}

          {/* ── Canvas ────────────────────────────────────── */}
          {!compact && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

              {/* Sticky note: AI structured version available post-session */}
              {canAi && !sessionActive && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                  <div className="sticky-note" style={{ maxWidth: 260 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontWeight: 700, fontSize: 12, marginBottom: 6,
                    }}>
                      <span>✦</span> AI-structured version ready
                    </div>
                    <p style={{ fontSize: 12, opacity: 0.70, lineHeight: 1.5 }}>
                      Toggle "AI Enhanced" in the document to see the clean structured view.
                    </p>
                  </div>
                </div>
              )}

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

          {/* ── Control dock ──────────────────────────────── */}
          <div className="control-dock">
            {!sessionActive ? (
              <>
                {/* Source */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className={`dock-source-btn${audioSource === 'display' ? ' active' : ''}`}
                    onClick={() => setAudioSource('display')}
                  >
                    <span style={{ fontSize: 15 }}>🖥</span> Screen
                  </button>
                  <button
                    className={`dock-source-btn${audioSource === 'microphone' ? ' active' : ''}`}
                    onClick={() => setAudioSource('microphone')}
                  >
                    <span style={{ fontSize: 15 }}>🎤</span> Mic
                  </button>
                </div>

                <div className="dock-divider" />

                {/* Language */}
                <div className="control-dock-lang" style={{ width: 200 }}>
                  <LanguageSelector value={targetLang} onChange={setTargetLang} disabled={false} />
                </div>

                <div style={{ flex: 1 }} />

                {isUnsupported && (
                  <span style={{ fontSize: 12, color: 'var(--orange)', flexShrink: 0 }}>
                    Use Chrome/Edge or switch to Mic
                  </span>
                )}

                {transcript.length > 0 && (
                  <button onClick={() => setShowModal(true)} className="btn-icon" style={{ fontSize: 13 }}>
                    Export document
                  </button>
                )}

                <button
                  onClick={handleStart}
                  disabled={isUnsupported}
                  className="btn-primary"
                >
                  Start session →
                </button>
              </>
            ) : (
              <>
                <div style={{ flex: 1 }} />

                <button
                  onClick={() => setCompact(c => !c)}
                  className="btn-icon"
                  style={{ fontSize: 13 }}
                >
                  {compact ? '⊞ Show document' : '⊟ Compact'}
                </button>

                {transcript.length > 0 && (
                  <button onClick={() => setShowModal(true)} className="btn-icon" style={{ fontSize: 13 }}>
                    Export →
                  </button>
                )}

                {/* Stop */}
                <button
                  onClick={handleStop}
                  style={{
                    background: 'rgba(255,107,107,0.08)',
                    border: '1px solid rgba(255,107,107,0.20)',
                    color: 'var(--red)',
                    fontWeight: 600, fontSize: 13,
                    padding: '0 18px', height: 38,
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer', transition: 'background 0.15s',
                    whiteSpace: 'nowrap', flexShrink: 0,
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,107,107,0.14)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,107,107,0.08)'}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: 2,
                    background: 'var(--red)', flexShrink: 0,
                  }} />
                  Stop
                </button>
              </>
            )}
          </div>
        </main>

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

      {/* Glossary drawer — overlay, does not compress canvas */}
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

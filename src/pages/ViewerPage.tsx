import { useParams, useNavigate } from 'react-router-dom'
import { useState, useCallback, useRef, useEffect } from 'react'
import { getSession } from '../lib/auth'
import { useWebSocket } from '../hooks/useWebSocket'
import type { SubtitleMessage } from '../hooks/useWebSocket'
import DocumentView from '../components/DocumentView'
import TranscriptModal from '../components/TranscriptModal'
import GlossaryPanel from '../components/GlossaryPanel'
import LanguageSelector from '../components/LanguageSelector'

interface TranscriptLine { text: string; time: Date }

export default function ViewerPage() {
  const { workspaceSlug, sessionId } = useParams<{ workspaceSlug: string; sessionId: string }>()
  const navigate = useNavigate()
  const session = getSession()

  const [targetLang, setTargetLang] = useState('en')
  const [currentLine, setCurrentLine] = useState('')
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [joined, setJoined] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [glossaryWord, setGlossaryWord] = useState<{ word: string; sentence: string } | null>(null)
  const wordIndex = useRef<Map<string, string[]>>(new Map())
  const [aiFormatted, setAiFormatted] = useState<string | undefined>()
  const [aiFormattedAt, setAiFormattedAt] = useState<number | undefined>()
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMode, setAiMode] = useState(false)
  const aiRunningRef = useRef(false)
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
          if (!r.ok) { r.text().then(t => console.error(`AI format error ${r.status}: ${t}`)); return null }
          return r.json()
        })
        .then((data: { formatted?: string } | null) => {
          if (data?.formatted) { setAiFormatted(data.formatted); setAiFormattedAt(snapLength) }
        })
        .catch(e => console.error(`AI format failed: ${e.message}`))
        .finally(() => { setAiLoading(false); aiRunningRef.current = false })
    }, 2000)
  }, [transcript.length])

  const wssUrl = import.meta.env.VITE_WSS_URL ?? 'wss://api.isol.live/audio'

  const targetLangRef = useRef(targetLang)
  useEffect(() => { targetLangRef.current = targetLang }, [targetLang])

  const handleMessage = useCallback((msg: SubtitleMessage) => {
    if (msg.line_final) {
      const time = new Date()
      const lang = targetLangRef.current
      const textToTranslate = msg.original_text || msg.line_final
      fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToTranslate, targetLang: lang }),
      })
        .then(r => r.ok ? r.json() : null)
        .then((data: { translated?: string } | null) => {
          const finalText = data?.translated?.trim() || msg.line_final
          setTranscript(prev => [...prev, { text: finalText, time }])
          finalText.split(/\s+/).forEach(raw => {
            const w = raw.toLowerCase().replace(/[^\w]/g, '')
            if (w.length < 3) return
            const existing = wordIndex.current.get(w) ?? []
            wordIndex.current.set(w, [...existing, finalText])
          })
        })
        .catch(() => {
          setTranscript(prev => [...prev, { text: msg.line_final, time }])
        })
    }
    setCurrentLine(msg.line_next || '')
  }, [])

  const ws = useWebSocket({
    url: wssUrl,
    targetLang,
    onMessage: handleMessage,
    viewerSessionId: sessionId,
  })

  if (!session) {
    navigate(`/login?next=/join/${workspaceSlug}/${sessionId}`, { replace: true })
    return null
  }

  const handleJoin = () => { ws.open(); setJoined(true) }

  const isActive = ws.state === 'connected'
  const statusColor = ws.state === 'error' ? 'var(--red)'
    : ws.state === 'reconnecting' ? 'var(--orange)'
    : isActive ? 'var(--live)'
    : 'rgba(255,255,255,0.2)'

  const handleWordClick = useCallback((word: string, sentence: string) => {
    setGlossaryWord({ word: word.toLowerCase(), sentence })
  }, [])

  const joinedRef = useRef(false)
  useEffect(() => { joinedRef.current = joined }, [joined])
  const langInitRef = useRef(false)
  useEffect(() => {
    if (!langInitRef.current) { langInitRef.current = true; return }
    if (!joinedRef.current) return
    ws.close()
    const t = setTimeout(() => ws.open(), 150)
    return () => clearTimeout(t)
  }, [targetLang])   // eslint-disable-line react-hooks/exhaustive-deps

  const handleLangChange = useCallback((lang: string) => {
    setTargetLang(lang)
  }, [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ━━ TOP BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="header-glass" style={{
        display: 'flex', alignItems: 'center',
        padding: '0 24px', height: 52, gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div className="logo-mark" style={{ width: 26, height: 26 }}>
            <span style={{ color: '#111', fontWeight: 800, fontSize: 13 }}>i</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>ISOL Studio</span>
          {workspaceSlug && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/ {workspaceSlug}</span>
          )}
        </div>

        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase',
          background: 'rgba(88,213,201,0.08)',
          border: '1px solid rgba(88,213,201,0.18)',
          color: 'var(--teal)',
          borderRadius: 6, padding: '3px 9px',
        }}>Viewer</span>

        <div style={{ flex: 1 }} />

        {joined && (
          <div className="status-pill">
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: statusColor,
              transition: 'all 0.3s', flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              {ws.state === 'connected' ? 'Live'
                : ws.state === 'connecting' ? 'Connecting…'
                : ws.state === 'reconnecting' ? 'Reconnecting…'
                : 'Waiting…'}
            </span>
          </div>
        )}
      </header>

      {/* ━━ BODY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: joined ? '28px 32px' : '0',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}>
          {!joined ? (

            /* ── Pre-join screen ──────────────────────────── */
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 28px',
            }}>
              <div style={{ maxWidth: 480, width: '100%' }}>

                {/* Live badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(60,203,127,0.07)',
                  border: '1px solid rgba(60,203,127,0.18)',
                  borderRadius: 20, padding: '5px 14px', marginBottom: 28,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--live)',
                    animation: 'livePulse 2s ease-in-out infinite',
                  }} />
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--live)',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>Session in progress</span>
                </div>

                <h2 style={{
                  fontSize: 'clamp(26px, 3vw, 36px)',
                  fontWeight: 700,
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  marginBottom: 14,
                }}>
                  You're entering<br />
                  <span className="gradient-text">a live room</span>
                </h2>
                <p style={{
                  fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.65, marginBottom: 36,
                }}>
                  Choose your language and follow the live document as it happens.
                </p>

                {/* Language picker */}
                <div style={{
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  marginBottom: 24,
                }}>
                  <div style={{ maxWidth: 240 }}>
                    <LanguageSelector value={targetLang} onChange={setTargetLang} disabled={false} />
                  </div>
                </div>

                <button
                  onClick={handleJoin}
                  className="btn-primary"
                  style={{ fontSize: 15, padding: '0 32px', height: 48 }}
                >
                  Join the room →
                </button>

              </div>
            </div>

          ) : (

            /* ── Joined ───────────────────────────────────── */
            <>
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 24, flexShrink: 0,
              }}>
                <div style={{ width: 200 }}>
                  <LanguageSelector value={targetLang} onChange={handleLangChange} disabled={false} />
                </div>
                {transcript.length > 0 && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="btn-icon"
                    style={{ fontSize: 13, marginLeft: 'auto' }}
                  >
                    Export document →
                  </button>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <DocumentView
                  transcript={transcript}
                  currentLine={currentLine}
                  isActive={isActive}
                  targetLang={targetLang}
                  aiFormatted={aiFormatted}
                  aiFormattedAt={aiFormattedAt}
                  aiLoading={aiLoading}
                  aiMode={aiMode}
                  onAiModeChange={setAiMode}
                  onWordClick={handleWordClick}
                />
              </div>
            </>

          )}
        </main>

      </div>

      {/* ━━ MODALS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {showModal && (
        <TranscriptModal
          transcript={transcript}
          targetLang={targetLang}
          aiFormatted={aiFormatted}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Glossary drawer — overlay */}
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

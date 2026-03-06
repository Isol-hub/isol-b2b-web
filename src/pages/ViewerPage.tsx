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
  const aiRunningRef = useRef(false)
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <header className="header-glass" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="logo-mark" style={{ width: 28, height: 28 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>i</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em' }}>ISOL</span>
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>/ {workspaceSlug}</span>
          <span style={{
            fontSize: 11, background: 'rgba(124,58,237,0.15)',
            border: '1px solid rgba(124,58,237,0.30)',
            color: '#a78bfa', borderRadius: 6, padding: '2px 8px',
            fontWeight: 600, letterSpacing: '0.06em',
          }}>
            VIEWER
          </span>
        </div>
        {joined && (
          <div className="status-pill">
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: statusColor,
              transition: 'all 0.3s',
              flexShrink: 0,
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

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 860,
        margin: '0 auto',
        width: '100%',
        padding: '32px 28px',
        gap: 20,
        overflowY: 'auto',
      }}>
        {!joined ? (
          /* Join screen */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 480 }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.22)',
                borderRadius: 20, padding: '4px 14px', marginBottom: 20,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--live)',
                  animation: 'livePulse 2s ease-in-out infinite',
                }} />
                <span style={{ fontSize: 11, color: 'var(--live)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Session in progress</span>
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                You've been invited<br /><span className="gradient-text">to a live session</span>
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                Choose your language and join. You'll see live captions as they're spoken, with real-time translation.
              </p>
            </div>

            <div style={{ width: 220 }}>
              <LanguageSelector value={targetLang} onChange={setTargetLang} disabled={false} />
            </div>

            <button
              onClick={handleJoin}
              className="btn-primary"
              style={{ alignSelf: 'flex-start', fontSize: 15, padding: '12px 32px' }}
            >
              Join session →
            </button>
          </div>
        ) : (
          <>
            {/* Language + export bar */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
              <div style={{ width: 200 }}>
                <LanguageSelector value={targetLang} onChange={handleLangChange} disabled={false} />
              </div>
              {transcript.length > 0 && (
                <button
                  onClick={() => setShowModal(true)}
                  className="btn-icon"
                  style={{ fontSize: 13, padding: '9px 16px', marginLeft: 'auto' }}
                >
                  Edit & Export →
                </button>
              )}
            </div>

            <DocumentView
              transcript={transcript}
              currentLine={currentLine}
              isActive={isActive}
              targetLang={targetLang}
              aiFormatted={aiFormatted}
              aiFormattedAt={aiFormattedAt}
              aiLoading={aiLoading}
              onWordClick={handleWordClick}
            />
          </>
        )}
      </main>

      {showModal && (
        <TranscriptModal
          transcript={transcript}
          targetLang={targetLang}
          aiFormatted={aiFormatted}
          onClose={() => setShowModal(false)}
        />
      )}

      {glossaryWord && (
        <GlossaryPanel
          word={glossaryWord.word}
          sentences={wordIndex.current.get(glossaryWord.word) ?? [glossaryWord.sentence]}
          currentSentence={glossaryWord.sentence}
          targetLang={targetLang}
          onClose={() => setGlossaryWord(null)}
        />
      )}
    </div>
  )
}

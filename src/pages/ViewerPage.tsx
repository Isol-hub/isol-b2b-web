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
  const [aiLoading, setAiLoading] = useState(false)
  const aiRunningRef = useRef(false)

  useEffect(() => {
    if (transcript.length === 0 || transcript.length % 20 !== 0) return
    if (aiRunningRef.current) return
    aiRunningRef.current = true
    setAiLoading(true)
    fetch('/api/ai/format', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: transcript.map(l => l.text) }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: { formatted?: string } | null) => {
        if (data?.formatted) setAiFormatted(data.formatted)
      })
      .catch(() => {})
      .finally(() => { setAiLoading(false); aiRunningRef.current = false })
  }, [transcript.length])

  const wssUrl = import.meta.env.VITE_WSS_URL ?? 'wss://api.isol.live/audio'

  const handleMessage = useCallback((msg: SubtitleMessage) => {
    if (msg.line_final) {
      setTranscript(prev => [...prev, { text: msg.line_final, time: new Date() }])
      msg.line_final.split(/\s+/).forEach(raw => {
        const w = raw.toLowerCase().replace(/[^\w]/g, '')
        if (w.length < 3) return
        const existing = wordIndex.current.get(w) ?? []
        wordIndex.current.set(w, [...existing, msg.line_final])
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
    : isActive ? 'var(--green)'
    : 'rgba(238,242,255,0.25)'

  const handleWordClick = useCallback((word: string, sentence: string) => {
    setGlossaryWord({ word: word.toLowerCase(), sentence })
  }, [])

  const handleLangChange = useCallback((lang: string) => {
    setTargetLang(lang)
    if (joined) { ws.close(); setTimeout(() => ws.open(), 100) }
  }, [joined, ws])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="header-glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="logo-mark" style={{ width: 30, height: 30 }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>i</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em' }}>ISOL</span>
          <span style={{ fontSize: 13, color: 'var(--text-dim)', marginLeft: 2 }}>/ {workspaceSlug}</span>
          <span style={{ fontSize: 11, background: 'rgba(124,58,237,0.20)', border: '1px solid rgba(124,58,237,0.35)', color: '#c4b5fd', borderRadius: 6, padding: '2px 8px', fontWeight: 600, letterSpacing: '0.06em' }}>
            VIEWER
          </span>
        </div>
        {joined && (
          <div className="status-pill">
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: isActive ? `0 0 8px ${statusColor}` : 'none', flexShrink: 0, transition: 'all 0.3s' }} />
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              {ws.state === 'connected' ? 'Live' : ws.state === 'connecting' ? 'Connecting…' : ws.state === 'reconnecting' ? 'Reconnecting…' : 'Waiting…'}
            </span>
          </div>
        )}
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 880, margin: '0 auto', width: '100%', padding: '32px 28px', gap: 20 }}>
        {!joined ? (
          /* Join screen */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 480 }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)',
                borderRadius: 20, padding: '5px 14px', marginBottom: 16,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', animation: 'roomPulse 2s infinite' }} />
                <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Session in progress</span>
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10, letterSpacing: '-0.02em' }}>
                You've been invited<br /><span className="gradient-text">to a live session</span>
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.7 }}>
                Choose your language and join. You'll see live captions as they're spoken, with real-time translation.
              </p>
            </div>

            <div style={{ width: 240 }}>
              <LanguageSelector value={targetLang} onChange={setTargetLang} disabled={false} />
            </div>

            <button
              onClick={handleJoin}
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)',
                color: '#fff', fontWeight: 700, fontSize: 15,
                padding: '13px 36px', borderRadius: 13, border: 'none',
                cursor: 'pointer', alignSelf: 'flex-start',
                boxShadow: '0 0 28px rgba(124,58,237,0.40)',
              }}
            >
              Join session →
            </button>
          </div>
        ) : (
          <>
            {/* Language selector (can change after joining) */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
              <div style={{ width: 200 }}>
                <LanguageSelector value={targetLang} onChange={handleLangChange} disabled={false} />
              </div>
              {transcript.length > 0 && (
                <button onClick={() => setShowModal(true)} className="btn-icon" style={{ fontSize: 13, padding: '10px 18px', marginLeft: 'auto' }}>
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
          onClose={() => setShowModal(false)}
        />
      )}

      {glossaryWord && (
        <GlossaryPanel
          word={glossaryWord.word}
          sentences={wordIndex.current.get(glossaryWord.word) ?? [glossaryWord.sentence]}
          currentSentence={glossaryWord.sentence}
          onClose={() => setGlossaryWord(null)}
        />
      )}
    </div>
  )
}

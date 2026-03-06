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

  // Glossary state
  const [glossaryWord, setGlossaryWord] = useState<{ word: string; sentence: string } | null>(null)

  // AI formatting state
  const [aiFormatted, setAiFormatted] = useState<string | undefined>()
  const [aiLoading, setAiLoading] = useState(false)
  const aiRunningRef = useRef(false)

  // Build word→sentences index from transcript
  const wordIndex = useRef<Map<string, string[]>>(new Map())

  // Trigger AI formatting every 20 finalized lines
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
      .then(r => {
        if (!r.ok) { r.text().then(t => setError(`AI format error ${r.status}: ${t}`)); return null }
        return r.json()
      })
      .then((data: { formatted?: string } | null) => {
        if (data?.formatted) setAiFormatted(data.formatted)
      })
      .catch(e => setError(`AI format failed: ${e.message}`))
      .finally(() => { setAiLoading(false); aiRunningRef.current = false })
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

      // Index words for glossary
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
    setAiFormatted(undefined); setAiLoading(false)
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
    const w = word.toLowerCase()
    setGlossaryWord({ word: w, sentence })
  }, [])

  if (!session) { navigate('/login', { replace: true }); return null }

  const isUnsupported = audioSource === 'display' && !('getDisplayMedia' in navigator.mediaDevices)
  const targetLangLabel = LANGUAGES.find(l => l.code === targetLang)
  const isActive = audio.state === 'active' && ws.state === 'connected'

  const statusColor = ws.state === 'error' || audio.state === 'error' ? 'var(--red)'
    : ws.state === 'reconnecting' ? 'var(--orange)'
    : isActive ? 'var(--green)'
    : 'rgba(238,242,255,0.25)'

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
              { n: '3', text: 'Start — share audio when prompted' },
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
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 880, margin: '0 auto', width: '100%', padding: '28px 28px', gap: 20 }}>

        {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

        {/* Controls */}
        {!sessionActive ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Audio source</p>
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
                  whiteSpace: 'nowrap',
                }}
              >
                Start session →
              </button>
              <button onClick={() => setCompact(c => !c)} className="btn-icon" title="Compact panel" style={{ fontSize: 18 }}>⊟</button>
            </div>
            {isUnsupported && (
              <p style={{ fontSize: 13, color: 'var(--orange)', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.20)', borderRadius: 10, padding: '10px 14px' }}>
                Screen audio not supported. Switch to Microphone or use Chrome/Edge.
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <LanguageSelector value={targetLang} onChange={setTargetLang} disabled={true} />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={handleStop} style={{
                background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.22)',
                color: 'var(--red)', fontWeight: 600, fontSize: 14,
                padding: '10px 24px', borderRadius: 12, cursor: 'pointer',
              }}>Stop</button>
              <button onClick={() => setCompact(c => !c)} className="btn-icon" style={{ fontSize: 18 }}>⊟</button>
            </div>
          </div>
        )}

        {/* Live document view */}
        {!compact && (
          <DocumentView
            transcript={transcript}
            currentLine={currentLine}
            isActive={isActive}
            targetLang={targetLangLabel ? `${targetLangLabel.flag} ${targetLangLabel.label}` : targetLang}
            aiFormatted={aiFormatted}
            aiLoading={aiLoading}
            onWordClick={handleWordClick}
          />
        )}

        {/* Room panel — shown when session active and we have session_id */}
        {sessionActive && ws.sessionId && workspaceSlug && (
          <RoomPanel sessionId={ws.sessionId} workspaceSlug={workspaceSlug} />
        )}

        {/* Post-session: edit & export */}
        {!sessionActive && transcript.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(167,139,250,0.18)',
            borderRadius: 14, padding: '16px 22px', gap: 16,
            backdropFilter: 'blur(16px)',
          }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Session complete</p>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{transcript.length} lines captured</p>
            </div>
            <button onClick={() => setShowModal(true)} style={{
              background: 'linear-gradient(135deg,#7c3aed,#0ea5e9)',
              color: '#fff', fontWeight: 700, fontSize: 13,
              padding: '10px 24px', borderRadius: 11, border: 'none',
              cursor: 'pointer', boxShadow: '0 0 20px rgba(124,58,237,0.30)',
            }}>
              Edit & Export →
            </button>
          </div>
        )}
      </main>

      {/* Compact floating panel */}
      {compact && (
        <CompactPanel
          current={currentLine}
          previous={transcript[transcript.length - 1]?.text ?? ''}
          wsState={ws.state} audioState={audio.state}
          onClose={() => setCompact(false)}
        />
      )}

      {/* Transcript modal */}
      {showModal && (
        <TranscriptModal
          transcript={transcript}
          targetLang={targetLang}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Glossary panel */}
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

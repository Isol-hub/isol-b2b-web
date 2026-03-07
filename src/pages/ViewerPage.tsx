import { useParams } from 'react-router-dom'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import type { SubtitleMessage } from '../hooks/useWebSocket'
import DocumentView, { type ViewMode } from '../components/DocumentView'
import type { CommentItem } from '../components/CommentThread'
import TranscriptModal from '../components/TranscriptModal'
import GlossaryPanel from '../components/GlossaryPanel'
import LanguageSelector from '../components/LanguageSelector'

interface TranscriptLine { text: string; time: Date }

export default function ViewerPage() {
  const { workspaceSlug, sessionId } = useParams<{ workspaceSlug: string; sessionId: string }>()

  const [targetLang, setTargetLang] = useState('en')
  const [currentLine, setCurrentLine] = useState('')
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [joined, setJoined] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [glossaryWord, setGlossaryWord] = useState<{ word: string; sentence: string } | null>(null)
  const wordIndex = useRef<Map<string, string[]>>(new Map())
  const transcriptRef = useRef<TranscriptLine[]>([])
  useEffect(() => { transcriptRef.current = transcript }, [transcript])

  // AI state
  const [aiFormatted, setAiFormatted] = useState<string | undefined>()
  const [aiFormattedAt, setAiFormattedAt] = useState<number | undefined>()
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNotes, setAiNotes] = useState<string | undefined>()
  const [aiNotesLoading, setAiNotesLoading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('raw')
  const aiRunningRef = useRef(false)
  const notesRunningRef = useRef(false)
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lineNextDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasAutoSwitchedRef = useRef(false)

  // Comments (per line)
  const [lineComments, setLineComments] = useState<Map<number, CommentItem[]>>(new Map())
  const [openCommentLine, setOpenCommentLine] = useState<number | null>(null)
  const [commentAuthor, setCommentAuthor] = useState(() => localStorage.getItem('isol_commenter_name') || '')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const commentPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Edit overrides from host
  const [editOverrides, setEditOverrides] = useState<Map<number, string>>(new Map())
  const editPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const saveCommentAuthor = (name: string) => {
    setCommentAuthor(name)
    localStorage.setItem('isol_commenter_name', name)
  }

  // Auto-switch to AI exactly once on first format arrival
  useEffect(() => {
    if (aiFormatted && !hasAutoSwitchedRef.current) {
      hasAutoSwitchedRef.current = true
      setViewMode('ai')
    }
  }, [aiFormatted])

  // AI format
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
        .then(r => r.ok ? r.json() : null)
        .then((data: { formatted?: string } | null) => {
          if (data?.formatted) { setAiFormatted(data.formatted); setAiFormattedAt(snapLength) }
        })
        .catch(() => {})
        .finally(() => { setAiLoading(false); aiRunningRef.current = false })
    }, 2000)
  }, [transcript.length])

  // AI notes
  useEffect(() => {
    if (transcript.length < 5) return
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current)
    notesDebounceRef.current = setTimeout(() => {
      if (notesRunningRef.current) return
      notesRunningRef.current = true
      setAiNotesLoading(true)
      fetch('/api/ai/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: transcript.map(l => l.text) }),
      })
        .then(r => r.ok ? r.json() : null)
        .then((data: { notes?: string } | null) => {
          if (data?.notes) setAiNotes(data.notes)
        })
        .catch(() => {})
        .finally(() => { setAiNotesLoading(false); notesRunningRef.current = false })
    }, 3500)
  }, [transcript.length])

  const wssUrl = import.meta.env.VITE_WSS_URL ?? 'wss://api.isol.live/audio'
  const targetLangRef = useRef(targetLang)
  useEffect(() => { targetLangRef.current = targetLang }, [targetLang])

  const handleMessage = useCallback((msg: SubtitleMessage) => {
    if (msg.line_final) {
      const time = new Date()
      const lang = targetLangRef.current
      const textToTranslate = msg.original_text || msg.line_final
      const context = transcriptRef.current.slice(-3).map(l => l.text)
      fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current: textToTranslate, context, targetLang: lang }),
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
    // line_next: translate with debounce to avoid excessive API calls
    const nextText = msg.line_next || ''
    if (lineNextDebounceRef.current) clearTimeout(lineNextDebounceRef.current)
    if (!nextText) {
      setCurrentLine('')
    } else {
      lineNextDebounceRef.current = setTimeout(() => {
        const lang = targetLangRef.current
        if (lang === 'en') {
          setCurrentLine(nextText)
          return
        }
        fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current: nextText, context: [], targetLang: lang }),
        })
          .then(r => r.ok ? r.json() : null)
          .then((data: { translated?: string } | null) => {
            setCurrentLine(data?.translated?.trim() || nextText)
          })
          .catch(() => setCurrentLine(nextText))
      }, 600)
    }
  }, [])

  const ws = useWebSocket({ url: wssUrl, targetLang, onMessage: handleMessage, viewerSessionId: sessionId, onSessionEnd: () => setSessionEnded(true) })

  // Start polling when joined
  useEffect(() => {
    if (!joined || !sessionId) return

    const buildCommentMap = (arr: Array<{ id: number; line_index: number | null; author: string; body: string; created_at: number }>) => {
      const m = new Map<number, CommentItem[]>()
      arr.forEach(c => {
        const idx = c.line_index ?? -1
        const existing = m.get(idx) ?? []
        m.set(idx, [...existing, { id: c.id, author: c.author, body: c.body, created_at: c.created_at }])
      })
      return m
    }

    const fetchComments = () => {
      fetch(`/api/viewer/${sessionId}/comments`)
        .then(r => r.ok ? r.json() : null)
        .then((data: { comments: Array<{ id: number; line_index: number | null; author: string; body: string; created_at: number }> } | null) => {
          if (data) setLineComments(buildCommentMap(data.comments))
        })
        .catch(() => {})
    }

    const fetchEdits = () => {
      fetch(`/api/viewer/${sessionId}/edits`)
        .then(r => r.ok ? r.json() : null)
        .then((data: { edits: { line_index: number; text: string }[] } | null) => {
          if (data?.edits?.length) {
            setEditOverrides(prev => {
              const next = new Map(prev)
              data.edits.forEach(e => next.set(e.line_index, e.text))
              return next
            })
          }
        })
        .catch(() => {})
    }

    fetchComments()
    fetchEdits()
    commentPollRef.current = setInterval(fetchComments, 10_000)
    editPollRef.current = setInterval(fetchEdits, 5_000)

    return () => {
      if (commentPollRef.current) clearInterval(commentPollRef.current)
      if (editPollRef.current) clearInterval(editPollRef.current)
    }
  }, [joined, sessionId])

  const handleJoin = () => { ws.open(); setJoined(true) }

  const handleAddComment = useCallback(async (lineIndex: number, body: string): Promise<void> => {
    if (!body.trim() || !sessionId) return
    setCommentSubmitting(true)
    const name = commentAuthor.trim() || 'Anonymous'
    saveCommentAuthor(name)
    try {
      const res = await fetch(`/api/viewer/${sessionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: name, body: body.trim(), line_index: lineIndex }),
      })
      if (res.ok) {
        const c = await res.json() as { id: number; line_index: number | null; author: string; body: string; created_at: number }
        setLineComments(prev => {
          const next = new Map(prev)
          const idx = c.line_index ?? -1
          const existing = next.get(idx) ?? []
          next.set(idx, [...existing, { id: c.id, author: c.author, body: c.body, created_at: c.created_at }])
          return next
        })
      }
    } finally {
      setCommentSubmitting(false)
    }
  }, [sessionId, commentAuthor])

  // Apply edit overrides to transcript
  const displayTranscript = editOverrides.size > 0
    ? transcript.map((l, i) => editOverrides.has(i) ? { ...l, text: editOverrides.get(i)! } : l)
    : transcript

  const isActive = ws.state === 'connected'
  const statusColor = sessionEnded ? 'var(--text-muted)'
    : ws.state === 'error' ? 'var(--red)'
    : ws.state === 'reconnecting' ? 'var(--orange)'
    : isActive ? 'var(--live)'
    : 'rgba(0,0,0,0.12)'

  const statusText = sessionEnded ? 'Session ended'
    : ws.state === 'connected' ? 'Live'
    : ws.state === 'connecting' ? 'Connecting…'
    : ws.state === 'reconnecting' ? 'Connecting…'
    : 'Waiting…'

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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ━━ TOP BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="header-glass" style={{ display: 'flex', alignItems: 'center', padding: '0 24px', height: 52, gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div className="logo-mark" style={{ width: 26, height: 26 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>i</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>ISOL Studio</span>
          {workspaceSlug && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/ {workspaceSlug}</span>}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: 'var(--accent)', borderRadius: 6, padding: '3px 9px' }}>Viewer</span>
        <div style={{ flex: 1 }} />
        {joined && (
          <div className="status-pill">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, transition: 'all 0.3s', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{statusText}</span>
          </div>
        )}
      </header>

      {/* ━━ BODY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <main style={{ flex: 1, overflowY: 'auto', padding: joined ? '28px 32px' : '0', display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {!joined ? (
            /* ── Pre-join ──────────────────────────────────── */
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 28px' }}>
              <div style={{ maxWidth: 480, width: '100%' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: 20, padding: '5px 14px', marginBottom: 28 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)', animation: 'livePulse 2s ease-in-out infinite' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--live)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Session in progress</span>
                </div>
                <h2 style={{ fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 14 }}>
                  You're entering<br /><span className="gradient-text">a live room</span>
                </h2>
                <p style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.65, marginBottom: 36 }}>
                  Choose your language and follow the live document as it happens.
                </p>
                <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: 24 }}>
                  <div style={{ maxWidth: 240 }}>
                    <LanguageSelector value={targetLang} onChange={setTargetLang} disabled={false} />
                  </div>
                </div>
                <button onClick={handleJoin} className="btn-primary" style={{ fontSize: 15, padding: '0 32px', height: 48 }}>
                  Join the room →
                </button>
              </div>
            </div>

          ) : (
            /* ── Joined ────────────────────────────────────── */
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 24, flexShrink: 0 }}>
                <div style={{ width: 200 }}>
                  <LanguageSelector value={targetLang} onChange={setTargetLang} disabled={false} />
                </div>
                {transcript.length > 0 && (
                  <button onClick={() => setShowModal(true)} className="btn-icon" style={{ fontSize: 13, marginLeft: 'auto' }}>
                    Export →
                  </button>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <DocumentView
                  transcript={displayTranscript}
                  currentLine={currentLine}
                  isActive={isActive}
                  targetLang={targetLang}
                  aiFormatted={aiFormatted}
                  aiFormattedAt={aiFormattedAt}
                  aiLoading={aiLoading}
                  aiNotes={aiNotes}
                  aiNotesLoading={aiNotesLoading}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  onWordClick={handleWordClick}
                  lineComments={lineComments}
                  openCommentLine={openCommentLine}
                  onOpenCommentLine={setOpenCommentLine}
                  commentAuthor={commentAuthor}
                  onCommentAuthorChange={saveCommentAuthor}
                  onAddComment={handleAddComment}
                  commentSubmitting={commentSubmitting}
                />
              </div>
            </>
          )}
        </main>
      </div>

      {/* ━━ MODALS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {showModal && (
        <TranscriptModal
          transcript={displayTranscript}
          targetLang={targetLang}
          aiFormatted={aiFormatted}
          onClose={() => setShowModal(false)}
        />
      )}
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

import { useParams } from 'react-router-dom'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import type { SubtitleMessage } from '../hooks/useWebSocket'
import DocumentView, { type ViewMode } from '../components/DocumentView'
import type { CommentItem } from '../components/CommentThread'
import TranscriptModal from '../components/TranscriptModal'
import GlossaryPanel from '../components/GlossaryPanel'
import LanguageSelector from '../components/LanguageSelector'
import { LANGUAGES } from '../lib/languages'

interface TranscriptLine { text: string; time: Date }

export default function ViewerPage() {
  const { workspaceSlug, sessionId } = useParams<{ workspaceSlug: string; sessionId: string }>()

  const [targetLang, setTargetLang] = useState('en')
  const [currentLine, setCurrentLine] = useState('')
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [translatedLines, setTranslatedLines] = useState<Map<number, string>>(new Map())
  const translateQueueRef = useRef<number[]>([])
  const translateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [joined, setJoined] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [endedShareToken, setEndedShareToken] = useState<string | null | undefined>(undefined)
  const [showModal, setShowModal] = useState(false)
  const [glossaryWord, setGlossaryWord] = useState<{ word: string; sentence: string } | null>(null)
  const wordIndex = useRef<Map<string, string[]>>(new Map())
  const transcriptRef = useRef<TranscriptLine[]>([])
  useEffect(() => { transcriptRef.current = transcript }, [transcript])

  // Fetch share token when session ends
  useEffect(() => {
    if (!sessionEnded || !sessionId) return
    fetch(`/api/viewer/${sessionId}/meta`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { share_token: string | null } | null) => setEndedShareToken(d?.share_token ?? null))
      .catch(() => setEndedShareToken(null))
  }, [sessionEnded, sessionId])

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
        body: JSON.stringify({ lines: transcript.map(l => l.text), targetLang: targetLangRef.current }),
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
        body: JSON.stringify({ lines: transcript.map(l => l.text), targetLang: targetLangRef.current }),
      })
        .then(r => r.ok ? r.json() : null)
        .then((data: { notes?: string } | null) => {
          if (data?.notes) setAiNotes(data.notes)
        })
        .catch(() => {})
        .finally(() => { setAiNotesLoading(false); notesRunningRef.current = false })
    }, 3500)
  }, [transcript.length])

  // Flush queued line indices → POST /api/translate → update translatedLines
  const flushTranslateQueue = useCallback(() => {
    const indices = [...translateQueueRef.current]
    translateQueueRef.current = []
    if (!indices.length) return
    const lang = targetLangRef.current
    const lines = indices.map(i => transcriptRef.current[i]?.text).filter(Boolean)
    if (!lines.length) return
    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines, target_lang: lang }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: { translations: string[] } | null) => {
        if (!data?.translations) return
        setTranslatedLines(prev => {
          const next = new Map(prev)
          indices.forEach((lineIdx, i) => {
            if (data.translations[i]) next.set(lineIdx, data.translations[i])
          })
          return next
        })
      })
      .catch(() => {})
  }, [])

  const scheduleTranslate = useCallback((lineIdx: number) => {
    translateQueueRef.current.push(lineIdx)
    if (translateTimerRef.current) clearTimeout(translateTimerRef.current)
    translateTimerRef.current = setTimeout(flushTranslateQueue, 600)
  }, [flushTranslateQueue])

  const wssUrl = import.meta.env.VITE_WSS_URL ?? 'wss://api.isol.live/audio'
  const targetLangRef = useRef(targetLang)
  useEffect(() => { targetLangRef.current = targetLang }, [targetLang])

  const handleMessage = useCallback((msg: SubtitleMessage) => {
    if (msg.line_final) {
      const time = new Date()
      setTranscript(prev => {
        const lineIdx = prev.length
        scheduleTranslate(lineIdx)
        return [...prev, { text: msg.line_final, time }]
      })
      msg.line_final.split(/\s+/).forEach(raw => {
        const w = raw.toLowerCase().replace(/[^\w]/g, '')
        if (w.length < 3) return
        const existing = wordIndex.current.get(w) ?? []
        if (existing.length < 5) wordIndex.current.set(w, [...existing, msg.line_final])
      })
    }
    if (lineNextDebounceRef.current) clearTimeout(lineNextDebounceRef.current)
    setCurrentLine(msg.line_next || '')
  }, [scheduleTranslate])

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
    const name = commentAuthor.trim() || 'Anonymous'
    saveCommentAuthor(name)
    const tempId = Date.now()
    setLineComments(prev => {
      const next = new Map(prev)
      const existing = next.get(lineIndex) ?? []
      next.set(lineIndex, [...existing, { id: tempId, author: name, body: body.trim(), created_at: Date.now(), pending: true }])
      return next
    })
    setCommentSubmitting(true)
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
          const idx = c.line_index ?? lineIndex
          const existing = next.get(idx) ?? []
          next.set(idx, existing.map(x => x.id === tempId ? { id: c.id, author: c.author, body: c.body, created_at: c.created_at } : x))
          return next
        })
      } else {
        setLineComments(prev => {
          const next = new Map(prev)
          const existing = next.get(lineIndex) ?? []
          next.set(lineIndex, existing.map(x => x.id === tempId ? { ...x, pending: false, failed: true } : x))
          return next
        })
      }
    } catch {
      setLineComments(prev => {
        const next = new Map(prev)
        const existing = next.get(lineIndex) ?? []
        next.set(lineIndex, existing.map(x => x.id === tempId ? { ...x, pending: false, failed: true } : x))
        return next
      })
    } finally {
      setCommentSubmitting(false)
    }
  }, [sessionId, commentAuthor])

  // Apply edit overrides + viewer translations to transcript
  const displayTranscript = transcript.map((l, i) => {
    const text = editOverrides.get(i) ?? translatedLines.get(i) ?? l.text
    return text !== l.text ? { ...l, text } : l
  })

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
    // Clear old translations so the new language renders immediately
    setTranslatedLines(new Map())
    if (joinedRef.current) {
      // Re-translate all accumulated lines in the new language
      translateQueueRef.current = transcriptRef.current.map((_, i) => i)
      if (translateTimerRef.current) clearTimeout(translateTimerRef.current)
      translateTimerRef.current = setTimeout(flushTranslateQueue, 200)
      // Reconnect WS with new target_lang
      ws.close()
      const t = setTimeout(() => ws.open(), 150)
      return () => clearTimeout(t)
    }
  }, [targetLang, flushTranslateQueue])   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ━━ TOP BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="header-glass" style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: 'var(--header-h)', gap: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div className="logo-mark" style={{ width: 24, height: 24 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>i</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>ISOL</span>
          {workspaceSlug && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
              / {workspaceSlug}
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', color: 'var(--accent)', borderRadius: 5, padding: '2px 7px', flexShrink: 0 }}>Viewer</span>
        <div style={{ flex: 1 }} />

        {/* Compact language picker — shown after joining */}
        {joined && (
          <select
            value={targetLang}
            onChange={e => setTargetLang(e.target.value)}
            style={{
              background: 'var(--surface-1)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 13,
              padding: '4px 26px 4px 9px', cursor: 'pointer', fontFamily: 'inherit',
              appearance: 'none', height: 30, flexShrink: 0,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 7px center',
            }}
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
            ))}
          </select>
        )}

        {/* Status + optional export */}
        {joined && (
          <>
            <div className="status-pill" style={{ flexShrink: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, transition: 'all 0.3s', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{statusText}</span>
            </div>
            {ws.viewerCount > 0 && (
              <div className="status-pill mobile-hidden" style={{ flexShrink: 0 }}>
                <span style={{ fontSize: 11 }}>👁</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {ws.viewerCount} {ws.viewerCount === 1 ? 'viewer' : 'viewers'}
                </span>
              </div>
            )}
            {transcript.length > 0 && (
              <button onClick={() => setShowModal(true)} className="btn-icon mobile-hidden" style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }}>
                Export
              </button>
            )}
          </>
        )}
      </header>

      {/* ━━ BODY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {!joined ? (
          /* ── Pre-join ──────────────────────────────────── */
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
              <div style={{ maxWidth: 480, width: '100%' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: 20, padding: '5px 14px', marginBottom: 28 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)', animation: 'livePulse 2s ease-in-out infinite' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--live)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Session in progress</span>
                </div>
                <h2 style={{ fontSize: 'clamp(24px, 6vw, 36px)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 14 }}>
                  You're entering<br /><span className="gradient-text">a live room</span>
                </h2>
                <p style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.65, marginBottom: 32 }}>
                  Choose your language and follow the live document as it happens.
                </p>
                <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: 24 }}>
                  <LanguageSelector value={targetLang} onChange={setTargetLang} disabled={false} />
                </div>
                <button onClick={handleJoin} className="btn-primary" style={{ fontSize: 15, height: 48 }}>
                  Join the room →
                </button>
              </div>
            </div>
          </main>

        ) : (
          /* ── Joined — DocumentView fills remaining height ── */
          <div style={{ flex: 1, overflow: 'hidden', minWidth: 0, position: 'relative' }}>
            {sessionEnded && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '12px 16px',
                background: '#FAFAF8',
                borderBottom: '1px solid var(--divider)',
                gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--text-muted)', flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                    Session has ended
                  </span>
                  {transcript.length > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      — {transcript.length} lines recorded
                    </span>
                  )}
                </div>
                {endedShareToken && (
                  <a
                    href={`/share/${endedShareToken}`}
                    style={{
                      fontSize: 12, fontWeight: 600,
                      color: 'var(--accent)', textDecoration: 'none',
                      background: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.18)',
                      borderRadius: 6, padding: '5px 12px',
                      whiteSpace: 'nowrap', flexShrink: 0,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.14)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}
                  >
                    View full transcript →
                  </a>
                )}
              </div>
            )}
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
        )}
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

import { useParams } from 'react-router-dom'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import type { SubtitleMessage } from '../hooks/useWebSocket'
import DocumentView, { type ViewMode } from '../components/DocumentView'
import TranscriptModal from '../components/TranscriptModal'
import GlossaryPanel from '../components/GlossaryPanel'
import LanguageSelector from '../components/LanguageSelector'

interface TranscriptLine { text: string; time: Date }
interface ViewerComment { id: number; author: string; body: string; created_at: number }

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export default function ViewerPage() {
  const { workspaceSlug, sessionId } = useParams<{ workspaceSlug: string; sessionId: string }>()

  const [targetLang, setTargetLang] = useState('en')
  const [currentLine, setCurrentLine] = useState('')
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [joined, setJoined] = useState(false)
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

  // Comments
  const [comments, setComments] = useState<ViewerComment[]>([])
  const [showComments, setShowComments] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
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

  // Auto-switch to AI only the first time format arrives — never override user's choice after that
  const hasAutoSwitchedRef = useRef(false)
  useEffect(() => {
    if (aiFormatted && !hasAutoSwitchedRef.current) {
      hasAutoSwitchedRef.current = true
      setViewMode('ai')
    }
  }, [aiFormatted])

  // AI format debounce
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
        .catch(e => console.error('AI format failed:', e.message))
        .finally(() => { setAiLoading(false); aiRunningRef.current = false })
    }, 2000)
  }, [transcript.length])

  // AI notes debounce
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
        .catch(e => console.error('AI notes failed:', e.message))
        .finally(() => { setAiNotesLoading(false); notesRunningRef.current = false })
    }, 3000)
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
    setCurrentLine(msg.line_next || '')
  }, [])

  const ws = useWebSocket({
    url: wssUrl,
    targetLang,
    onMessage: handleMessage,
    viewerSessionId: sessionId,
  })

  // Poll comments and edits when joined
  useEffect(() => {
    if (!joined || !sessionId) return

    const fetchComments = () => {
      fetch(`/api/viewer/${sessionId}/comments`)
        .then(r => r.ok ? r.json() : null)
        .then((data: { comments: ViewerComment[] } | null) => { if (data) setComments(data.comments) })
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

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentDraft.trim() || !sessionId) return
    setCommentSubmitting(true)
    const name = commentAuthor.trim() || 'Anonymous'
    saveCommentAuthor(name)
    try {
      const res = await fetch(`/api/viewer/${sessionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: name, body: commentDraft.trim() }),
      })
      if (res.ok) {
        const c = await res.json() as ViewerComment
        setComments(prev => [...prev, c])
        setCommentDraft('')
      }
    } finally {
      setCommentSubmitting(false)
    }
  }

  // Apply edit overrides to transcript before rendering
  const displayTranscript = editOverrides.size > 0
    ? transcript.map((l, i) => editOverrides.has(i) ? { ...l, text: editOverrides.get(i)! } : l)
    : transcript

  const isActive = ws.state === 'connected'
  const statusColor = ws.state === 'error' ? 'var(--red)'
    : ws.state === 'reconnecting' ? 'var(--orange)'
    : isActive ? 'var(--live)'
    : 'rgba(0,0,0,0.12)'

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

  const handleLangChange = useCallback((lang: string) => { setTargetLang(lang) }, [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ━━ TOP BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="header-glass" style={{ display: 'flex', alignItems: 'center', padding: '0 24px', height: 52, gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div className="logo-mark" style={{ width: 26, height: 26 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>i</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>ISOL Studio</span>
          {workspaceSlug && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/ {workspaceSlug}</span>
          )}
        </div>

        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)',
          color: 'var(--accent)', borderRadius: 6, padding: '3px 9px',
        }}>Viewer</span>

        <div style={{ flex: 1 }} />

        {joined && (
          <>
            <button
              onClick={() => setShowComments(v => !v)}
              style={{
                background: showComments ? 'rgba(99,102,241,0.10)' : 'none',
                border: `1px solid ${showComments ? 'rgba(99,102,241,0.25)' : 'var(--border)'}`,
                color: showComments ? 'var(--accent)' : 'var(--text-muted)',
                borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
            >
              💬 {comments.length > 0 ? comments.length : 'Notes'}
            </button>

            <div className="status-pill">
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: statusColor, transition: 'all 0.3s', flexShrink: 0,
              }} />
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {ws.state === 'connected' ? 'Live'
                  : ws.state === 'connecting' ? 'Connecting…'
                  : ws.state === 'reconnecting' ? 'Reconnecting…'
                  : 'Waiting…'}
              </span>
            </div>
          </>
        )}
      </header>

      {/* ━━ BODY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        <main style={{
          flex: 1, overflowY: 'auto',
          padding: joined ? '28px 32px' : '0',
          display: 'flex', flexDirection: 'column', minWidth: 0,
        }}>
          {!joined ? (

            /* ── Pre-join screen ──────────────────────────── */
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 28px' }}>
              <div style={{ maxWidth: 480, width: '100%' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)',
                  borderRadius: 20, padding: '5px 14px', marginBottom: 28,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)', animation: 'livePulse 2s ease-in-out infinite' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--live)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Session in progress</span>
                </div>

                <h2 style={{ fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 14 }}>
                  You're entering<br />
                  <span className="gradient-text">a live room</span>
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

            /* ── Joined ───────────────────────────────────── */
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 24, flexShrink: 0 }}>
                <div style={{ width: 200 }}>
                  <LanguageSelector value={targetLang} onChange={handleLangChange} disabled={false} />
                </div>
                {transcript.length > 0 && (
                  <button onClick={() => setShowModal(true)} className="btn-icon" style={{ fontSize: 13, marginLeft: 'auto' }}>
                    Export document →
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
                />
              </div>
            </>
          )}
        </main>

        {/* ━━ COMMENT PANEL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {joined && showComments && (
          <aside style={{
            width: 300, flexShrink: 0, borderLeft: '1px solid var(--divider)',
            display: 'flex', flexDirection: 'column', background: 'var(--bg)',
          }}>
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Room Notes {comments.length > 0 && `(${comments.length})`}
              </span>
              <button onClick={() => setShowComments(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
            </div>

            {/* Comment list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0' }}>
              {comments.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 24 }}>
                  No notes yet. Be the first.
                </p>
              ) : (
                comments.map(c => (
                  <div key={c.id} style={{ padding: '8px 10px', marginBottom: 6, background: 'var(--surface-1)', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 5, marginBottom: 3, alignItems: 'baseline' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>{c.author}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {timeAgo(c.created_at)}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>{c.body}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add note form */}
            <form onSubmit={handleSubmitComment} style={{ padding: 12, borderTop: '1px solid var(--divider)' }}>
              <input
                className="input-field"
                value={commentAuthor}
                onChange={e => saveCommentAuthor(e.target.value)}
                placeholder="Your name"
                style={{ fontSize: 12, padding: '5px 8px', marginBottom: 6, width: '100%' }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <textarea
                  className="input-field"
                  value={commentDraft}
                  onChange={e => setCommentDraft(e.target.value)}
                  placeholder="Add a note…"
                  rows={2}
                  style={{ fontSize: 13, resize: 'none', flex: 1, lineHeight: 1.45, padding: '7px 9px' }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      handleSubmitComment(e as unknown as React.FormEvent)
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={commentSubmitting || !commentDraft.trim()}
                  style={{
                    background: 'var(--accent)', color: '#fff', border: 'none',
                    borderRadius: 6, padding: '0 12px', fontSize: 14, fontWeight: 700,
                    cursor: commentSubmitting || !commentDraft.trim() ? 'not-allowed' : 'pointer',
                    opacity: commentSubmitting || !commentDraft.trim() ? 0.35 : 1,
                    flexShrink: 0, alignSelf: 'flex-end', height: 34,
                  }}
                >↑</button>
              </div>
            </form>
          </aside>
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

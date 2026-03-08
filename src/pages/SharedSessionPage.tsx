import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { LANGUAGES } from '../lib/languages'
import { getSession, getToken } from '../lib/auth'
import CommentThread, { type CommentItem } from '../components/CommentThread'

// Minimal markdown renderer for AI-formatted text (##, ###, **, >, -)
function AiMarkdown({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text)', marginTop: 32, marginBottom: 12 }}>{line.slice(3)}</h2>
        if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 22, marginBottom: 8 }}>{line.slice(4)}</h3>
        if (line.startsWith('# ')) return <h1 key={i} style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 20 }}>{line.slice(2)}</h1>
        if (line.startsWith('> ')) return <blockquote key={i} style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 14, margin: '0 0 16px', color: 'var(--text-dim)', fontStyle: 'italic', fontSize: 15 }}>{line.slice(2)}</blockquote>
        if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
          const done = line.startsWith('- [x] ')
          return <li key={i} style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 4, marginLeft: 20, listStyle: 'none', color: done ? 'var(--text-muted)' : 'var(--text)' }}><span style={{ marginRight: 8, opacity: 0.7 }}>{done ? '☑' : '☐'}</span>{renderBold(line.slice(6))}</li>
        }
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 4, marginLeft: 20, color: 'var(--text)' }}>{renderBold(line.slice(2))}</li>
        if (line.trim() === '') return <div key={i} style={{ height: 10 }} />
        return <p key={i} style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.78, margin: '0 0 16px' }}>{renderBold(line)}</p>
      })}
    </>
  )
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  )
}

interface SharedSession {
  id: number
  title: string | null
  started_at: number
  target_lang: string
  line_count: number
  ai_formatted_text: string | null
}

interface SharedLine {
  line_index: number
  text: string
}

interface Comment extends CommentItem {
  line_index: number | null
}

type Status = 'loading' | 'loaded' | 'not_found' | 'expired' | 'error'

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export default function SharedSessionPage() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<Status>('loading')
  const [session, setSession] = useState<SharedSession | null>(null)
  const [lines, setLines] = useState<SharedLine[]>([])
  const [activeTab, setActiveTab] = useState<'ai' | 'transcript'>('ai')

  // Comments state
  const [comments, setComments] = useState<Comment[]>([])
  const [openLine, setOpenLine] = useState<number | null>(null)
  const [hoveredLine, setHoveredLine] = useState<number | null>(null)
  const [authSession] = useState(() => getSession())
  const [authorName, setAuthorName] = useState(() =>
    getSession()?.email ?? localStorage.getItem('isol_commenter_name') ?? ''
  )
  const isAuthedCommenter = authSession !== null
  const [submitting, setSubmitting] = useState(false)
  // AI tab general comment form
  const [aiDraft, setAiDraft] = useState('')

  // Load session
  useEffect(() => {
    if (!token) { setStatus('not_found'); return }
    fetch(`/api/share/${token}`)
      .then(res => {
        if (res.status === 404) { setStatus('not_found'); return null }
        if (res.status === 410) { setStatus('expired'); return null }
        if (!res.ok) { setStatus('error'); return null }
        return res.json()
      })
      .then((data: { session: SharedSession; lines: SharedLine[] } | null) => {
        if (!data) return
        setSession(data.session)
        setLines(data.lines)
        setActiveTab(data.session.ai_formatted_text ? 'ai' : 'transcript')
        setStatus('loaded')
      })
      .catch(() => setStatus('error'))
  }, [token])

  // Load comments after session loads
  useEffect(() => {
    if (status !== 'loaded' || !token) return
    fetch(`/api/share/${token}/comments`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { comments: Comment[] } | null) => { if (data) setComments(data.comments) })
      .catch(() => {})
  }, [status, token])

  const saveAuthor = (name: string) => {
    setAuthorName(name)
    localStorage.setItem('isol_commenter_name', name)
  }

  const handleAddComment = async (lineIndex: number | null, body: string): Promise<void> => {
    if (!body.trim() || !token) return
    const name = authorName.trim() || 'Anonymous'
    saveAuthor(name)
    const tempId = Date.now()
    const optimistic: Comment = {
      id: tempId, author: name, body: body.trim(),
      created_at: Date.now(), line_index: lineIndex, pending: true,
    }
    setComments(prev => [...prev, optimistic])
    setSubmitting(true)
    try {
      const jwt = getToken()
      const res = await fetch(`/api/share/${token}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify({ line_index: lineIndex, author: name, body: body.trim() }),
      })
      if (res.ok) {
        const c = await res.json() as Comment
        setComments(prev => prev.map(x => x.id === tempId ? c : x))
      } else {
        setComments(prev => prev.map(x => x.id === tempId ? { ...x, pending: false, failed: true } : x))
      }
    } catch {
      setComments(prev => prev.map(x => x.id === tempId ? { ...x, pending: false, failed: true } : x))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetryComment = async (id: number) => {
    const c = comments.find(x => x.id === id)
    if (!c || !token) return
    setComments(prev => prev.map(x => x.id === id ? { ...x, failed: false, pending: true } : x))
    try {
      const jwt = getToken()
      const res = await fetch(`/api/share/${token}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify({ line_index: c.line_index, author: c.author, body: c.body }),
      })
      if (res.ok) {
        const newC = await res.json() as Comment
        setComments(prev => prev.map(x => x.id === id ? newC : x))
      } else {
        setComments(prev => prev.map(x => x.id === id ? { ...x, pending: false, failed: true } : x))
      }
    } catch {
      setComments(prev => prev.map(x => x.id === id ? { ...x, pending: false, failed: true } : x))
    }
  }

  const handleAiCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiDraft.trim()) return
    await handleAddComment(null, aiDraft.trim())
    setAiDraft('')
  }

  const lang = session ? LANGUAGES.find(l => l.code === session.target_lang) : null

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const activeTabStyle = {
    background: 'var(--accent)',
    color: '#fff',
    borderColor: 'var(--accent)',
  }

  const totalLineComments = comments.filter(c => c.line_index !== null).length
  const generalComments = comments.filter(c => c.line_index === null)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* Header */}
      <header className="header-glass" style={{
        height: 'var(--header-h)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 12,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="logo-mark" style={{ width: 24, height: 24 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>i</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>ISOL Studio</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: 'var(--accent)',
          background: 'rgba(99,102,241,0.10)',
          border: '1px solid rgba(99,102,241,0.20)',
          borderRadius: 6,
          padding: '3px 9px',
          letterSpacing: '0.03em',
        }}>
          Shared
        </span>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 740, padding: '40px 24px 80px' }}>

          {status === 'loading' && (
            <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--text-muted)', fontSize: 14 }}>
              Loading…
            </div>
          )}

          {status === 'expired' && (
            <div style={{ textAlign: 'center', paddingTop: 80 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                This link has expired
              </p>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
                The owner has set an expiry on this shared transcript.
              </p>
              <Link to="/" style={{ color: 'var(--accent)', fontSize: 14 }}>← Back to home</Link>
            </div>
          )}

          {(status === 'not_found' || status === 'error') && (
            <div style={{ textAlign: 'center', paddingTop: 80 }}>
              <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 20 }}>
                {status === 'not_found'
                  ? 'This session is no longer available.'
                  : 'Something went wrong. Please try again.'}
              </p>
              <Link to="/" style={{ color: 'var(--accent)', fontSize: 14 }}>← Back to home</Link>
            </div>
          )}

          {status === 'loaded' && session && (
            <>
              {/* Title */}
              <h1 style={{
                fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em',
                color: 'var(--text)', marginBottom: 8, lineHeight: 1.25,
              }}>
                {session.title ?? `Session — ${formatDate(session.started_at)}`}
              </h1>

              {/* Meta */}
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
                {lang ? `${lang.flag} ${lang.label}` : session.target_lang}
                {' · '}{session.line_count} lines
                {' · '}{formatDate(session.started_at)}
                {comments.length > 0 && (
                  <span style={{ color: 'var(--accent)', marginLeft: 6 }}>
                    · 💬 {comments.length}
                  </span>
                )}
              </p>

              <div style={{ borderTop: '1px solid var(--divider)', marginBottom: 28 }} />

              {/* Content */}
              {session.ai_formatted_text ? (
                <>
                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
                    <button
                      onClick={() => setActiveTab('ai')}
                      className="btn-icon"
                      style={{ fontSize: 12, padding: '5px 12px', height: 30, ...(activeTab === 'ai' ? activeTabStyle : {}) }}
                    >
                      ✦ AI Structured
                    </button>
                    <button
                      onClick={() => setActiveTab('transcript')}
                      className="btn-icon"
                      style={{ fontSize: 12, padding: '5px 12px', height: 30, ...(activeTab === 'transcript' ? activeTabStyle : {}) }}
                    >
                      Transcript
                      {totalLineComments > 0 && (
                        <span style={{
                          fontSize: 10, background: 'rgba(99,102,241,0.12)',
                          color: 'var(--accent)', borderRadius: 4, padding: '1px 5px', marginLeft: 2,
                        }}>
                          {totalLineComments}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* AI tab */}
                  {activeTab === 'ai' && (
                    <>
                      <AiMarkdown text={session.ai_formatted_text} />

                      {/* Discussion section — form first, then list */}
                      <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 28, marginTop: 40 }}>
                        <p style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
                          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16,
                        }}>
                          Discussion{comments.length > 0 ? ` · ${comments.length}` : ''}
                        </p>

                        {/* Add comment form — shown first for visibility */}
                        <form onSubmit={handleAiCommentSubmit} style={{ marginBottom: 24 }}>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                            <input
                              className="input-field"
                              value={authorName}
                              onChange={isAuthedCommenter ? undefined : e => saveAuthor(e.target.value)}
                              readOnly={isAuthedCommenter}
                              placeholder="Your name"
                              style={{
                                fontSize: 12, padding: '6px 10px', width: 130,
                                opacity: isAuthedCommenter ? 0.7 : 1,
                                cursor: isAuthedCommenter ? 'default' : undefined,
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <textarea
                              className="input-field"
                              value={aiDraft}
                              onChange={e => setAiDraft(e.target.value)}
                              placeholder="Leave a comment on this document…"
                              rows={2}
                              style={{ fontSize: 13, resize: 'none', flex: 1, lineHeight: 1.45, padding: '8px 10px' }}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                  e.preventDefault()
                                  handleAiCommentSubmit(e as unknown as React.FormEvent)
                                }
                              }}
                            />
                            <button
                              type="submit"
                              disabled={submitting || !aiDraft.trim()}
                              style={{
                                background: 'var(--accent)', color: '#fff', border: 'none',
                                borderRadius: 6, padding: '0 14px', fontSize: 14, fontWeight: 700,
                                cursor: submitting || !aiDraft.trim() ? 'not-allowed' : 'pointer',
                                opacity: submitting || !aiDraft.trim() ? 0.35 : 1,
                                flexShrink: 0, alignSelf: 'flex-end', height: 36,
                                transition: 'opacity 0.15s',
                              }}
                            >↑</button>
                          </div>
                        </form>

                        {/* Comments list */}
                        {comments.map(c => {
                          const lineText = c.line_index !== null
                            ? lines.find(l => l.line_index === c.line_index)?.text
                            : null
                          return (
                            <div key={c.id} style={{
                              padding: '10px 14px', marginBottom: 6,
                              background: 'var(--surface-1)', borderRadius: 8, border: '1px solid var(--border)',
                            }}>
                              {lineText && (
                                <p style={{
                                  fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic',
                                  marginBottom: 8, paddingLeft: 10,
                                  borderLeft: '2px solid var(--border-accent)', lineHeight: 1.5,
                                }}>
                                  {lineText.length > 100 ? `${lineText.slice(0, 100)}…` : lineText}
                                </p>
                              )}
                              <div style={{ display: 'flex', gap: 5, marginBottom: 4, alignItems: 'baseline' }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>{c.author}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {timeAgo(c.created_at)}</span>
                              </div>
                              <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>{c.body}</p>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {/* Transcript tab */}
                  {activeTab === 'transcript' && (
                    <TranscriptLines
                      lines={lines}
                      comments={comments}
                      openLine={openLine}
                      hoveredLine={hoveredLine}
                      setOpenLine={setOpenLine}
                      setHoveredLine={setHoveredLine}
                      authorName={authorName}
                      onAuthorChange={saveAuthor}
                      authorLocked={isAuthedCommenter}
                      onAdd={handleAddComment}
                      onRetry={handleRetryComment}
                      submitting={submitting}
                    />
                  )}
                </>
              ) : (
                /* No AI text — only transcript */
                <TranscriptLines
                  lines={lines}
                  comments={comments}
                  openLine={openLine}
                  hoveredLine={hoveredLine}
                  setOpenLine={setOpenLine}
                  setHoveredLine={setHoveredLine}
                  authorName={authorName}
                  onAuthorChange={saveAuthor}
                  onAdd={handleAddComment}
                  onRetry={handleRetryComment}
                  submitting={submitting}
                />
              )}

              <div style={{ borderTop: '1px solid var(--divider)', marginTop: 48, paddingTop: 24 }} />

              {/* Footer CTA */}
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                Transcript captured with ISOL Studio ·{' '}
                <Link to="/" style={{ color: 'var(--accent)' }}>Try it free →</Link>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Transcript lines sub-component ─────────────────────────────────────────

interface TranscriptLinesProps {
  lines: SharedLine[]
  comments: Comment[]
  openLine: number | null
  hoveredLine: number | null
  setOpenLine: (n: number | null) => void
  setHoveredLine: (n: number | null) => void
  authorName: string
  onAuthorChange: (n: string) => void
  authorLocked?: boolean
  onAdd: (lineIndex: number | null, body: string) => Promise<void>
  onRetry: (id: number) => void
  submitting: boolean
}

function TranscriptLines({
  lines, comments, openLine, hoveredLine,
  setOpenLine, setHoveredLine,
  authorName, onAuthorChange, authorLocked, onAdd, onRetry, submitting,
}: TranscriptLinesProps) {
  return (
    <div>
      {lines.map(l => {
        const lineComments = comments.filter(c => c.line_index === l.line_index)
        const isOpen = openLine === l.line_index
        const isHovered = hoveredLine === l.line_index

        return (
          <div
            key={l.line_index}
            onMouseEnter={() => setHoveredLine(l.line_index)}
            onMouseLeave={() => setHoveredLine(null)}
            style={{
              marginBottom: isOpen ? 12 : 4,
              borderLeft: isOpen ? '2px solid var(--accent)' : '2px solid transparent',
              paddingLeft: isOpen ? 14 : 2,
              borderRadius: 6,
              background: isOpen ? 'rgba(99,102,241,0.04)' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            {/* Line row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <p style={{
                flex: 1,
                fontSize: 15, color: 'var(--text)', lineHeight: 1.75,
                margin: 0, padding: '4px 0',
              }}>
                {l.text}
              </p>
              <button
                onClick={() => setOpenLine(isOpen ? null : l.line_index)}
                style={{
                  background: 'none', border: 'none',
                  color: lineComments.length > 0 ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: 11, cursor: 'pointer',
                  padding: '8px 4px', flexShrink: 0,
                  opacity: isOpen || lineComments.length > 0 ? 1 : 0.28,
                  transition: 'opacity 0.15s',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}
              >
                <span>💬</span>
                {lineComments.length > 0 && (
                  <span style={{ fontWeight: 600 }}>{lineComments.length}</span>
                )}
              </button>
            </div>

            {/* Inline comment thread */}
            {isOpen && (
              <div style={{ paddingBottom: 8 }}>
                <CommentThread
                  comments={lineComments}
                  authorName={authorName}
                  onAuthorChange={onAuthorChange}
                  authorLocked={authorLocked}
                  onAdd={body => onAdd(l.line_index, body)}
                  onRetry={onRetry}
                  submitting={submitting}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

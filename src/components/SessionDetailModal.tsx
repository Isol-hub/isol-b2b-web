import { useEffect, useState, useCallback } from 'react'
import { getToken } from '../lib/auth'
import { sentryFetch } from '../lib/sentryFetch'
import { LANGUAGES } from '../lib/languages'
import DocumentView from './DocumentView'
import HighlightsSection from './HighlightsSection'
import ConfirmModal from './ConfirmModal'
import type { CommentItem } from './CommentThread'
import type { HighlightItem, HighlightCategory } from './HighlightPopup'

type ViewMode = 'raw' | 'ai' | 'notes'
type Tab = 'doc' | 'highlights' | 'notes'
type ExpiryChoice = 'never' | '7d' | '30d'

interface SessionData {
  id: number
  title: string | null
  started_at: number
  ended_at: number
  target_lang: string
  ai_formatted_text: string | null
  ai_notes_text: string | null
  host_notes_text: string | null
  share_token: string | null
  share_expires_at: number | null
}

interface Line {
  line_index: number
  text: string
}

export interface SessionDetailCallbacks {
  onTitleChange?: (id: number, title: string | null) => void
  onDeleted?: (id: number) => void
  onShareChange?: (id: number, token: string | null, expiresAt: number | null) => void
}

interface Props extends SessionDetailCallbacks {
  sessionId: number | null
  onClose: () => void
}

function buildCommentMap(arr: (CommentItem & { line_index: number | null })[]): Map<number, CommentItem[]> {
  const m = new Map<number, CommentItem[]>()
  arr.forEach(c => {
    const idx = c.line_index ?? -1
    m.set(idx, [...(m.get(idx) ?? []), { id: c.id, author: c.author, body: c.body, created_at: c.created_at }])
  })
  return m
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtExpiry(ts: number | null | undefined): string {
  if (!ts) return 'No expiry'
  return `Expires ${new Date(ts * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
}

export default function SessionDetailModal({
  sessionId, onClose,
  onTitleChange, onDeleted, onShareChange,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<SessionData | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [highlights, setHighlights] = useState<HighlightItem[]>([])
  const [comments, setComments] = useState<Map<number, CommentItem[]>>(new Map())

  const [tab, setTab] = useState<Tab>('doc')
  const [viewMode, setViewMode] = useState<ViewMode>('raw')
  const [editingTitle, setEditingTitle] = useState('')
  const [titleSaved, setTitleSaved] = useState(false)
  const [hostNotes, setHostNotes] = useState('')

  const [expiryChoice, setExpiryChoice] = useState<ExpiryChoice>('never')
  const [shareCopied, setShareCopied] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    const token = getToken()
    if (!token) return
    setLoading(true)
    setSession(null)
    setLines([])
    setHighlights([])
    setComments(new Map())
    setTab('doc')
    setExpiryChoice('never')
    setShareCopied(false)
    sentryFetch(`/api/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((data: {
        session: SessionData
        lines: Line[]
        highlights: HighlightItem[]
        comments: (CommentItem & { line_index: number | null })[]
      } | null) => {
        if (!data) return
        setSession(data.session)
        setLines(data.lines)
        setHighlights(data.highlights ?? [])
        setComments(buildCommentMap(data.comments ?? []))
        setEditingTitle(data.session.title ?? '')
        setHostNotes(data.session.host_notes_text ?? '')
        setViewMode(data.session.ai_formatted_text ? 'ai' : 'raw')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const patchTitle = useCallback(async (title: string) => {
    if (!session) return
    const token = getToken()
    if (!token) return
    const trimmed = title.trim()
    try {
      await sentryFetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: trimmed || null }),
      })
      setSession(prev => prev ? { ...prev, title: trimmed || null } : prev)
      setTitleSaved(true)
      setTimeout(() => setTitleSaved(false), 1800)
      onTitleChange?.(session.id, trimmed || null)
    } catch { /* silent */ }
  }, [session, onTitleChange])

  const patchHostNotes = useCallback(async (text: string) => {
    if (!session) return
    const token = getToken()
    if (!token) return
    try {
      await sentryFetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ host_notes_text: text || null }),
      })
    } catch { /* silent */ }
  }, [session])

  const addHighlight = useCallback(async (text: string, lineIndex: number | null, category: HighlightCategory | null) => {
    if (!session) return
    const token = getToken()
    if (!token) return
    try {
      const res = await sentryFetch(`/api/sessions/${session.id}/highlights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text, line_index: lineIndex, category }),
      })
      if (res.ok) {
        const { id } = await res.json() as { id: number }
        setHighlights(prev => [...prev, { id, text, line_index: lineIndex, category }])
      }
    } catch { /* silent */ }
  }, [session])

  const removeHighlight = useCallback(async (id: number) => {
    if (!session) return
    const token = getToken()
    if (!token) return
    setHighlights(prev => prev.filter(h => h.id !== id))
    try {
      await sentryFetch(`/api/sessions/${session.id}/highlights?highlight_id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch { /* silent */ }
  }, [session])

  const handleGenerateOrCopyShare = useCallback(async () => {
    if (!session) return
    const token = getToken()
    if (!token) return
    if (session.share_token) {
      try { await navigator.clipboard.writeText(`${window.location.origin}/share/${session.share_token}`) } catch { /* silent */ }
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2400)
      return
    }
    setShareLoading(true)
    const expiresInHours = expiryChoice === '7d' ? 7 * 24 : expiryChoice === '30d' ? 30 * 24 : undefined
    try {
      const res = await sentryFetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: session.id, ...(expiresInHours !== undefined ? { expires_in_hours: expiresInHours } : {}) }),
      })
      if (res.ok) {
        const data = await res.json() as { token: string; share_expires_at: number | null }
        setSession(prev => prev ? { ...prev, share_token: data.token, share_expires_at: data.share_expires_at } : prev)
        try { await navigator.clipboard.writeText(`${window.location.origin}/share/${data.token}`) } catch { /* silent */ }
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2400)
        onShareChange?.(session.id, data.token, data.share_expires_at)
      }
    } catch { /* silent */ }
    finally { setShareLoading(false) }
  }, [session, expiryChoice, onShareChange])

  const handleRevoke = useCallback(async () => {
    if (!session?.share_token) return
    const token = getToken()
    if (!token) return
    try {
      const res = await sentryFetch(`/api/share/${session.share_token}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setSession(prev => prev ? { ...prev, share_token: null, share_expires_at: null } : prev)
        setConfirmRevoke(false)
        onShareChange?.(session.id, null, null)
      }
    } catch { /* silent */ }
  }, [session, onShareChange])

  const handleDelete = useCallback(async () => {
    if (!session) return
    const token = getToken()
    if (!token) return
    try {
      const res = await sentryFetch(`/api/sessions/${session.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        onDeleted?.(session.id)
        onClose()
      }
    } catch { /* silent */ }
  }, [session, onDeleted, onClose])

  if (!sessionId) return null

  const lang = session ? LANGUAGES.find(l => l.code === session.target_lang) : null

  return (
    <>
      <div
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
      >
        <div style={{
          width: '100%', maxWidth: 700,
          background: 'var(--canvas)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex', flexDirection: 'column',
          maxHeight: '85vh', overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '18px 24px',
            borderBottom: '1px solid var(--divider)',
            flexShrink: 0,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {loading || !session ? (
                <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{loading ? 'Loading…' : 'Not found'}</p>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <input
                      value={editingTitle}
                      onChange={e => setEditingTitle(e.target.value)}
                      onFocus={e => (e.target.style.borderBottomColor = 'var(--border-accent)')}
                      onBlur={e => { e.target.style.borderBottomColor = 'transparent'; patchTitle(editingTitle) }}
                      onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      placeholder="Add a title…"
                      style={{
                        fontSize: 15, fontWeight: 700,
                        background: 'none', border: 'none',
                        borderBottom: '1px solid transparent',
                        padding: '1px 0', color: 'var(--text)',
                        fontFamily: 'inherit', flex: 1, cursor: 'text',
                        transition: 'border-color 0.15s', outline: 'none',
                      }}
                    />
                    {titleSaved && (
                      <span style={{ fontSize: 11, color: 'var(--live)', fontWeight: 600, flexShrink: 0 }}>✓ Saved</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    {fmtDate(session.started_at)}
                    {' · '}{lines.length} lines
                    {lang && ` · ${lang.flag} ${lang.label}`}
                  </p>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, padding: '2px 8px', borderRadius: 4, flexShrink: 0, cursor: 'pointer' }}
            >×</button>
          </div>

          {/* Tab bar */}
          {session && !loading && (
            <div style={{
              display: 'flex', gap: 2,
              padding: '0 24px',
              borderBottom: '1px solid var(--divider)',
              flexShrink: 0,
            }}>
              {([
                { id: 'doc' as Tab, label: 'Transcript' },
                { id: 'highlights' as Tab, label: `Highlights${highlights.length > 0 ? ` (${highlights.length})` : ''}` },
                { id: 'notes' as Tab, label: 'Notes' },
              ]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '10px 14px', fontSize: 12, fontWeight: 600,
                    color: tab === t.id ? 'var(--text)' : 'var(--text-muted)',
                    borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                    marginBottom: -1, transition: 'color 0.15s',
                  }}
                >{t.label}</button>
              ))}
            </div>
          )}

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
            ) : !session ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>Session not found.</div>
            ) : tab === 'highlights' ? (
              <HighlightsSection highlights={highlights} />
            ) : tab === 'notes' ? (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Host Notes
                </p>
                <textarea
                  value={hostNotes}
                  onChange={e => setHostNotes(e.target.value)}
                  onBlur={() => patchHostNotes(hostNotes)}
                  placeholder="Add your notes about this session…"
                  rows={14}
                  style={{
                    width: '100%', resize: 'vertical',
                    background: 'var(--surface-1)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '12px 14px',
                    fontSize: 14, color: 'var(--text)', lineHeight: 1.65,
                    fontFamily: 'inherit', outline: 'none',
                    transition: 'border-color 0.15s', boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--border-accent)')}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Saved automatically when you click away.
                </p>
              </div>
            ) : (
              <DocumentView
                transcript={lines.map(l => ({ text: l.text, time: new Date(session.started_at) }))}
                currentLine=""
                isActive={false}
                targetLang={session.target_lang}
                hideBanner={true}
                aiFormatted={session.ai_formatted_text ?? undefined}
                aiFormattedAt={undefined}
                aiLoading={false}
                aiNotes={session.ai_notes_text ?? undefined}
                aiNotesLoading={false}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                isEditable={false}
                lineComments={comments}
                openCommentLine={null}
                onOpenCommentLine={() => {}}
                commentAuthor=""
                onCommentAuthorChange={() => {}}
                onAddComment={async () => {}}
                commentSubmitting={false}
                isHost={false}
                highlights={highlights}
                onAddHighlight={addHighlight}
                onRemoveHighlight={removeHighlight}
              />
            )}
          </div>

          {/* Footer: Share + Delete */}
          {session && (
            <div style={{
              borderTop: '1px solid var(--divider)',
              padding: '16px 24px',
              flexShrink: 0,
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              {/* Share */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Share
                </p>
                {session.share_token ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        className="input-field"
                        readOnly
                        value={`${window.location.origin}/share/${session.share_token}`}
                        onFocus={e => e.target.select()}
                        style={{ fontSize: 12, flex: 1 }}
                      />
                      <button
                        onClick={handleGenerateOrCopyShare}
                        style={{
                          background: shareCopied ? 'rgba(34,197,94,0.10)' : 'var(--accent)',
                          color: shareCopied ? 'var(--live)' : '#fff',
                          border: shareCopied ? '1px solid rgba(34,197,94,0.30)' : 'none',
                          borderRadius: 8, fontSize: 12, fontWeight: 600,
                          padding: '7px 14px', cursor: 'pointer', flexShrink: 0,
                          transition: 'all 0.2s',
                        }}
                      >{shareCopied ? '✓ Copied' : 'Copy'}</button>
                      <button
                        onClick={() => setConfirmRevoke(true)}
                        style={{
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)',
                          color: 'var(--red)', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          padding: '7px 14px', cursor: 'pointer', flexShrink: 0,
                        }}
                      >Revoke</button>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{fmtExpiry(session.share_expires_at)}</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['never', '7d', '30d'] as ExpiryChoice[]).map(c => (
                        <button
                          key={c}
                          onClick={() => setExpiryChoice(c)}
                          style={{
                            padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.15s',
                            background: expiryChoice === c ? 'var(--accent)' : 'var(--surface-2)',
                            color: expiryChoice === c ? '#fff' : 'var(--text-muted)',
                            border: expiryChoice === c ? '1px solid var(--accent)' : '1px solid var(--divider)',
                          }}
                        >
                          {c === 'never' ? 'No expiry' : c === '7d' ? '7 days' : '30 days'}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleGenerateOrCopyShare}
                      disabled={shareLoading}
                      style={{
                        background: 'var(--accent)', color: '#fff', border: 'none',
                        borderRadius: 8, fontSize: 12, fontWeight: 600,
                        padding: '7px 16px', cursor: shareLoading ? 'default' : 'pointer',
                        opacity: shareLoading ? 0.6 : 1, flexShrink: 0,
                      }}
                    >{shareLoading ? 'Generating…' : 'Generate & copy link'}</button>
                  </div>
                )}
              </div>

              {/* Delete */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--red)',
                    fontSize: 12, cursor: 'pointer', padding: '2px 0', fontFamily: 'inherit',
                  }}
                >
                  Delete session
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDelete}
        title="Delete session"
        message={`Delete "${session?.title ?? (session ? fmtDate(session.started_at) : '')}"? This cannot be undone.`}
        confirmLabel="Delete"
        dangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmModal
        isOpen={confirmRevoke}
        title="Revoke share link"
        message="Anyone with the current link will lose access. You can generate a new link later."
        confirmLabel="Revoke"
        dangerous
        onConfirm={handleRevoke}
        onCancel={() => setConfirmRevoke(false)}
      />
    </>
  )
}

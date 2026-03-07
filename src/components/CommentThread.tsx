import { useState } from 'react'

export interface CommentItem {
  id: number
  author: string
  body: string
  created_at: number
}

interface Props {
  comments: CommentItem[]
  authorName: string
  onAuthorChange: (n: string) => void
  onAdd: (body: string) => Promise<void>
  submitting: boolean
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

const TRUNCATE_LEN = 120

function NoteBody({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = body.length > TRUNCATE_LEN
  const shown = long && !expanded ? body.slice(0, TRUNCATE_LEN) + '…' : body
  return (
    <div>
      <span style={{ fontFamily: 'var(--font-note)', fontSize: 16, color: 'var(--text-dim)', lineHeight: 1.45 }}>
        {shown}
      </span>
      {long && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: 'var(--text-muted)', marginLeft: 4, padding: 0,
            fontFamily: 'var(--font-ui)',
          }}
        >
          {expanded ? 'Mostra meno ↑' : 'Mostra di più ↓'}
        </button>
      )}
    </div>
  )
}

export default function CommentThread({ comments, authorName, onAuthorChange, onAdd, submitting }: Props) {
  const [draft, setDraft] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    await onAdd(draft.trim())
    setDraft('')
    setFormOpen(false)
  }

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Note list */}
      {comments.map(c => (
        <div key={c.id} className="note-card">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-ui)' }}>
            {c.author} · {timeAgo(c.created_at)}
          </div>
          <NoteBody body={c.body} />
        </div>
      ))}

      {/* Add note form */}
      {!formOpen ? (
        <button
          onClick={() => setFormOpen(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: 'var(--text-muted)', padding: '4px 0',
            fontFamily: 'var(--font-ui)', display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          + Nota
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginTop: comments.length > 0 ? 8 : 0 }}>
          <input
            className="input-field"
            value={authorName}
            onChange={e => onAuthorChange(e.target.value)}
            placeholder="Il tuo nome"
            style={{ fontSize: 12, padding: '5px 10px', marginBottom: 6, fontFamily: 'var(--font-ui)' }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <textarea
              className="input-field"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Scrivi una nota…"
              rows={2}
              autoFocus
              style={{ fontFamily: 'var(--font-note)', fontSize: 15, resize: 'none', flex: 1, lineHeight: 1.45, padding: '8px 10px' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSubmit(e as unknown as React.FormEvent)
                }
                if (e.key === 'Escape') setFormOpen(false)
              }}
            />
            <button
              type="submit"
              disabled={submitting || !draft.trim()}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '0 14px',
                fontSize: 16,
                fontWeight: 700,
                cursor: submitting || !draft.trim() ? 'not-allowed' : 'pointer',
                opacity: submitting || !draft.trim() ? 0.35 : 1,
                flexShrink: 0,
                alignSelf: 'flex-end',
                height: 36,
                transition: 'opacity 0.15s',
              }}
            >
              ↵
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

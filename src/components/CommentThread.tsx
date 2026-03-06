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

export default function CommentThread({ comments, authorName, onAuthorChange, onAdd, submitting }: Props) {
  const [draft, setDraft] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    await onAdd(draft.trim())
    setDraft('')
  }

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Comment list */}
      {comments.map(c => (
        <div key={c.id} style={{
          padding: '8px 12px',
          marginBottom: 4,
          background: 'var(--surface-1)',
          borderRadius: 6,
        }}>
          <div style={{ display: 'flex', gap: 5, marginBottom: 3, alignItems: 'baseline' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>{c.author}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {timeAgo(c.created_at)}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>{c.body}</p>
        </div>
      ))}

      {/* Add comment form */}
      <form onSubmit={handleSubmit} style={{ marginTop: comments.length > 0 ? 8 : 0 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input
            className="input-field"
            value={authorName}
            onChange={e => onAuthorChange(e.target.value)}
            placeholder="Your name"
            style={{ fontSize: 12, padding: '6px 10px', width: 130, flexShrink: 0 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <textarea
            className="input-field"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            style={{ fontSize: 13, resize: 'none', flex: 1, lineHeight: 1.45, padding: '8px 10px' }}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent)
              }
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
              fontSize: 14,
              fontWeight: 700,
              cursor: submitting || !draft.trim() ? 'not-allowed' : 'pointer',
              opacity: submitting || !draft.trim() ? 0.35 : 1,
              flexShrink: 0,
              alignSelf: 'flex-end',
              height: 36,
              transition: 'opacity 0.15s',
            }}
          >
            ↑
          </button>
        </div>
      </form>
    </div>
  )
}

import { useState, useMemo, useRef } from 'react'

export interface GlossaryItem {
  id: number
  term: string
  note: string | null
  added_at: number
}

interface Props {
  items: GlossaryItem[]
  onDelete: (term: string) => void
  onClose: () => void
  onWordClick?: (term: string) => void
  onAdd?: (term: string) => void
}

export default function GlossaryListPanel({ items, onDelete, onClose, onWordClick, onAdd }: Props) {
  const [search, setSearch] = useState('')
  const [addingTerm, setAddingTerm] = useState(false)
  const [newTerm, setNewTerm] = useState('')
  const [copied, setCopied] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(i =>
      i.term.includes(q) || (i.note?.toLowerCase().includes(q) ?? false)
    )
  }, [items, search])

  const handleAdd = () => {
    const t = newTerm.trim().toLowerCase()
    if (t) onAdd?.(t)
    setNewTerm('')
    setAddingTerm(false)
  }

  const handleExport = () => {
    const text = items
      .map(i => i.note ? `${i.term}: ${i.note}` : i.term)
      .join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  const openAdd = () => {
    setAddingTerm(true)
    setTimeout(() => addInputRef.current?.focus(), 50)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      animation: 'glossarySlideIn 0.2s ease-out',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid var(--divider)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
          }}>Workspace</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Glossary</span>
          {items.length > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.18)',
              color: 'var(--accent)',
              borderRadius: 5, padding: '2px 7px',
            }}>{items.length}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {items.length > 0 && (
            <button
              onClick={handleExport}
              title="Copy all terms to clipboard"
              style={{
                background: 'none', border: 'none',
                fontSize: 12, fontWeight: 500,
                color: copied ? 'var(--live)' : 'var(--text-muted)',
                cursor: 'pointer', padding: '4px 8px', borderRadius: 4,
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => { if (!copied) (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
              onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
            >{copied ? '✓ Copied' : '⎘ Export'}</button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none', color: 'var(--text-muted)',
              fontSize: 18, padding: '2px 6px', borderRadius: 4,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
          >×</button>
        </div>
      </div>

      {/* Search + Add bar */}
      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid var(--divider)',
        display: 'flex', gap: 8, flexShrink: 0,
      }}>
        <input
          type="text"
          placeholder="Search terms…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            background: 'var(--surface-2)',
            border: '1px solid var(--divider)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 13,
            color: 'var(--text)',
            outline: 'none',
          }}
        />
        {onAdd && (
          <button
            onClick={openAdd}
            title="Add term manually"
            style={{
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.18)',
              color: 'var(--accent)',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >+ Add</button>
        )}
      </div>

      {/* Inline add term */}
      {addingTerm && (
        <div style={{
          padding: '8px 20px',
          borderBottom: '1px solid var(--divider)',
          display: 'flex', gap: 6, flexShrink: 0,
          background: 'rgba(99,102,241,0.03)',
        }}>
          <input
            ref={addInputRef}
            type="text"
            placeholder="New term…"
            value={newTerm}
            onChange={e => setNewTerm(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setAddingTerm(false); setNewTerm('') }
            }}
            style={{
              flex: 1,
              background: 'var(--surface-2)',
              border: '1px solid var(--accent)',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 13,
              color: 'var(--text)',
              outline: 'none',
            }}
          />
          <button
            onClick={handleAdd}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >Add</button>
          <button
            onClick={() => { setAddingTerm(false); setNewTerm('') }}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: 16,
              padding: '2px 6px', cursor: 'pointer',
            }}
          >×</button>
        </div>
      )}

      {/* List */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '8px 20px 16px',
        display: 'flex', flexDirection: 'column',
      }}>
        {items.length === 0 ? (
          <div style={{ paddingTop: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65 }}>
              No saved terms yet.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.65, marginTop: 6, opacity: 0.7 }}>
              Click any word in the document to look it up, then press "+ Save".
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', paddingTop: 16 }}>
            No terms match "{search}".
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((item, i) => (
              <div
                key={item.term}
                style={{
                  padding: '10px 0',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--divider)' : 'none',
                }}
              >
                {/* Term row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <button
                    onClick={() => onWordClick?.(item.term)}
                    style={{
                      background: 'none', border: 'none',
                      fontSize: 14, fontWeight: 600, color: 'var(--text)',
                      cursor: onWordClick ? 'pointer' : 'default',
                      padding: 0, textAlign: 'left',
                      transition: 'color 0.15s',
                      lineHeight: 1.3,
                    }}
                    onMouseEnter={e => { if (onWordClick) (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text)'}
                  >
                    {item.term}
                  </button>
                  <button
                    onClick={() => onDelete(item.term)}
                    style={{
                      background: 'none', border: 'none',
                      color: 'var(--text-muted)', fontSize: 16,
                      padding: '0 4px', borderRadius: 4,
                      cursor: 'pointer', transition: 'color 0.15s',
                      flexShrink: 0, lineHeight: 1, marginTop: 1,
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--red)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
                    title={`Remove "${item.term}" from glossary`}
                  >×</button>
                </div>
                {/* Cached definition */}
                {item.note && (
                  <p style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    lineHeight: 1.55,
                    margin: '4px 0 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {item.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

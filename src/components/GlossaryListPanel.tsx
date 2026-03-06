interface Props {
  terms: string[]
  onDelete: (term: string) => void
  onClose: () => void
  onWordClick?: (term: string) => void
}

export default function GlossaryListPanel({ terms, onDelete, onClose, onWordClick }: Props) {
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
          {terms.length > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.18)',
              color: 'var(--accent)',
              borderRadius: 5, padding: '2px 7px',
            }}>{terms.length}</span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', color: 'var(--text-muted)',
            fontSize: 18, padding: '2px 6px', borderRadius: 4,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--text)'}
          onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--text-muted)'}
        >×</button>
      </div>

      {/* List */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex', flexDirection: 'column',
      }}>
        {terms.length === 0 ? (
          <div style={{ paddingTop: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65 }}>
              No saved terms yet.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.65, marginTop: 6, opacity: 0.7 }}>
              Click any word in the document to look it up, then press "+ Save".
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {terms.map((term, i) => (
              <div
                key={term}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: i < terms.length - 1 ? '1px solid var(--divider)' : 'none',
                }}
              >
                <button
                  onClick={() => onWordClick?.(term)}
                  style={{
                    background: 'none', border: 'none',
                    fontSize: 14, fontWeight: 500, color: 'var(--text)',
                    cursor: onWordClick ? 'pointer' : 'default',
                    padding: 0, textAlign: 'left',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { if (onWordClick) (e.target as HTMLElement).style.color = 'var(--accent)' }}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--text)'}
                >
                  {term}
                </button>
                <button
                  onClick={() => onDelete(term)}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-muted)', fontSize: 16,
                    padding: '2px 6px', borderRadius: 4,
                    cursor: 'pointer', transition: 'color 0.15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--red)'}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--text-muted)'}
                  title={`Remove "${term}" from glossary`}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

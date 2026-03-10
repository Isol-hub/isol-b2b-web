import { CATEGORY_META, CATEGORY_ORDER } from './HighlightPopup'
import type { HighlightCategory, HighlightItem } from './HighlightPopup'

interface Props {
  highlights: HighlightItem[]
  onRemove?: (id: number) => void
  onJumpTo?: (lineIndex: number) => void
}

export default function HighlightsSection({ highlights, onRemove, onJumpTo }: Props) {
  // Group by category. Uncategorized (null) goes to '_'
  const groups = new Map<HighlightCategory | '_', HighlightItem[]>()
  for (const h of highlights) {
    const key = h.category ?? '_'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(h)
  }

  // Render in canonical order, skipping empty groups
  const orderedKeys = CATEGORY_ORDER.filter(k => groups.has(k))

  return (
    <div style={{
      padding: '18px 18px 16px',
      borderRadius: 16,
      border: '1px solid var(--border)',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,248,235,0.72))',
      boxShadow: '0 12px 30px rgba(15,23,42,0.05)',
    }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <span style={{
          fontSize: 11, color: 'var(--text-muted)', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          Highlights ({highlights.length})
        </span>
      </div>

      {highlights.length === 0 && (
        <div style={{
          padding: '14px 14px 12px',
          borderRadius: 12,
          border: '1px dashed rgba(217,119,6,0.22)',
          background: 'rgba(255,255,255,0.62)',
        }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.55 }}>
            Save the important moments here as the session unfolds.
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Quotes, decisions, action items and open questions will stay visible in this panel.
          </p>
        </div>
      )}

      {orderedKeys.map(key => {
        const meta = CATEGORY_META[key]
        const items = groups.get(key)!
        return (
          <div key={key} style={{ marginBottom: 24 }}>
            {/* Category heading */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: meta.color, lineHeight: 1 }}>{meta.icon}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: meta.color,
              }}>
                {meta.label}{items.length > 1 ? `s (${items.length})` : ''}
              </span>
            </div>

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(h => (
                <div
                  key={h.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: meta.bg,
                    borderLeft: `3px solid ${meta.color}`,
                  }}
                >
                  <p
                    style={{
                      flex: 1,
                      margin: 0,
                      fontSize: 14,
                      color: 'var(--text)',
                      lineHeight: 1.6,
                      fontStyle: key === 'quote' ? 'italic' : 'normal',
                      cursor: h.line_index !== null && onJumpTo ? 'pointer' : 'default',
                    }}
                    onClick={() => { if (h.line_index !== null) onJumpTo?.(h.line_index) }}
                    title={h.line_index !== null ? 'Jump to line' : undefined}
                  >
                    {key === 'quote' && <span style={{ color: meta.color, marginRight: 2, opacity: 0.7 }}>❝ </span>}
                    {h.text}
                    {h.line_index !== null && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>
                        line {h.line_index + 1}
                      </span>
                    )}
                  </p>
                  {onRemove && (
                    <button
                      onClick={() => onRemove(h.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: 14, lineHeight: 1,
                        padding: '0 2px', opacity: 0.5, flexShrink: 0,
                        transition: 'opacity 0.12s',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.5'}
                      title="Remove highlight"
                    >×</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

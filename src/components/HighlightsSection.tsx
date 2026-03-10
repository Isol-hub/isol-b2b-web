import { CATEGORY_META, CATEGORY_ORDER } from './HighlightPopup'
import type { HighlightCategory, HighlightItem } from './HighlightPopup'

interface Props {
  highlights: HighlightItem[]
  onRemove?: (id: number) => void
  onJumpTo?: (lineIndex: number) => void
}

export default function HighlightsSection({ highlights, onRemove, onJumpTo }: Props) {
  const groups = new Map<HighlightCategory | '_', HighlightItem[]>()
  for (const h of highlights) {
    const key = h.category ?? '_'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(h)
  }

  const orderedKeys = CATEGORY_ORDER.filter(k => groups.has(k))

  return (
    <div>
      {/* Section label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
          textTransform: 'uppercase', color: 'var(--text-muted)',
        }}>
          Highlights
        </span>
        {highlights.length > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
            background: 'var(--surface-2)', borderRadius: 99,
            padding: '1px 7px', lineHeight: '18px',
          }}>
            {highlights.length}
          </span>
        )}
      </div>

      {highlights.length === 0 && (
        <p style={{
          fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6,
          fontStyle: 'italic', margin: 0,
        }}>
          Select any text to save a highlight.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {orderedKeys.map(key => {
          const meta = CATEGORY_META[key]
          const items = groups.get(key)!
          return (
            <div key={key}>
              {/* Category pill */}
              <div style={{ marginBottom: 8 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: meta.bg,
                  border: `1px solid ${meta.color}22`,
                  borderRadius: 99,
                  padding: '3px 10px 3px 8px',
                }}>
                  <span style={{ fontSize: 12, lineHeight: 1, color: meta.color }}>{meta.icon}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                    textTransform: 'uppercase', color: meta.color,
                  }}>
                    {meta.label}{items.length > 1 ? ` · ${items.length}` : ''}
                  </span>
                </span>
              </div>

              {/* Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map(h => (
                  <div
                    key={h.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '9px 12px',
                      borderRadius: 'var(--radius)',
                      background: meta.bg.replace('0.10)', '0.06)'),
                      borderLeft: `2px solid ${meta.color}`,
                      cursor: h.line_index !== null && onJumpTo ? 'pointer' : 'default',
                    }}
                    onClick={() => { if (h.line_index !== null) onJumpTo?.(h.line_index) }}
                  >
                    <p style={{
                      flex: 1, margin: 0,
                      fontSize: 13, color: 'var(--text)', lineHeight: 1.6,
                      fontStyle: key === 'quote' ? 'italic' : 'normal',
                    }}>
                      {h.text}
                      {h.line_index !== null && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>
                          ↑ {h.line_index + 1}
                        </span>
                      )}
                    </p>
                    {onRemove && (
                      <button
                        onClick={e => { e.stopPropagation(); onRemove(h.id) }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-muted)', fontSize: 13, lineHeight: 1,
                          padding: '1px 2px', opacity: 0.4, flexShrink: 0,
                          transition: 'opacity 0.12s',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.4'}
                        title="Remove"
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

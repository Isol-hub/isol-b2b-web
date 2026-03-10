import { useEffect, useRef, useState } from 'react'

export type HighlightCategory = 'quote' | 'idea' | 'action' | 'event' | 'link'

export const CATEGORY_META: Record<HighlightCategory | '_', { label: string; icon: string; color: string; bg: string }> = {
  quote:  { label: 'Quote',  icon: '❝', color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
  idea:   { label: 'Idea',   icon: '✦', color: '#D97706', bg: 'rgba(217,119,6,0.10)'  },
  action: { label: 'Action', icon: '→', color: '#16A34A', bg: 'rgba(22,163,74,0.10)'  },
  event:  { label: 'Event',  icon: '◎', color: '#EA580C', bg: 'rgba(234,88,12,0.10)'  },
  link:   { label: 'Link',   icon: '↗', color: '#2563EB', bg: 'rgba(37,99,235,0.10)'  },
  _:      { label: 'Mark',   icon: '◆', color: 'var(--text-dim)', bg: 'rgba(0,0,0,0.05)' },
}

export const CATEGORY_ORDER: Array<HighlightCategory | '_'> = ['quote', 'idea', 'action', 'event', 'link', '_']

export interface HighlightItem {
  id: number
  line_index: number | null
  text: string
  category: HighlightCategory | null
}

interface PopupState {
  text: string
  lineIndex: number | null
  x: number   // viewport x (center of selection)
  y: number   // viewport y (top or bottom of selection)
  above: boolean
}

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>
  onHighlight: (text: string, lineIndex: number | null, category: HighlightCategory | null) => void
}

export default function HighlightPopup({ containerRef, onHighlight }: Props) {
  const [popup, setPopup] = useState<PopupState | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMouseUp = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount) { setPopup(null); return }

      const text = sel.toString().trim()
      if (text.length < 2) { setPopup(null); return }

      const range = sel.getRangeAt(0)
      const container = containerRef.current
      if (!container || !container.contains(range.startContainer)) { setPopup(null); return }

      // Bail out if selection is inside a form element (textarea/input)
      let check: Node | null = range.startContainer
      while (check && check !== container) {
        if (check instanceof HTMLElement &&
          (check.tagName === 'TEXTAREA' || check.tagName === 'INPUT')) {
          setPopup(null); return
        }
        check = check.parentNode
      }

      // Walk up to find data-line-index
      let node: Node | null = range.startContainer
      let lineIndex: number | null = null
      while (node && node !== container) {
        if (node instanceof HTMLElement && node.dataset.lineIndex !== undefined) {
          lineIndex = parseInt(node.dataset.lineIndex)
          break
        }
        node = node.parentNode
      }

      const rect = range.getBoundingClientRect()
      const above = rect.top > 72  // show above unless too close to viewport top

      setPopup({
        text,
        lineIndex,
        x: rect.left + rect.width / 2,
        y: above ? rect.top - 6 : rect.bottom + 6,
        above,
      })
    }

    const onMouseDown = (e: MouseEvent) => {
      if (popupRef.current?.contains(e.target as Node)) return
      setPopup(null)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPopup(null); window.getSelection()?.removeAllRanges() }
    }

    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [containerRef])

  if (!popup) return null

  const handleSelect = (cat: HighlightCategory | '_') => {
    onHighlight(popup.text, popup.lineIndex, cat === '_' ? null : cat)
    window.getSelection()?.removeAllRanges()
    setPopup(null)
  }

  return (
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        left: popup.x,
        top: popup.y,
        transform: popup.above
          ? 'translateX(-50%) translateY(-100%)'
          : 'translateX(-50%)',
        zIndex: 9000,
        background: 'var(--canvas)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        display: 'flex',
        alignItems: 'center',
        padding: 4,
        gap: 2,
      }}
    >
      {CATEGORY_ORDER.map(cat => {
        const m = CATEGORY_META[cat]
        return (
          <button
            key={cat}
            // Use onMouseDown instead of onClick: fires before the browser's
            // mouseup clears the text selection, so popup.text is still valid.
            // e.preventDefault() prevents focus-steal that would collapse selection.
            onMouseDown={e => { e.preventDefault(); handleSelect(cat) }}
            title={m.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 9px',
              borderRadius: 5,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              color: m.color,
              transition: 'background 0.1s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = m.bg}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>{m.icon}</span>
            {m.label}
          </button>
        )
      })}
    </div>
  )
}

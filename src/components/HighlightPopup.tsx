import { useEffect, useRef, useState } from 'react'

export type HighlightCategory = 'quote' | 'idea' | 'action' | 'event' | 'link'

export const CATEGORY_META: Record<HighlightCategory | '_', { label: string; color: string; bg: string; border: string }> = {
  quote:  { label: 'Purple', color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.30)' },
  idea:   { label: 'Yellow', color: '#F59E0B', bg: 'rgba(245,158,11,0.11)', border: 'rgba(245,158,11,0.38)' },
  action: { label: 'Green',  color: '#16A34A', bg: 'rgba(22,163,74,0.10)',  border: 'rgba(22,163,74,0.30)'  },
  event:  { label: 'Red',    color: '#EF4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.30)'  },
  link:   { label: 'Blue',   color: '#3B82F6', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.30)' },
  _:      { label: 'Mark',   color: '#94A3B8', bg: 'rgba(148,163,184,0.09)',border: 'rgba(148,163,184,0.22)' },
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
  x: number
  y: number
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
      let check: Node | null = range.startContainer
      while (check && check !== container) {
        if (check instanceof HTMLElement &&
          (check.tagName === 'TEXTAREA' || check.tagName === 'INPUT')) {
          setPopup(null); return
        }
        check = check.parentNode
      }
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
      const above = rect.top > 72
      setPopup({ text, lineIndex, x: rect.left + rect.width / 2, y: above ? rect.top - 6 : rect.bottom + 6, above })
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
        transform: popup.above ? 'translateX(-50%) translateY(-100%)' : 'translateX(-50%)',
        zIndex: 9000,
        background: 'var(--canvas)',
        border: '1px solid var(--border)',
        borderRadius: 99,
        boxShadow: '0 4px 24px rgba(0,0,0,0.16)',
        display: 'flex',
        alignItems: 'center',
        padding: '6px 10px',
        gap: 8,
      }}
    >
      {CATEGORY_ORDER.filter(c => c !== '_').map(cat => {
        const m = CATEGORY_META[cat]
        return (
          <button
            key={cat}
            onMouseDown={e => { e.preventDefault(); handleSelect(cat) }}
            title={m.label}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: m.color,
              border: '2px solid transparent',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'transform 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.3)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
          />
        )
      })}
    </div>
  )
}

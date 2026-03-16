import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { type CommentItem } from './CommentThread'
import LiveBanner from './LiveBanner'
import SessionTimeline, { type TimelineSegment } from './SessionTimeline'
import HighlightPopup, { type HighlightCategory, type HighlightItem, CATEGORY_META } from './HighlightPopup'

interface TranscriptLine {
  text: string
  time: Date
}

export type ViewMode = 'raw' | 'ai' | 'notes'

interface Props {
  transcript: TranscriptLine[]
  currentLine: string
  isActive: boolean
  targetLang: string
  hideBanner?: boolean
  aiFormatted?: string
  aiFormattedAt?: number
  aiLoading?: boolean
  aiNotes?: string
  aiNotesLoading?: boolean
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onWordClick?: (word: string, sentence: string) => void
  isEditable?: boolean
  onLineEdit?: (index: number, text: string) => void
  // Inline line comments (shown in transcript/raw view)
  lineComments?: Map<number, CommentItem[]>
  openCommentLine?: number | null
  onOpenCommentLine?: (idx: number | null) => void
  commentAuthor?: string
  onCommentAuthorChange?: (name: string) => void
  onAddComment?: (lineIndex: number, body: string) => Promise<void>
  commentSubmitting?: boolean
  // Timeline
  sessionStartMs?: number  // unix ms; if provided, timeline is shown
  sessionEndMs?: number    // unix ms; undefined = live
  // Highlights
  highlights?: HighlightItem[]
  onAddHighlight?: (text: string, lineIndex: number | null, category: HighlightCategory | null) => void
  onRemoveHighlight?: (id: number) => void
  // Host-only powers
  isHost?: boolean
  onDeleteComment?: (commentId: number, lineIndex: number) => Promise<void>
  onEditComment?: (commentId: number, lineIndex: number, newBody: string) => Promise<void>
  // Override banner lines (viewer mode: supply pre-translated lines instead of using transcript)
  bannerOverride?: { current: string; previous: string }
}

type MarginEntry =
  | { kind: 'comment'; lineIndex: number; comment: CommentItem; _key: string }
  | { kind: 'highlight'; lineIndex: number; highlight: HighlightItem; _key: string }

function renderInline(
  text: string,
  sentence: string,
  onWordClick?: (w: string, s: string) => void,
): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (!onWordClick) return <span key={i}>{part}</span>
    return (
      <span key={i}>
        {part.split(' ').map((word, j) => (
          <span key={j}>
            {j > 0 && ' '}
            <span
              onClick={() => onWordClick(word.replace(/[^\w]/g, ''), sentence)}
              style={{ cursor: 'help', padding: '0 1px', textUnderlineOffset: 3 }}
              onMouseEnter={e => {
                const el = e.target as HTMLElement
                el.style.textDecoration = 'underline dotted'
                el.style.textDecorationColor = 'rgba(99,102,241,0.45)'
              }}
              onMouseLeave={e => {
                const el = e.target as HTMLElement
                el.style.textDecoration = 'none'
              }}
            >{word}</span>
          </span>
        ))}
      </span>
    )
  })
}


function MarginPanel({
  entries, onJumpTo, totalLines,
}: {
  entries: MarginEntry[]
  onJumpTo?: (lineIndex: number) => void
  totalLines: number
}) {
  const sorted = [...entries].sort((a, b) => a.lineIndex - b.lineIndex)
  return (
    <div style={{ position: 'relative', height: '100%', minHeight: 60 }}>
      {sorted.map((entry, i) => {
        const topPct = totalLines > 1 ? (entry.lineIndex / (totalLines - 1)) * 100 : 0
        return (
          <div
            key={entry._key}
            style={{ position: 'absolute', top: `${topPct}%`, left: 0, right: 0, transform: 'translateY(-50%)' }}
          >
            {entry.kind === 'comment' ? (
              <button
                onClick={() => onJumpTo?.(entry.lineIndex)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 5,
                  background: 'transparent', border: 'none', padding: 0,
                  cursor: onJumpTo ? 'pointer' : 'default', textAlign: 'left',
                }}
              >
                <svg width="26" height="16" viewBox="0 0 26 16" fill="none" style={{ flexShrink: 0, marginTop: 3, opacity: 0.85 }}>
                  <path d="M24 8 C17 8 10 3 2 8" stroke="#B91C1C" strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M2 8 L6 4 M2 8 L6 12" stroke="#B91C1C" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <span style={{
                  fontFamily: 'var(--font-note)',
                  fontSize: 15,
                  color: '#B91C1C',
                  fontStyle: 'italic',
                  lineHeight: 1.35,
                  display: 'inline-block',
                  transform: `rotate(${-0.6 - (i % 3) * 0.4}deg)`,
                }}>
                  {entry.comment.body}
                </span>
              </button>
            ) : (
              (() => {
                const meta = CATEGORY_META[entry.highlight.category ?? '_']
                const preview = entry.highlight.text.length > 32
                  ? entry.highlight.text.slice(0, 32) + '…'
                  : entry.highlight.text
                return (
                  <button
                    onClick={() => onJumpTo?.(entry.lineIndex)}
                    style={{
                      display: 'block', maxWidth: '100%',
                      background: meta.bg,
                      border: `1px solid ${meta.border}`,
                      borderLeft: `3px solid ${meta.color}`,
                      borderRadius: 5,
                      padding: '3px 7px',
                      cursor: onJumpTo ? 'pointer' : 'default',
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{
                      fontSize: 10, color: meta.color, lineHeight: 1.4,
                      display: 'block', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {preview}
                    </span>
                  </button>
                )
              })()
            )}
          </div>
        )
      })}
    </div>
  )
}



function AiContent({ text, onWordClick }: { text: string; onWordClick?: (w: string, s: string) => void }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.2, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 20 }}>{line.slice(2)}</h1>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3, color: 'var(--text)', letterSpacing: '-0.01em', marginTop: 32, marginBottom: 12 }}>{line.slice(3)}</h2>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 24, marginBottom: 10 }}>{line.slice(4)}</h3>)
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={i} style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 16, margin: '0 0 18px', color: 'var(--text-dim)', fontStyle: 'italic', fontSize: 16 }}>{line.slice(2)}</blockquote>)
    } else if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
      const done = line.startsWith('- [x] ')
      elements.push(<li key={i} style={{ fontSize: 17, color: done ? 'var(--text-muted)' : 'var(--text)', lineHeight: 1.7, marginBottom: 6, marginLeft: 20, listStyle: 'none' }}><span style={{ marginRight: 8, opacity: 0.7 }}>{done ? '☑' : '☐'}</span>{renderInline(line.slice(6), line, onWordClick)}</li>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={i} style={{ fontSize: 17, color: 'var(--text)', lineHeight: 1.7, marginBottom: 6, marginLeft: 20 }}>{renderInline(line.slice(2), line, onWordClick)}</li>)
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 12 }} />)
    } else {
      elements.push(<p key={i} style={{ margin: '0 0 18px', fontSize: 17, color: 'var(--text)', lineHeight: 1.78, fontWeight: 400 }}>{renderInline(line, line, onWordClick)}</p>)
    }
  }
  return <>{elements}</>
}

export default function DocumentView({
  transcript, currentLine, isActive, targetLang: _targetLang, hideBanner,
  aiFormatted, aiFormattedAt, aiLoading,
  aiNotes, aiNotesLoading,
  viewMode, onViewModeChange,
  onWordClick,
  isEditable, onLineEdit,
  lineComments, openCommentLine: _openCommentLine, onOpenCommentLine: _onOpenCommentLine,
  commentAuthor: _commentAuthor, onCommentAuthorChange: _onCommentAuthorChange, onAddComment, commentSubmitting: _commentSubmitting,
  sessionStartMs, sessionEndMs,
  highlights, onAddHighlight, onRemoveHighlight,
  isHost, onDeleteComment, onEditComment,
  bannerOverride,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])

  // Swipe gesture state (touch + pointer for desktop drag)
  const swipeRef = useRef<{ x: number; y: number; lockedAxis: 'h' | 'v' | null } | null>(null)
  const viewModeRef = useRef(viewMode)
  const hasAiRef = useRef(false)
  const hasNotesRef = useRef(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [hoveredLine, setHoveredLine] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')

  // Inline comment state
  const [inlineOpenLine, setInlineOpenLine] = useState<number | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editingCard, setEditingCard] = useState('')
  const [addDraft, setAddDraft] = useState('')
  const [cardSubmitting, setCardSubmitting] = useState(false)

  const toggleInlineComment = useCallback((lineIndex: number, e: React.MouseEvent) => {
    if (!isHost) return
    e.stopPropagation()
    setInlineOpenLine(prev => prev === lineIndex ? null : lineIndex)
    setEditingCommentId(null)
    setAddDraft('')
  }, [isHost])

  // Track newest line for enter animation (only during live sessions)
  const prevLengthRef = useRef(transcript.length)
  const [newestLineIdx, setNewestLineIdx] = useState(-1)
  useEffect(() => {
    if (isActive && transcript.length > prevLengthRef.current) {
      setNewestLineIdx(transcript.length - 1)
    }
    prevLengthRef.current = transcript.length
  }, [transcript.length, isActive])

  const isNearBottom = () => {
    const el = scrollContainerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  useEffect(() => {
    // Don't auto-scroll while inline comment input is open (conflicts with autoFocus scroll)
    if (inlineOpenLine !== null) return
    if (isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [transcript.length, currentLine, inlineOpenLine])

  const prevViewMode = useRef(viewMode)
  useEffect(() => {
    if (prevViewMode.current !== viewMode) {
      prevViewMode.current = viewMode
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [viewMode])

  const scrollToLine = (index: number) => {
    const el = lineRefs.current[index]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Keep refs in sync for swipe handler (avoids stale closures in passive listeners)
  useEffect(() => { viewModeRef.current = viewMode }, [viewMode])

  // Swipe: register non-passive touchmove on the scroll container so we can preventDefault
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const onStart = (e: TouchEvent) => {
      swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, lockedAxis: null }
    }
    const onMove = (e: TouchEvent) => {
      if (!swipeRef.current) return
      const dx = e.touches[0].clientX - swipeRef.current.x
      const dy = e.touches[0].clientY - swipeRef.current.y
      if (!swipeRef.current.lockedAxis) {
        swipeRef.current.lockedAxis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      }
      if (swipeRef.current.lockedAxis === 'h') e.preventDefault()
    }
    const onEnd = (e: TouchEvent) => {
      if (!swipeRef.current || swipeRef.current.lockedAxis !== 'h') { swipeRef.current = null; return }
      const dx = e.changedTouches[0].clientX - swipeRef.current.x
      const dy = e.changedTouches[0].clientY - swipeRef.current.y
      swipeRef.current = null
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return
      const modes: ViewMode[] = ['raw', 'ai', 'notes']
      const idx = modes.indexOf(viewModeRef.current)
      if (dx < 0) {
        for (let i = idx + 1; i < modes.length; i++) {
          if (modes[i] === 'ai' && !hasAiRef.current) continue
          if (modes[i] === 'notes' && !hasNotesRef.current) continue
          onViewModeChange(modes[i]); break
        }
      } else {
        for (let i = idx - 1; i >= 0; i--) { onViewModeChange(modes[i]); break }
      }
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [onViewModeChange])

  // Build timeline segments from transcript when sessionStartMs is available
  const timelineSegments: TimelineSegment[] = sessionStartMs
    ? transcript
        .map((l, i) => ({
          index: i,
          offsetMs: l.time.getTime() - sessionStartMs,
          text: l.text,
          hasComment: (lineComments?.get(i)?.length ?? 0) > 0,
        }))
        .filter(s => s.offsetMs >= 0)
    : []

  const isEmpty = transcript.length === 0 && !currentLine

  // Highlights indexed by line_index for O(1) lookup during render
  const highlightsByLine = useMemo(() => {
    const map = new Map<number, HighlightItem[]>()
    if (highlights) {
      for (const h of highlights) {
        if (h.line_index != null) {
          const arr = map.get(h.line_index) ?? []
          arr.push(h)
          map.set(h.line_index, arr)
        }
      }
    }
    return map
  }, [highlights])

  // Combined margin entries (comments + highlights) for AI/Notes views
  const marginEntries: MarginEntry[] = []
  if (lineComments) {
    lineComments.forEach((cmts, lineIndex) => {
      cmts.forEach(c => marginEntries.push({ kind: 'comment', lineIndex, comment: c, _key: `c${c.id}` }))
    })
  }
  if (highlights) {
    highlights.filter(h => h.line_index != null).forEach(h =>
      marginEntries.push({ kind: 'highlight', lineIndex: h.line_index!, highlight: h, _key: `h${h.id}` })
    )
  }

  const commitEdit = () => {
    if (editingIndex === null) return
    onLineEdit?.(editingIndex, editingText)
    setEditingIndex(null)
  }

  const TAB_META: Record<ViewMode, { label: string; color: string }> = {
    raw:   { label: 'Transcript', color: '#64748B' },
    ai:    { label: '✦ AI',       color: '#6366F1' },
    notes: { label: '✦ Notes',    color: '#D97706' },
  }

  const hasAi = !!aiFormatted
  const hasNotes = !!aiNotes
  hasAiRef.current = hasAi
  hasNotesRef.current = hasNotes

  const tabAvailable: Record<ViewMode, boolean> = { raw: true, ai: hasAi, notes: hasNotes }
  const tabLoading: Record<ViewMode, boolean> = { raw: false, ai: !!aiLoading && !hasAi, notes: !!aiNotesLoading && !hasNotes }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ━━ LIVE BANNER — ocean theme ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {!hideBanner && (
        <div style={{ flexShrink: 0, padding: '16px 24px', borderBottom: timelineSegments.length > 0 ? 'none' : '1px solid var(--divider)', background: 'var(--surface-1)' }}>
          <LiveBanner
            currentLine={bannerOverride ? bannerOverride.current : currentLine}
            previousLine={bannerOverride ? bannerOverride.previous : (transcript[transcript.length - 1]?.text ?? '')}
            isActive={isActive}
          />
        </div>
      )}

      {/* ━━ TIMELINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {sessionStartMs && timelineSegments.length > 0 && (
        <div style={{ flexShrink: 0, background: 'var(--surface-1)', borderBottom: '1px solid var(--divider)' }}>
          <SessionTimeline
            segments={timelineSegments}
            sessionStartMs={sessionStartMs}
            sessionEndMs={sessionEndMs}
            onJumpTo={scrollToLine}
          />
        </div>
      )}

      {/* ━━ MODE TAB BAR — segmented control ━━━━━━━━━━━━━━━━━ */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '10px 16px',
        borderBottom: '1px solid var(--divider)',
        background: 'var(--surface-1)',
      }}>
        <div style={{
          display: 'inline-flex',
          background: 'var(--surface-2, rgba(0,0,0,0.06))',
          borderRadius: 10,
          padding: 3,
          gap: 1,
        }}>
          {(['raw', 'ai', 'notes'] as ViewMode[]).map(mode => {
            const { label, color } = TAB_META[mode]
            const active = viewMode === mode
            const available = tabAvailable[mode]
            const loading = tabLoading[mode]
            return (
              <button
                key={mode}
                onClick={() => available && onViewModeChange(mode)}
                style={{
                  height: 28, padding: '0 14px',
                  borderRadius: 7,
                  border: 'none',
                  background: active ? 'var(--canvas)' : 'transparent',
                  color: active ? color : 'var(--text-muted)',
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  cursor: available ? 'pointer' : 'default',
                  opacity: !available && !loading ? 0.35 : 1,
                  display: 'flex', alignItems: 'center', gap: 5,
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.06)' : 'none',
                  transition: 'background 0.15s, box-shadow 0.15s, color 0.15s',
                  userSelect: 'none', whiteSpace: 'nowrap',
                }}
              >
                {loading && <span style={{ width: 7, height: 7, border: `1.5px solid ${color}55`, borderTopColor: color, borderRadius: '50%', animation: 'spin 0.9s linear infinite', flexShrink: 0 }} />}
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ━━ DOCUMENT SURFACE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-1)' }}>
        <div className="doc-surface" style={{ maxWidth: 980, margin: '0 auto', padding: '28px 32px calc(40px + 80px)' }}>
          <div style={{ minWidth: 0, position: 'relative' }}>
          {isEmpty ? (
            <div style={{ paddingTop: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--text-muted)', textAlign: 'center' }}>
              <span style={{ fontSize: 28, opacity: 0.15 }}>✦</span>
              <span style={{ fontSize: 15, fontWeight: 500 }}>The document will appear here as you speak</span>
              <span style={{ fontSize: 13, opacity: 0.60 }}>Start a session to begin</span>
            </div>

          ) : viewMode === 'ai' && aiFormatted ? (
            <div style={{ display: 'grid', gridTemplateColumns: marginEntries.length > 0 ? '1fr 110px' : '1fr', gap: 12, alignItems: 'stretch' }}>
              <div className="doc-ai-update" style={{ minWidth: 0 }}>
                <AiContent text={aiFormatted} onWordClick={onWordClick} />
                {(aiFormattedAt !== undefined ? transcript.slice(aiFormattedAt) : []).map((line, i) => (
                  <p key={i} className="transcript-line" style={{ margin: '0 0 18px', fontSize: 17, color: 'var(--text)', lineHeight: 1.78 }}>
                    {renderInline(line.text, line.text, onWordClick)}
                  </p>
                ))}
                {isActive && !currentLine && <span className="doc-cursor" />}
              </div>
              {marginEntries.length > 0 && (
                <MarginPanel entries={marginEntries} onJumpTo={scrollToLine} totalLines={aiFormattedAt ?? transcript.length} />
              )}
            </div>

          ) : viewMode === 'notes' && aiNotes ? (
            <div style={{ display: 'grid', gridTemplateColumns: marginEntries.length > 0 ? '1fr 110px' : '1fr', gap: 12, alignItems: 'stretch' }}>
              <div className="doc-ai-update" style={{ minWidth: 0 }}>
                <AiContent text={aiNotes} onWordClick={onWordClick} />
                {isActive && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 16, fontStyle: 'italic' }}>Notes update as session progresses…</p>}
              </div>
              {marginEntries.length > 0 && (
                <MarginPanel entries={marginEntries} onJumpTo={scrollToLine} totalLines={aiFormattedAt ?? transcript.length} />
              )}
            </div>

          ) : (
            /* ── Raw transcript ── */
            <div>
              {transcript.map((line, i) => {
                const lineC = lineComments?.get(i) ?? []
                const hasComments = lineC.length > 0
                const lineHighlights = highlightsByLine.get(i) ?? []
                const hasHighlights = lineHighlights.length > 0
                const primaryHlMeta = hasHighlights ? CATEGORY_META[lineHighlights[0].category ?? '_'] : null

                // Progressive fade — only during live sessions
                const dist = (transcript.length - 1) - i
                const lineOpacity = !isActive ? 1
                  : dist === 0 ? 1
                  : dist === 1 ? 0.68
                  : dist === 2 ? 0.50
                  : Math.max(0.30, 0.50 - (dist - 2) * 0.04)
                const lineWeight: number = !isActive ? 400 : dist === 0 ? 500 : 400

                if (isEditable && editingIndex === i) {
                  return (
                    <textarea key={i} value={editingText} autoFocus
                      onChange={e => setEditingText(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commitEdit() }
                        if (e.key === 'Escape') setEditingIndex(null)
                      }}
                      style={{ width: '100%', resize: 'none', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 18, color: 'var(--text)', lineHeight: 1.85, fontFamily: 'inherit', marginBottom: 22, outline: 'none' }}
                      rows={Math.max(1, Math.ceil(editingText.length / 80))}
                    />
                  )
                }

                const isNewest = isActive && i === newestLineIdx

                return (
                  <div
                    key={i}
                    ref={el => { lineRefs.current[i] = el }}
                    data-line-index={i}
                    onMouseEnter={() => setHoveredLine(i)}
                    onMouseLeave={() => setHoveredLine(null)}
                    onDoubleClick={(onAddHighlight || onRemoveHighlight) ? () => {
                      if (hasHighlights && onRemoveHighlight) onRemoveHighlight(lineHighlights[0].id)
                      else if (!hasHighlights && onAddHighlight) onAddHighlight(line.text, i, 'idea')
                    } : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      marginBottom: 20,
                      opacity: lineOpacity,
                      transition: 'opacity 0.3s ease, background 0.15s',
                      animation: isNewest ? 'lineEnter 0.35s ease-out, lineFlash 1.1s ease-out' : undefined,
                      background: hasHighlights ? primaryHlMeta!.bg : 'transparent',
                      borderRadius: hasHighlights ? 8 : 0,
                    }}
                  >
                    {/* Left margin — inline comment trigger (host only) */}
                    {isHost && (
                      <button
                        onClick={e => toggleInlineComment(i, e)}
                        aria-label="Add note"
                        style={{
                          flexShrink: 0,
                          width: 22,
                          marginTop: 8,
                          marginRight: 6,
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          fontSize: hasComments ? 11 : 17,
                          lineHeight: 1,
                          fontWeight: 300,
                          color: hasComments
                            ? '#B91C1C'
                            : inlineOpenLine === i
                            ? 'rgba(99,102,241,0.7)'
                            : hoveredLine === i
                            ? 'rgba(99,102,241,0.55)'
                            : 'rgba(0,0,0,0.18)',
                          transition: 'color 0.15s',
                          userSelect: 'none',
                        }}
                      >
                        {hasComments ? '●' : inlineOpenLine === i ? '×' : '+'}
                      </button>
                    )}

                    {/* Text + annotations */}
                    <div style={{
                      flex: 1,
                      borderLeft: hasHighlights
                        ? `3px solid ${primaryHlMeta!.border}`
                        : hasComments
                        ? '2px solid rgba(99,102,241,0.22)'
                        : '2px solid transparent',
                      paddingLeft: (hasHighlights || hasComments) ? 12 : 0,
                      borderRadius: 4,
                    }}>
                    <p
                      style={{ margin: 0, fontSize: 18, color: 'var(--text)', lineHeight: 1.85, fontWeight: lineWeight, padding: '2px 0', cursor: isEditable && !isHost ? 'text' : undefined }}
                      onClick={(e) => {
                        if (isEditable && !isHost) { e.stopPropagation(); setEditingIndex(i); setEditingText(line.text) }
                      }}
                      onMouseEnter={e => { if (isEditable && !isHost) (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.04)' }}
                      onMouseLeave={e => { if (isEditable && !isHost) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      {renderInline(line.text, line.text, onWordClick)}
                    </p>

                    {/* Handwriting annotations */}
                    {lineC.length > 0 && (
                      <div style={{ paddingLeft: 6, paddingTop: 3, paddingBottom: 2 }}>
                        {lineC.map((comment, ci) => (
                          <div key={comment.id} style={{ marginTop: ci === 0 ? 0 : 5 }}>
                            {editingCommentId === comment.id ? (
                              <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                                <textarea
                                  autoFocus
                                  value={editingCard}
                                  onChange={e => setEditingCard(e.target.value)}
                                  rows={2}
                                  style={{
                                    flex: 1, resize: 'none', boxSizing: 'border-box',
                                    fontFamily: 'var(--font-note)', fontSize: 16, fontStyle: 'italic',
                                    color: '#B91C1C', lineHeight: 1.4,
                                    background: 'rgba(185,28,28,0.04)', border: '1px solid rgba(185,28,28,0.22)',
                                    borderRadius: 6, padding: '5px 9px', outline: 'none',
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditComment?.(comment.id, i, editingCard).then(() => setEditingCommentId(null)) }
                                    if (e.key === 'Escape') setEditingCommentId(null)
                                  }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
                                  <button onClick={() => onEditComment?.(comment.id, i, editingCard).then(() => setEditingCommentId(null))} style={{ fontSize: 10, fontWeight: 600, height: 22, padding: '0 7px', background: 'var(--accent)', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#fff' }}>Save</button>
                                  <button onClick={() => setEditingCommentId(null)} style={{ fontSize: 10, fontWeight: 600, height: 22, padding: '0 7px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-dim)' }}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                <span
                                  style={{
                                    color: '#B91C1C', fontFamily: 'var(--font-note)',
                                    fontSize: 16, fontStyle: 'italic', lineHeight: 1.35,
                                    transform: `rotate(${-0.7 - ci * 0.4}deg)`, display: 'inline-block',
                                    wordBreak: 'break-word', opacity: comment.pending ? 0.5 : 1,
                                  }}
                                >— {comment.body}</span>
                                {isHost && inlineOpenLine === i && (
                                  <span style={{ flexShrink: 0, display: 'inline-flex', gap: 4, opacity: 0.6 }}>
                                    <button onClick={() => { setEditingCommentId(comment.id); setEditingCard(comment.body) }} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px' }}>Edit</button>
                                    <button onClick={() => onDeleteComment?.(comment.id, i)} style={{ fontSize: 10, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px' }}>×</button>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline comment input — opens on margin button click */}
                    {inlineOpenLine === i && isHost && (
                      <div style={{ display: 'flex', gap: 6, paddingTop: 8, paddingLeft: 6 }}>
                        <textarea
                          autoFocus
                          value={addDraft}
                          onChange={e => setAddDraft(e.target.value)}
                          placeholder="Add a note…"
                          rows={1}
                          style={{
                            flex: 1, resize: 'none', boxSizing: 'border-box',
                            fontFamily: 'var(--font-note)', fontSize: 16, fontStyle: 'italic',
                            color: '#B91C1C', lineHeight: 1.4,
                            background: 'rgba(185,28,28,0.04)', border: '1px solid rgba(185,28,28,0.18)',
                            borderRadius: 6, padding: '6px 10px', outline: 'none',
                          }}
                          onKeyDown={async e => {
                            if (e.key === 'Enter' && !e.shiftKey && addDraft.trim()) {
                              e.preventDefault()
                              setCardSubmitting(true)
                              await onAddComment?.(i, addDraft.trim())
                              setAddDraft('')
                              setInlineOpenLine(null)
                              setCardSubmitting(false)
                            }
                            if (e.key === 'Escape') { setInlineOpenLine(null); setAddDraft('') }
                          }}
                        />
                        <button
                          disabled={cardSubmitting || !addDraft.trim()}
                          onClick={async () => {
                            if (!addDraft.trim()) return
                            setCardSubmitting(true)
                            await onAddComment?.(i, addDraft.trim())
                            setAddDraft('')
                            setInlineOpenLine(null)
                            setCardSubmitting(false)
                          }}
                          style={{
                            alignSelf: 'flex-end', height: 34, padding: '0 12px',
                            background: 'var(--accent)', color: '#fff', border: 'none',
                            borderRadius: 6, fontSize: 16, fontWeight: 700,
                            cursor: cardSubmitting || !addDraft.trim() ? 'not-allowed' : 'pointer',
                            opacity: cardSubmitting || !addDraft.trim() ? 0.35 : 1,
                            transition: 'opacity 0.15s', flexShrink: 0,
                          }}
                        >↵</button>
                      </div>
                    )}

                    </div>{/* end text+annotations wrapper */}

                    {/* Hover remove for highlighted lines */}
                    {hasHighlights && onRemoveHighlight && hoveredLine === i && (
                      <button
                        onClick={e => { e.stopPropagation(); onRemoveHighlight(lineHighlights[0].id) }}
                        title="Remove highlight"
                        style={{
                          alignSelf: 'center', marginLeft: 6, flexShrink: 0,
                          background: 'none', border: 'none', padding: '2px 5px',
                          color: primaryHlMeta!.color, fontSize: 14, opacity: 0.6,
                          cursor: 'pointer', lineHeight: 1, borderRadius: 4,
                          transition: 'opacity 0.12s',
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.6'}
                      >×</button>
                    )}
                  </div>
                )
              })}

              {/* Live current line — inline highlight while session is active */}
              {isActive && currentLine && (
                <div style={{
                  marginBottom: 20,
                  paddingLeft: 14,
                  paddingTop: 10,
                  paddingBottom: 10,
                  borderLeft: '3px solid var(--accent)',
                  borderRadius: 6,
                  background: 'rgba(99,102,241,0.04)',
                }}>
                  <p style={{ margin: 0, fontSize: 18, lineHeight: 1.85, color: 'var(--text)', fontWeight: 500 }}>
                    {currentLine}<span className="doc-cursor" style={{ display: 'inline-block', marginLeft: 2 }} />
                  </p>
                </div>
              )}
              {isActive && !currentLine && <span className="doc-cursor" />}

            </div>
          )}

          </div>
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Highlight selection popup — fixed positioned, outside scroll container */}
      {onAddHighlight && (
        <HighlightPopup
          containerRef={scrollContainerRef}
          onHighlight={onAddHighlight}
        />
      )}

    </div>
  )
}

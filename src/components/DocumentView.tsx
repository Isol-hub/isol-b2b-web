import { useEffect, useRef, useState, useCallback } from 'react'
import MatrixText from './MatrixText'
import { type CommentItem } from './CommentThread'
import LiveBanner from './LiveBanner'
import SessionTimeline, { type TimelineSegment } from './SessionTimeline'
import HighlightPopup, { type HighlightCategory, type HighlightItem } from './HighlightPopup'

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
}

interface MarginNoteItem {
  lineIndex: number
  lineText: string
  comment: CommentItem
}

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
              style={{ cursor: 'pointer', borderRadius: 3, transition: 'background 0.12s', padding: '0 1px' }}
              onMouseEnter={e => (e.target as HTMLElement).style.background = 'rgba(99,102,241,0.10)'}
              onMouseLeave={e => (e.target as HTMLElement).style.background = 'transparent'}
            >{word}</span>
          </span>
        ))}
      </span>
    )
  })
}

function timeAgoDoc(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function CommentMarginalia({
  items, onJumpTo, totalLines,
}: {
  items: MarginNoteItem[]
  onJumpTo?: (lineIndex: number) => void
  totalLines: number
}) {
  return (
    <div style={{ position: 'relative', height: '100%', minHeight: 60 }}>
      {items.map(({ lineIndex, comment }, i) => {
        const topPct = totalLines > 1 ? (lineIndex / (totalLines - 1)) * 100 : 0
        return (
          <div
            key={comment.id}
            style={{ position: 'absolute', top: `${topPct}%`, left: 0, right: 0, transform: 'translateY(-50%)' }}
          >
            <button
              onClick={() => onJumpTo?.(lineIndex)}
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
                {comment.body}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}


function InlineComments({ comments, rotateOffset = 0 }: { comments: CommentItem[]; rotateOffset?: number }) {
  return (
    <div style={{ paddingLeft: 6, paddingTop: 3, paddingBottom: 2 }}>
      {comments.map((comment, ci) => (
        <div
          key={comment.id}
          style={{
            color: '#B91C1C',
            fontFamily: 'var(--font-note)',
            fontSize: 16,
            fontStyle: 'italic',
            lineHeight: 1.35,
            transform: `rotate(${-0.7 - (ci + rotateOffset) * 0.4}deg)`,
            marginTop: ci === 0 ? 0 : 5,
            wordBreak: 'break-word',
            userSelect: 'none',
            opacity: (comment as CommentItem & { pending?: boolean }).pending ? 0.5 : 1,
            pointerEvents: 'none',
          }}
        >
          — {comment.body}
        </div>
      ))}
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
  transcript, currentLine, isActive, targetLang,
  aiFormatted, aiFormattedAt, aiLoading,
  aiNotes, aiNotesLoading,
  viewMode, onViewModeChange,
  onWordClick,
  isEditable, onLineEdit,
  lineComments, openCommentLine, onOpenCommentLine,
  commentAuthor, onCommentAuthorChange, onAddComment, commentSubmitting,
  sessionStartMs, sessionEndMs,
  highlights, onAddHighlight, onRemoveHighlight,
  isHost, onDeleteComment, onEditComment,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [hoveredLine, setHoveredLine] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')

  // Host comment card
  const [openCard, setOpenCard] = useState<{ lineIndex: number; x: number; y: number } | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editingCard, setEditingCard] = useState('')
  const [addDraft, setAddDraft] = useState('')
  const [cardSubmitting, setCardSubmitting] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openCard) return
    const handler = (e: MouseEvent) => {
      if (!cardRef.current?.contains(e.target as Node)) {
        setOpenCard(null)
        setEditingCommentId(null)
        setAddDraft('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openCard])

  const openHostCard = useCallback((lineIndex: number, e: React.MouseEvent) => {
    if (!isHost) return
    e.stopPropagation()
    setOpenCard({ lineIndex, x: e.clientX, y: e.clientY })
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
    // Don't auto-scroll while a comment form is open (conflicts with autoFocus scroll)
    if (openCommentLine !== null && openCommentLine !== undefined) return
    if (isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [transcript.length, currentLine, openCommentLine])

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
  const hasAi = !!aiFormatted
  const hasNotes = !!aiNotes
  const showModeBar = hasAi || hasNotes || !!aiLoading || !!aiNotesLoading

  // Flat list of annotations for read-only panel in AI/Notes views
  const annotationsForPanel: MarginNoteItem[] = []
  if (lineComments) {
    lineComments.forEach((comments, lineIndex) => {
      const lineText = lineIndex >= 0 && lineIndex < transcript.length ? transcript[lineIndex].text : ''
      comments.forEach(c => annotationsForPanel.push({ lineIndex, lineText, comment: c }))
    })
  }

  const commitEdit = () => {
    if (editingIndex === null) return
    onLineEdit?.(editingIndex, editingText)
    setEditingIndex(null)
  }

  const modeBtn = (mode: ViewMode, label: string, available: boolean, loading: boolean) => {
    const active = viewMode === mode
    return (
      <button
        onClick={() => available && onViewModeChange(mode)}
        disabled={!available && !loading}
        style={{
          fontSize: 11, fontWeight: 600, padding: '3px 12px', borderRadius: 20, height: 26,
          border: `1px solid ${active ? 'rgba(99,102,241,0.35)' : 'var(--border)'}`,
          background: active ? 'rgba(99,102,241,0.09)' : 'transparent',
          color: active ? 'var(--accent)' : 'var(--text-muted)',
          cursor: available ? 'pointer' : 'default',
          opacity: !available && !loading ? 0.4 : 1,
          display: 'flex', alignItems: 'center', gap: 5,
          transition: 'all 0.18s',
        }}
      >
        {loading && (
          <span style={{ width: 8, height: 8, border: '1.5px solid rgba(99,102,241,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.9s linear infinite', display: 'inline-block' }} />
        )}
        {label}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ━━ LIVE BANNER — ocean theme ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ flexShrink: 0, padding: '16px 24px', borderBottom: timelineSegments.length > 0 ? 'none' : '1px solid var(--divider)', background: 'var(--surface-1)' }}>
        <LiveBanner
          currentLine={currentLine}
          previousLine={transcript[transcript.length - 1]?.text ?? ''}
          isActive={isActive}
        />
      </div>

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

      {/* ━━ MODE BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '9px 32px', borderBottom: '1px solid var(--divider)' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
        {showModeBar ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {modeBtn('raw', 'Transcript', true, false)}
            {modeBtn('ai', '✦ AI Enhanced', hasAi, !!aiLoading && !hasAi)}
            {modeBtn('notes', '✦ Notes', hasNotes, !!aiNotesLoading && !hasNotes)}
          </div>
        ) : (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
            {isActive ? 'AI enhances after ~5 lines' : 'Transcript'}
          </span>
        )}
        <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
      </div>

      {/* ━━ DOCUMENT SURFACE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-1)' }}>
        <div className="doc-surface" style={{ maxWidth: 980, margin: '0 auto', padding: '40px 32px calc(40px + 80px)' }}>
          <div style={{ minWidth: 0, position: 'relative' }}>
          {isEmpty ? (
            <div style={{ paddingTop: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--text-muted)', textAlign: 'center' }}>
              <span style={{ fontSize: 28, opacity: 0.15 }}>✦</span>
              <span style={{ fontSize: 15, fontWeight: 500 }}>The document will appear here as you speak</span>
              <span style={{ fontSize: 13, opacity: 0.60 }}>Start a session to begin</span>
            </div>

          ) : viewMode === 'ai' && aiFormatted ? (
            <div style={{ display: 'grid', gridTemplateColumns: annotationsForPanel.length > 0 ? '1fr 110px' : '1fr', gap: 12, alignItems: 'stretch' }}>
              <div className="doc-ai-update" style={{ minWidth: 0 }}>
                <AiContent text={aiFormatted} onWordClick={onWordClick} />
                {(aiFormattedAt !== undefined ? transcript.slice(aiFormattedAt) : []).map((line, i) => (
                  <p key={i} className="transcript-line" style={{ margin: '0 0 18px', fontSize: 17, color: 'var(--text)', lineHeight: 1.78 }}>
                    {renderInline(line.text, line.text, onWordClick)}
                  </p>
                ))}
                {isActive && !currentLine && <span className="doc-cursor" />}
              </div>
              {annotationsForPanel.length > 0 && (
                <CommentMarginalia items={annotationsForPanel} onJumpTo={scrollToLine} totalLines={transcript.length} />
              )}
            </div>

          ) : viewMode === 'notes' && aiNotes ? (
            <div style={{ display: 'grid', gridTemplateColumns: annotationsForPanel.length > 0 ? '1fr 110px' : '1fr', gap: 12, alignItems: 'stretch' }}>
              <div className="doc-ai-update" style={{ minWidth: 0 }}>
                <AiContent text={aiNotes} onWordClick={onWordClick} />
                {isActive && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 16, fontStyle: 'italic' }}>Notes update as session progresses…</p>}
              </div>
              {annotationsForPanel.length > 0 && (
                <CommentMarginalia items={annotationsForPanel} onJumpTo={scrollToLine} totalLines={transcript.length} />
              )}
            </div>

          ) : (
            /* ── Raw transcript ── */
            <div>
              {transcript.map((line, i) => {
                const lineC = lineComments?.get(i) ?? []
                const hasComments = lineC.length > 0

                // Progressive fade — distance from the most recent finalized line
                const dist = (transcript.length - 1) - i
                const lineOpacity = dist === 0 ? 1
                  : dist === 1 ? 0.68
                  : dist === 2 ? 0.50
                  : Math.max(0.30, 0.50 - (dist - 2) * 0.04)
                const lineWeight: number = dist === 0 ? 500 : 400

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
                    onClick={isHost ? (e) => openHostCard(i, e) : undefined}
                    onMouseEnter={() => setHoveredLine(i)}
                    onMouseLeave={() => setHoveredLine(null)}
                    style={{
                      marginBottom: 20,
                      borderLeft: `2px solid ${hasComments ? 'rgba(99,102,241,0.25)' : 'transparent'}`,
                      paddingLeft: hasComments ? 14 : 2,
                      borderRadius: 6,
                      opacity: lineOpacity,
                      cursor: isHost ? 'text' : undefined,
                      transition: 'opacity 0.3s ease',
                      animation: isNewest ? 'lineEnter 0.35s ease-out, lineFlash 1.1s ease-out' : undefined,
                    }}
                  >
                    <p
                      style={{ margin: 0, fontSize: 18, color: 'var(--text)', lineHeight: 1.85, fontWeight: lineWeight, padding: '2px 0', cursor: isEditable && !isHost ? 'text' : isHost ? 'text' : undefined }}
                      onClick={(e) => {
                        // isHost takes priority — clicks bubble up to outer div for host card
                        if (isEditable && !isHost) { e.stopPropagation(); setEditingIndex(i); setEditingText(line.text) }
                      }}
                      onMouseEnter={e => { if (isEditable && !isHost) (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.04)' }}
                      onMouseLeave={e => { if (isEditable && !isHost) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      {isHost && (
                        <span
                          aria-hidden="true"
                          style={{
                            display: 'inline-block',
                            width: 14,
                            marginRight: 6,
                            fontSize: 9,
                            verticalAlign: 'middle',
                            color: hoveredLine === i ? '#B91C1C' : 'rgba(0,0,0,0.18)',
                            transition: 'color 0.18s',
                            userSelect: 'none',
                            lineHeight: 1,
                          }}
                        >✦</span>
                      )}
                      {renderInline(line.text, line.text, onWordClick)}
                    </p>

                    {/* Handwriting annotations — flow in document, spacing grows proportionally */}
                    {lineC.length > 0 && (
                      <div style={{ paddingLeft: 6, paddingTop: 3, paddingBottom: 2 }}>
                        {lineC.map((comment, ci) => (
                          <div
                            key={comment.id}
                            style={{
                              color: '#B91C1C',
                              fontFamily: 'var(--font-note)',
                              fontSize: 16,
                              fontStyle: 'italic',
                              lineHeight: 1.35,
                              transform: `rotate(${-0.7 - ci * 0.4}deg)`,
                              marginTop: ci === 0 ? 0 : 5,
                              wordBreak: 'break-word',
                              userSelect: 'none',
                              opacity: comment.pending ? 0.5 : 1,
                              pointerEvents: 'none',
                            }}
                          >
                            — {comment.body}
                          </div>
                        ))}
                      </div>
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

      {/* Host comment card — fixed, click-outside closes */}
      {openCard && isHost && (() => {
        const cardComments = lineComments?.get(openCard.lineIndex) ?? []
        const cardX = Math.min(openCard.x + 14, window.innerWidth - 296)
        const cardY = Math.min(openCard.y - 10, window.innerHeight - 320)
        return (
          <div
            ref={cardRef}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: cardX, top: cardY,
              width: 280,
              background: 'var(--canvas)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
              padding: '14px 16px',
              zIndex: 1000,
            }}
          >
            {/* Existing comments */}
            {cardComments.map(c => (
              <div key={c.id} style={{ marginBottom: 12 }}>
                {editingCommentId === c.id ? (
                  <>
                    <textarea
                      autoFocus
                      value={editingCard}
                      onChange={e => setEditingCard(e.target.value)}
                      rows={2}
                      style={{
                        width: '100%', resize: 'none', boxSizing: 'border-box',
                        fontFamily: 'var(--font-note)', fontSize: 17, fontStyle: 'italic',
                        color: '#B91C1C', lineHeight: 1.4,
                        background: 'rgba(185,28,28,0.04)', border: '1px solid rgba(185,28,28,0.22)',
                        borderRadius: 6, padding: '6px 10px', outline: 'none', marginBottom: 6,
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onEditComment?.(c.id, openCard.lineIndex, editingCard).then(() => setEditingCommentId(null)) }
                        if (e.key === 'Escape') setEditingCommentId(null)
                      }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => onEditComment?.(c.id, openCard.lineIndex, editingCard).then(() => setEditingCommentId(null))} style={{ flex: 1, fontSize: 11, fontWeight: 600, height: 26, background: 'var(--accent)', border: 'none', borderRadius: 5, cursor: 'pointer', color: '#fff' }}>Save</button>
                      <button onClick={() => setEditingCommentId(null)} style={{ flex: 1, fontSize: 11, fontWeight: 600, height: 26, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', color: 'var(--text-dim)' }}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ fontFamily: 'var(--font-note)', fontSize: 17, fontStyle: 'italic', color: '#B91C1C', lineHeight: 1.35, margin: '0 0 4px' }}>
                      — {c.body}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }}>{c.author} · {timeAgoDoc(c.created_at)}</span>
                      <button onClick={() => { setEditingCommentId(c.id); setEditingCard(c.body) }} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>Edit</button>
                      <button onClick={() => onDeleteComment?.(c.id, openCard.lineIndex)} style={{ fontSize: 11, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>Delete</button>
                    </div>
                  </>
                )}
                {cardComments.indexOf(c) < cardComments.length - 1 && (
                  <div style={{ height: 1, background: 'var(--divider)', margin: '10px 0 0' }} />
                )}
              </div>
            ))}

            {/* Add new annotation */}
            {cardComments.length > 0 && <div style={{ height: 1, background: 'var(--divider)', margin: '4px 0 10px' }} />}
            <div style={{ display: 'flex', gap: 6 }}>
              <textarea
                value={addDraft}
                onChange={e => setAddDraft(e.target.value)}
                placeholder="Aggiungi nota…"
                rows={2}
                autoFocus={cardComments.length === 0}
                style={{
                  flex: 1, resize: 'none', boxSizing: 'border-box',
                  fontFamily: 'var(--font-note)', fontSize: 16, fontStyle: 'italic',
                  color: '#B91C1C', lineHeight: 1.4,
                  background: 'rgba(185,28,28,0.04)', border: '1px solid rgba(185,28,28,0.18)',
                  borderRadius: 6, padding: '6px 10px', outline: 'none',
                }}
                onKeyDown={async e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && addDraft.trim()) {
                    e.preventDefault()
                    setCardSubmitting(true)
                    await onAddComment?.(openCard.lineIndex, addDraft.trim())
                    setAddDraft('')
                    setCardSubmitting(false)
                  }
                  if (e.key === 'Escape') setOpenCard(null)
                }}
              />
              <button
                disabled={cardSubmitting || !addDraft.trim()}
                onClick={async () => {
                  if (!addDraft.trim()) return
                  setCardSubmitting(true)
                  await onAddComment?.(openCard.lineIndex, addDraft.trim())
                  setAddDraft('')
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
          </div>
        )
      })()}
    </div>
  )
}

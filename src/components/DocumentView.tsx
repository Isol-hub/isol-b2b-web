import { useEffect, useRef, useState } from 'react'
import MatrixText from './MatrixText'
import CommentThread, { type CommentItem } from './CommentThread'
import LiveBanner from './LiveBanner'
import SessionTimeline, { type TimelineSegment } from './SessionTimeline'

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

function AnnotationsPanel({ items }: { items: Array<{ lineText: string; comment: CommentItem }> }) {
  return (
    <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--divider)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Annotations ({items.length})
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
      </div>
      {items.map(({ lineText, comment }) => (
        <div key={comment.id} style={{ marginBottom: 16 }}>
          {lineText && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lineText.length > 80 ? lineText.slice(0, 80) + '…' : lineText}
            </p>
          )}
          <div style={{ fontFamily: 'var(--font-note)', fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.45 }}>
            {comment.body}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {comment.author} · {timeAgoDoc(comment.created_at)}
          </div>
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
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [hoveredLine, setHoveredLine] = useState<number | null>(null)

  const [editingText, setEditingText] = useState('')

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
  const annotationsForPanel: Array<{ lineText: string; comment: CommentItem }> = []
  if (lineComments) {
    lineComments.forEach((comments, lineIndex) => {
      const lineText = lineIndex >= 0 && lineIndex < transcript.length ? transcript[lineIndex].text : ''
      comments.forEach(c => annotationsForPanel.push({ lineText, comment: c }))
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
            {isActive ? 'AI enhances on 5+ lines' : 'Transcript'}
          </span>
        )}
        <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
      </div>

      {/* ━━ DOCUMENT SURFACE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-1)' }}>
        <div className="doc-surface" style={{ maxWidth: 860, margin: '0 auto', padding: '48px 64px calc(48px + 80px)' }}>

          {isEmpty ? (
            <div style={{ paddingTop: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--text-muted)', textAlign: 'center' }}>
              <span style={{ fontSize: 28, opacity: 0.15 }}>✦</span>
              <span style={{ fontSize: 15, fontWeight: 500 }}>The document will appear here as you speak</span>
              <span style={{ fontSize: 13, opacity: 0.60 }}>Start a session to begin</span>
            </div>

          ) : viewMode === 'ai' && aiFormatted ? (
            <div className="doc-ai-update">
              <AiContent text={aiFormatted} onWordClick={onWordClick} />
              {(aiFormattedAt !== undefined ? transcript.slice(aiFormattedAt) : []).map((line, i) => (
                <p key={i} className="transcript-line" style={{ margin: '0 0 18px', fontSize: 17, color: 'var(--text)', lineHeight: 1.78 }}>
                  {renderInline(line.text, line.text, onWordClick)}
                </p>
              ))}
              {isActive && !currentLine && <span className="doc-cursor" />}
              {annotationsForPanel.length > 0 && <AnnotationsPanel items={annotationsForPanel} />}
            </div>

          ) : viewMode === 'notes' && aiNotes ? (
            <div className="doc-ai-update">
              <AiContent text={aiNotes} onWordClick={onWordClick} />
              {isActive && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 16, fontStyle: 'italic' }}>Notes update as session progresses…</p>}
              {annotationsForPanel.length > 0 && <AnnotationsPanel items={annotationsForPanel} />}
            </div>

          ) : (
            /* ── Raw transcript ── */
            <div>
              {transcript.map((line, i) => {
                const lineC = lineComments?.get(i) ?? []
                const isOpenC = openCommentLine === i
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

                const isLineHovered = hoveredLine === i

                return (
                  <div
                    key={i}
                    ref={el => { lineRefs.current[i] = el }}
                    onMouseEnter={() => setHoveredLine(i)}
                    onMouseLeave={() => setHoveredLine(null)}
                    style={{
                      marginBottom: isOpenC ? 28 : 20,
                      borderLeft: `2px solid ${isOpenC ? 'var(--accent)' : hasComments ? 'rgba(99,102,241,0.30)' : 'transparent'}`,
                      paddingLeft: isOpenC || hasComments ? 14 : 2,
                      borderRadius: 6,
                      background: isOpenC ? 'rgba(99,102,241,0.03)' : 'transparent',
                      opacity: lineOpacity,
                      transition: 'opacity 0.3s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <p
                        style={{ flex: 1, margin: 0, fontSize: 18, color: 'var(--text)', lineHeight: 1.85, fontWeight: lineWeight, cursor: isEditable ? 'text' : undefined, padding: '2px 0' }}
                        onClick={() => {
                          if (isEditable) { setEditingIndex(i); setEditingText(line.text) }
                        }}
                        onMouseEnter={e => { if (isEditable) (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.04)' }}
                        onMouseLeave={e => { if (isEditable) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        {renderInline(line.text, line.text, onWordClick)}
                      </p>

                      {/* Annotation trigger */}
                      {onAddComment && (
                        <button
                          onClick={() => onOpenCommentLine?.(isOpenC ? null : i)}
                          title="Aggiungi annotazione"
                          style={{
                            flexShrink: 0,
                            display: 'flex', alignItems: 'center', gap: 4,
                            marginTop: 4,
                            padding: '3px 7px',
                            borderRadius: 6,
                            border: hasComments
                              ? '1px solid rgba(217,119,6,0.30)'
                              : isOpenC
                              ? '1px solid rgba(99,102,241,0.30)'
                              : '1px solid transparent',
                            background: hasComments
                              ? 'rgba(217,119,6,0.08)'
                              : isOpenC
                              ? 'rgba(99,102,241,0.07)'
                              : isLineHovered
                              ? 'var(--surface-1)'
                              : 'transparent',
                            color: hasComments ? '#D97706' : isOpenC ? 'var(--accent)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            opacity: isOpenC || hasComments || isLineHovered ? 1 : 0,
                            transition: 'opacity 0.15s, background 0.15s, border-color 0.15s',
                          }}
                        >
                          {/* Speech bubble SVG */}
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                          {hasComments && (
                            <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{lineC.length}</span>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Inline comment thread */}
                    {isOpenC && onAddComment && (
                      <div style={{ paddingTop: 4, paddingBottom: 8 }}>
                        <CommentThread
                          comments={lineC}
                          authorName={commentAuthor ?? ''}
                          onAuthorChange={onCommentAuthorChange ?? (() => {})}
                          onAdd={body => onAddComment(i, body)}
                          submitting={commentSubmitting ?? false}
                        />
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
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

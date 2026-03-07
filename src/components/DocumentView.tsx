import { useEffect, useRef, useState } from 'react'
import MatrixText from './MatrixText'

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
  // AI formatting
  aiFormatted?: string
  aiFormattedAt?: number
  aiLoading?: boolean
  // AI notes
  aiNotes?: string
  aiNotesLoading?: boolean
  // View mode
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  // Glossary
  onWordClick?: (word: string, sentence: string) => void
  // Host editing (raw mode only)
  isEditable?: boolean
  onLineEdit?: (index: number, text: string) => void
}

function elapsed(start: Date, now: Date): string {
  const s = Math.floor((now.getTime() - start.getTime()) / 1000)
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

// Render text with **bold** support
function renderInline(
  text: string,
  sentence: string,
  onWordClick?: (w: string, s: string) => void,
): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2)
      return <strong key={i}>{inner}</strong>
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

function AiContent({ text, onWordClick }: { text: string; onWordClick?: (w: string, s: string) => void }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.2, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 20 }}>
          {line.slice(2)}
        </h1>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3, color: 'var(--text)', letterSpacing: '-0.01em', marginTop: 32, marginBottom: 12 }}>
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 24, marginBottom: 10 }}>
          {line.slice(4)}
        </h3>
      )
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} style={{
          borderLeft: '3px solid var(--accent)', paddingLeft: 16, margin: '0 0 18px',
          color: 'var(--text-dim)', fontStyle: 'italic', fontSize: 16,
        }}>
          {line.slice(2)}
        </blockquote>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={i} style={{ fontSize: 17, color: 'var(--text)', lineHeight: 1.7, marginBottom: 6, marginLeft: 20 }}>
          {renderInline(line.slice(2), line, onWordClick)}
        </li>
      )
    } else if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
      const done = line.startsWith('- [x] ')
      elements.push(
        <li key={i} style={{ fontSize: 17, color: done ? 'var(--text-muted)' : 'var(--text)', lineHeight: 1.7, marginBottom: 6, marginLeft: 20, listStyle: 'none' }}>
          <span style={{ marginRight: 8, opacity: 0.7 }}>{done ? '☑' : '☐'}</span>
          {renderInline(line.slice(6), line, onWordClick)}
        </li>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 12 }} />)
    } else {
      elements.push(
        <p key={i} style={{ margin: '0 0 18px', fontSize: 17, color: 'var(--text)', lineHeight: 1.78, fontWeight: 400 }}>
          {renderInline(line, line, onWordClick)}
        </p>
      )
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
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [sessionStart] = useState(() => new Date())
  const [now, setNow] = useState(new Date())
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')

  useEffect(() => {
    if (!isActive) return
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [isActive])

  // "Stick to bottom" — only auto-scroll when user is already near the bottom.
  // Never hijack the scroll position when the user has scrolled up to read.
  const isNearBottom = () => {
    const el = scrollContainerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  useEffect(() => {
    if (isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [transcript.length, currentLine])

  // When the user explicitly switches view mode, scroll to top of new content.
  const prevViewMode = useRef(viewMode)
  useEffect(() => {
    if (prevViewMode.current !== viewMode) {
      prevViewMode.current = viewMode
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [viewMode])

  const isEmpty = transcript.length === 0 && !currentLine
  const hasAi = !!aiFormatted
  const hasNotes = !!aiNotes
  const showModeBar = hasAi || hasNotes || !!aiLoading || !!aiNotesLoading

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
          color: active ? 'var(--accent)' : available ? 'var(--text-muted)' : 'var(--text-muted)',
          cursor: available ? 'pointer' : 'default',
          opacity: !available && !loading ? 0.4 : 1,
          display: 'flex', alignItems: 'center', gap: 5,
          transition: 'all 0.18s',
        }}
      >
        {loading && (
          <span style={{
            width: 8, height: 8,
            border: '1.5px solid rgba(99,102,241,0.2)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.9s linear infinite',
            display: 'inline-block',
          }} />
        )}
        {label}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ━━ LIVE STREAM STRIP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{
        flexShrink: 0, padding: '14px 32px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid var(--divider)', minHeight: 48,
      }}>
        {isActive && (
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--live)',
            animation: 'livePulse 2s ease-in-out infinite', flexShrink: 0,
          }} />
        )}
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
          color: isActive ? 'var(--live)' : 'var(--text-muted)', flexShrink: 0,
        }}>
          {isActive ? 'Live' : transcript.length > 0 ? 'Capture' : 'Ready'}
        </span>
        {(isActive || transcript.length > 0) && (
          <span style={{ width: 1, height: 14, background: 'var(--divider)', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {currentLine ? (
            <span style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.55 }}>
              <MatrixText text={currentLine} color="var(--text-dim)" />
              <span className="doc-cursor" />
            </span>
          ) : isActive ? (
            <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}>
              Listening<span className="doc-cursor" />
            </span>
          ) : transcript.length > 0 ? (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Session ended · {transcript.length} lines captured
            </span>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Start a session to begin capturing</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {isActive && (
            <>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {elapsed(sessionStart, now)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{targetLang}</span>
            </>
          )}
        </div>
      </div>

      {/* ━━ MODE BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 32px', borderBottom: '1px solid var(--divider)',
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
        {showModeBar ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {modeBtn('raw', 'Transcript', true, false)}
            {modeBtn('ai', '✦ AI Enhanced', hasAi, !!aiLoading && !hasAi)}
            {modeBtn('notes', '✦ Notes', hasNotes, !!aiNotesLoading && !hasNotes)}
          </div>
        ) : (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
            AI enhances on 5+ lines
          </span>
        )}
        <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
      </div>

      {/* ━━ DOCUMENT SURFACE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-1)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 64px calc(48px + 80px)' }}>

          {isEmpty ? (
            <div style={{
              paddingTop: 80, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 14, color: 'var(--text-muted)', textAlign: 'center',
            }}>
              <span style={{ fontSize: 28, opacity: 0.15 }}>✦</span>
              <span style={{ fontSize: 15, fontWeight: 500 }}>The document will appear here as you speak</span>
              <span style={{ fontSize: 13, opacity: 0.60 }}>Start a session from the left rail to begin</span>
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
            </div>

          ) : viewMode === 'notes' && aiNotes ? (
            <div className="doc-ai-update">
              <AiContent text={aiNotes} onWordClick={onWordClick} />
              {isActive && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 16, fontStyle: 'italic' }}>Notes update as session progresses…</p>}
            </div>

          ) : (
            /* Raw transcript — editable if isEditable */
            <div>
              {transcript.map((line, i) => {
                if (isEditable && editingIndex === i) {
                  return (
                    <textarea
                      key={i}
                      value={editingText}
                      autoFocus
                      onChange={e => setEditingText(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commitEdit() }
                        if (e.key === 'Escape') { setEditingIndex(null) }
                      }}
                      style={{
                        width: '100%', resize: 'none', background: 'rgba(99,102,241,0.05)',
                        border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6,
                        padding: '6px 10px', fontSize: 17, color: 'var(--text)', lineHeight: 1.78,
                        fontFamily: 'inherit', marginBottom: 10, outline: 'none',
                      }}
                      rows={Math.max(1, Math.ceil(editingText.length / 80))}
                    />
                  )
                }
                return (
                  <p
                    key={i}
                    className="transcript-line"
                    onClick={() => {
                      if (!isEditable) return
                      setEditingIndex(i)
                      setEditingText(line.text)
                    }}
                    style={{
                      margin: '0 0 18px', fontSize: 17, color: 'var(--text)', lineHeight: 1.78,
                      cursor: isEditable ? 'text' : undefined,
                      borderRadius: isEditable ? 4 : undefined,
                      transition: isEditable ? 'background 0.12s' : undefined,
                    }}
                    onMouseEnter={e => { if (isEditable) (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.04)' }}
                    onMouseLeave={e => { if (isEditable) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {renderInline(line.text, line.text, onWordClick)}
                  </p>
                )
              })}
              {isActive && !currentLine && <span className="doc-cursor" />}
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

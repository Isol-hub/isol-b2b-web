import { useEffect, useRef, useState } from 'react'
import MatrixText from './MatrixText'

interface TranscriptLine {
  text: string
  time: Date
}

interface Props {
  transcript: TranscriptLine[]
  currentLine: string
  isActive: boolean
  targetLang: string
  aiFormatted?: string
  aiLoading?: boolean
  /** Called when user clicks a word — for glossary */
  onWordClick?: (word: string, sentence: string) => void
}

function elapsed(start: Date, now: Date): string {
  const s = Math.floor((now.getTime() - start.getTime()) / 1000)
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

/** Render AI markdown text: ##/### become headers, blank lines become paragraph breaks */
function AiMarkdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} style={{ fontSize: 20, fontWeight: 700, color: 'rgba(238,242,255,0.95)', margin: '18px 0 8px', letterSpacing: '-0.01em' }}>
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} style={{ fontSize: 12, fontWeight: 700, color: '#c4b5fd', margin: '14px 0 6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {line.slice(4)}
        </h3>
      )
    } else if (line.trim() === '') {
      elements.push(<br key={i} />)
    } else {
      elements.push(
        <span key={i} style={{ display: 'block', marginBottom: 4, color: 'rgba(238,242,255,0.82)', fontSize: 17, lineHeight: 1.85 }}>
          {line}
        </span>
      )
    }
  }
  return <>{elements}</>
}

export default function DocumentView({ transcript, currentLine, isActive, targetLang, aiFormatted, aiLoading, onWordClick }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [sessionStart] = useState(() => new Date())
  const [now, setNow] = useState(new Date())
  const [aiMode, setAiMode] = useState(false)

  useEffect(() => {
    if (!isActive) return
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [isActive])

  // Autoscroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [transcript.length, currentLine, aiMode, aiFormatted])

  // Switch to AI mode automatically when first formatted text arrives
  useEffect(() => {
    if (aiFormatted && !aiMode) setAiMode(true)
  }, [aiFormatted])

  const isEmpty = transcript.length === 0 && !currentLine
  const canAi = !!(aiFormatted)

  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 20,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 280,
      maxHeight: 'calc(100vh - 280px)',
      backdropFilter: 'blur(20px)',
      transition: 'border-color 0.4s, box-shadow 0.4s',
      ...(isActive ? {
        borderColor: 'rgba(167,139,250,0.18)',
        boxShadow: '0 0 48px rgba(124,58,237,0.08)',
      } : {}),
    }}>
      {/* Doc header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.025)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isActive ? '#4ade80' : 'rgba(238,242,255,0.2)',
            boxShadow: isActive ? '0 0 8px #4ade80' : 'none',
            transition: 'all 0.3s',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, color: 'rgba(238,242,255,0.40)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {isActive ? 'Live · ' + targetLang.toUpperCase() : 'Transcript · ' + targetLang.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* AI mode toggle */}
          {(canAi || aiLoading) && (
            <button
              onClick={() => setAiMode(m => !m)}
              disabled={!canAi}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                padding: '4px 10px', borderRadius: 8,
                border: `1px solid ${aiMode ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.10)'}`,
                background: aiMode ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.04)',
                color: aiMode ? '#c4b5fd' : 'rgba(238,242,255,0.40)',
                cursor: canAi ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
            >
              {aiLoading && !canAi ? (
                <>
                  <span style={{
                    width: 10, height: 10, border: '1.5px solid rgba(167,139,250,0.3)',
                    borderTopColor: '#a78bfa', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', display: 'inline-block',
                  }} />
                  AI…
                </>
              ) : (
                <>✦ {aiMode ? 'AI Enhanced' : 'AI Enhanced'}</>
              )}
            </button>
          )}

          <span style={{ fontSize: 12, color: 'rgba(238,242,255,0.28)', fontFamily: 'monospace' }}>
            {isActive ? elapsed(sessionStart, now) : transcript.length > 0 ? `${transcript.length} lines` : ''}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '28px 32px',
        fontFamily: "'Georgia', 'Times New Roman', serif",
        lineHeight: 1.85,
        letterSpacing: '0.005em',
      }}>
        {isEmpty ? (
          <div style={{
            height: 200, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            color: 'rgba(238,242,255,0.20)',
          }}>
            <span style={{ fontSize: 32 }}>✦</span>
            <span style={{ fontSize: 14 }}>The session will appear here…</span>
          </div>
        ) : aiMode && aiFormatted ? (
          /* AI Enhanced view */
          <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
            <AiMarkdown text={aiFormatted} />
            {/* Live current line appended */}
            {currentLine && (
              <span style={{ display: 'block', marginTop: 8 }}>
                <MatrixText text={currentLine} color="rgba(167,139,250,0.9)" />
                <span className="doc-cursor">█</span>
              </span>
            )}
            {isActive && !currentLine && <span className="doc-cursor">█</span>}
          </div>
        ) : (
          /* Raw word-by-word view */
          <p style={{ margin: 0, fontSize: 19, color: 'rgba(238,242,255,0.85)' }}>
            {transcript.map((line, i) => (
              <span key={i}>
                {onWordClick
                  ? line.text.split(' ').map((word, j) => (
                      <span
                        key={j}
                        onClick={() => onWordClick(word.replace(/[^\w]/g, ''), line.text)}
                        style={{
                          cursor: 'pointer',
                          borderRadius: 3,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.target as HTMLElement).style.background = 'rgba(167,139,250,0.15)'}
                        onMouseLeave={e => (e.target as HTMLElement).style.background = 'transparent'}
                      >
                        {word}
                      </span>
                    )).reduce((acc: React.ReactNode[], el, j) => j === 0 ? [el] : [...acc, ' ', el], [])
                  : line.text
                }
                {' '}
              </span>
            ))}

            {/* Live current line */}
            {currentLine && (
              <span style={{ display: 'inline' }}>
                <MatrixText text={currentLine} color="rgba(167,139,250,0.9)" />
                <span className="doc-cursor">█</span>
              </span>
            )}

            {/* Blinking cursor when active but no current line */}
            {isActive && !currentLine && (
              <span className="doc-cursor">█</span>
            )}
          </p>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

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
  aiFormattedAt?: number
  aiLoading?: boolean
  aiMode: boolean
  onAiModeChange: (mode: boolean) => void
  onWordClick?: (word: string, sentence: string) => void
}

function elapsed(start: Date, now: Date): string {
  const s = Math.floor((now.getTime() - start.getTime()) / 1000)
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

function AiMarkdown({ text, onWordClick }: { text: string; onWordClick?: (w: string, s: string) => void }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} style={{
          fontSize: 30, fontWeight: 700, lineHeight: 1.2,
          color: 'var(--text)', letterSpacing: '-0.02em',
          marginBottom: 20,
        }}>{line.slice(2)}</h1>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} style={{
          fontSize: 20, fontWeight: 700, lineHeight: 1.3,
          color: 'var(--text)', letterSpacing: '-0.01em',
          marginTop: 32, marginBottom: 12,
        }}>{line.slice(3)}</h2>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.09em',
          textTransform: 'uppercase', color: 'var(--text-muted)',
          marginTop: 24, marginBottom: 10,
        }}>{line.slice(4)}</h3>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 16 }} />)
    } else {
      elements.push(
        <p key={i} style={{
          margin: '0 0 18px', fontSize: 18,
          color: 'var(--text)', lineHeight: 1.78, fontWeight: 400,
        }}>{renderWords(line, line, onWordClick)}</p>
      )
    }
  }
  return <>{elements}</>
}

function WordSpan({ word, sentence, onWordClick }: {
  word: string
  sentence: string
  onWordClick: (w: string, s: string) => void
}) {
  return (
    <span
      onClick={() => onWordClick(word.replace(/[^\w]/g, ''), sentence)}
      style={{ cursor: 'pointer', borderRadius: 3, transition: 'background 0.12s', padding: '0 1px' }}
      onMouseEnter={e => (e.target as HTMLElement).style.background = 'rgba(217,164,65,0.15)'}
      onMouseLeave={e => (e.target as HTMLElement).style.background = 'transparent'}
    >{word}</span>
  )
}

function renderWords(
  text: string,
  sentence: string,
  onWordClick?: (w: string, s: string) => void,
): React.ReactNode {
  if (!onWordClick) return text
  return text.split(' ').map((word, j) => (
    <span key={j}>
      {j > 0 && ' '}
      <WordSpan word={word} sentence={sentence} onWordClick={onWordClick} />
    </span>
  ))
}

export default function DocumentView({
  transcript, currentLine, isActive, targetLang,
  aiFormatted, aiFormattedAt, aiLoading,
  aiMode, onAiModeChange,
  onWordClick,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [sessionStart] = useState(() => new Date())
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    if (!isActive) return
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [isActive])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [transcript.length, currentLine, aiMode, aiFormatted])

  const isEmpty = transcript.length === 0 && !currentLine
  const canAi = !!(aiFormatted)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ━━ LIVE STREAM STRIP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{
        flexShrink: 0,
        padding: '14px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: '1px solid var(--divider)',
        minHeight: 48,
      }}>

        {/* Live pulse */}
        {isActive && (
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--live)',
            animation: 'livePulse 2s ease-in-out infinite',
            flexShrink: 0,
          }} />
        )}

        {/* Label */}
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: isActive ? 'var(--live)' : 'var(--text-muted)',
          flexShrink: 0,
        }}>
          {isActive ? 'Live' : transcript.length > 0 ? 'Capture' : 'Ready'}
        </span>

        {/* Separator */}
        {(isActive || transcript.length > 0) && (
          <span style={{ width: 1, height: 14, background: 'var(--divider)', flexShrink: 0 }} />
        )}

        {/* Flowing line */}
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
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Start a session to begin capturing
            </span>
          )}
        </div>

        {/* Right meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {isActive && (
            <>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {elapsed(sessionStart, now)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{targetLang}</span>
            </>
          )}
          {(canAi || aiLoading) && (
            <span className="ai-badge">
              {aiLoading ? '↻ AI' : '✦ AI'}
            </span>
          )}
        </div>
      </div>

      {/* ━━ AI STRUCTURING DIVIDER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 32px',
        borderBottom: '1px solid var(--divider)',
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {aiLoading && (
            <span style={{
              width: 9, height: 9,
              border: '1.5px solid rgba(88,213,201,0.18)',
              borderTopColor: 'var(--teal)',
              borderRadius: '50%',
              animation: 'spin 0.9s linear infinite',
              display: 'inline-block', flexShrink: 0,
            }} />
          )}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
            {aiLoading ? 'AI structuring' : canAi ? 'AI structured' : 'AI structures on 5+ lines'}
          </span>
          {canAi && (
            <button
              onClick={() => onAiModeChange(!aiMode)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 600,
                padding: '3px 10px', borderRadius: 20,
                border: `1px solid ${aiMode ? 'rgba(217,164,65,0.40)' : 'var(--border)'}`,
                background: aiMode ? 'rgba(217,164,65,0.10)' : 'transparent',
                color: aiMode ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}
            >
              ✦ {aiMode ? 'AI Enhanced' : 'Enable AI'}
            </button>
          )}
        </div>
        <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
      </div>

      {/* ━━ DOCUMENT SURFACE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: 'var(--surface-1)',
      }}>
        <div style={{
          maxWidth: 860,
          margin: '0 auto',
          padding: '48px 64px calc(48px + 80px)',  /* extra bottom for toolbar */
        }}>
          {isEmpty ? (
            <div style={{
              paddingTop: 80,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 14, color: 'var(--text-muted)',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: 28, opacity: 0.15 }}>✦</span>
              <span style={{ fontSize: 15, fontWeight: 500 }}>The document will appear here as you speak</span>
              <span style={{ fontSize: 13, opacity: 0.60 }}>
                Start a session from the left rail to begin
              </span>
            </div>
          ) : aiMode && aiFormatted ? (
            <div className="doc-ai-update">
              <AiMarkdown text={aiFormatted} onWordClick={onWordClick} />
              {(aiFormattedAt !== undefined ? transcript.slice(aiFormattedAt) : []).map((line, i) => (
                <p key={i} className="transcript-line" style={{
                  margin: '0 0 18px', fontSize: 18,
                  color: 'var(--text)', lineHeight: 1.78,
                }}>
                  {renderWords(line.text, line.text, onWordClick)}
                </p>
              ))}
              {isActive && !currentLine && <span className="doc-cursor" />}
            </div>
          ) : (
            <div>
              {transcript.map((line, i) => (
                <p key={i} className="transcript-line" style={{
                  margin: '0 0 18px', fontSize: 18,
                  color: 'var(--text)', lineHeight: 1.78,
                }}>
                  {renderWords(line.text, line.text, onWordClick)}
                </p>
              ))}
              {isActive && !currentLine && <span className="doc-cursor" />}
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

    </div>
  )
}

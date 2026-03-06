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
          fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--text-muted)',
          marginTop: 24, marginBottom: 10,
        }}>{line.slice(4)}</h3>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 16 }} />)
    } else {
      elements.push(
        <p key={i} style={{
          margin: '0 0 16px', fontSize: 18,
          color: 'var(--text)', lineHeight: 1.75, fontWeight: 400,
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
      onMouseEnter={e => (e.target as HTMLElement).style.background = 'rgba(214,178,94,0.15)'}
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
  aiFormatted, aiFormattedAt, aiLoading, onWordClick,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [sessionStart] = useState(() => new Date())
  const [now, setNow] = useState(new Date())
  const [aiMode, setAiMode] = useState(false)

  useEffect(() => {
    if (!isActive) return
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [isActive])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [transcript.length, currentLine, aiMode, aiFormatted])

  useEffect(() => {
    if (aiFormatted && !aiMode) setAiMode(true)
  }, [aiFormatted])

  const isEmpty = transcript.length === 0 && !currentLine
  const canAi = !!(aiFormatted)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ━━ LIVE CAPTURE STRIP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ flexShrink: 0 }}>

        {/* Strip header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isActive && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--live)',
                animation: 'livePulse 2s ease-in-out infinite',
                display: 'inline-block', flexShrink: 0,
              }} />
            )}
            <span className="section-label">
              {isActive ? 'Live Capture' : transcript.length > 0 ? 'Capture' : 'Ready'}
            </span>
            {isActive && (
              <>
                <span style={{ color: 'var(--divider)', fontSize: 14 }}>·</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{targetLang}</span>
              </>
            )}
            {(canAi || aiLoading) && (
              <span className="ai-badge">
                {aiLoading ? '↻ AI active' : '✦ AI active'}
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {isActive ? elapsed(sessionStart, now) : transcript.length > 0 ? `${transcript.length} lines` : ''}
          </span>
        </div>

        {/* Strip body — minimal, no card box */}
        <div style={{
          padding: '10px 2px',
          borderBottom: '1px solid var(--divider)',
          minHeight: 40,
          display: 'flex',
          alignItems: 'center',
        }}>
          {currentLine ? (
            <span style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6 }}>
              <MatrixText text={currentLine} color="var(--text-dim)" />
              <span className="doc-cursor" />
            </span>
          ) : isActive ? (
            <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
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
      </div>

      {/* ━━ AI STRUCTURING DIVIDER ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '18px 0',
        flexShrink: 0,
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {aiLoading && (
            <span style={{
              width: 10, height: 10,
              border: '1.5px solid rgba(88,213,201,0.20)',
              borderTopColor: 'var(--teal)',
              borderRadius: '50%',
              animation: 'spin 0.9s linear infinite',
              display: 'inline-block', flexShrink: 0,
            }} />
          )}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
            {aiLoading
              ? 'AI structuring'
              : canAi
              ? 'AI structured'
              : 'AI structures on 5+ lines'}
          </span>
        </div>
        <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
      </div>

      {/* ━━ DOCUMENT SURFACE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Document header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16, flexShrink: 0,
        }}>
          <span className="section-label">Document</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(canAi || (aiLoading && !canAi)) && (
              <button
                onClick={() => setAiMode(m => !m)}
                disabled={!canAi}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 12, fontWeight: 600,
                  padding: '4px 12px', borderRadius: 6,
                  border: `1px solid ${aiMode ? 'rgba(214,178,94,0.40)' : 'var(--border)'}`,
                  background: aiMode ? 'rgba(214,178,94,0.10)' : 'transparent',
                  color: aiMode ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: canAi ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  opacity: canAi ? 1 : 0.5,
                }}
              >
                {aiLoading && !canAi ? (
                  <>
                    <span style={{
                      width: 9, height: 9,
                      border: '1.5px solid rgba(214,178,94,0.3)',
                      borderTopColor: 'var(--accent)',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      display: 'inline-block',
                    }} />
                    AI…
                  </>
                ) : <>✦ AI Enhanced</>}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable document area */}
        <div style={{
          flex: 1, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          {/* The document itself — dominant surface */}
          <div style={{
            width: '100%',
            maxWidth: 820,
            background: 'var(--surface-1)',
            border: '1px solid var(--divider)',
            borderRadius: 'var(--radius-xl)',
            padding: '48px 64px',
          }}>
            {isEmpty ? (
              <div style={{
                height: 200,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 12, color: 'var(--text-muted)',
              }}>
                <span style={{ fontSize: 20, opacity: 0.18 }}>✦</span>
                <span style={{ fontSize: 14 }}>The document will appear here as you speak</span>
                <span style={{ fontSize: 12, opacity: 0.55 }}>Start a session to begin</span>
              </div>
            ) : aiMode && aiFormatted ? (
              <div className="doc-ai-update">
                <AiMarkdown text={aiFormatted} onWordClick={onWordClick} />
                {(aiFormattedAt !== undefined ? transcript.slice(aiFormattedAt) : []).map((line, i) => (
                  <p key={i} className="transcript-line" style={{
                    margin: '0 0 16px', fontSize: 18,
                    color: 'var(--text)', lineHeight: 1.75,
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
                    margin: '0 0 16px', fontSize: 18,
                    color: 'var(--text)', lineHeight: 1.75,
                  }}>
                    {renderWords(line.text, line.text, onWordClick)}
                  </p>
                ))}
                {isActive && !currentLine && <span className="doc-cursor" />}
              </div>
            )}
          </div>
          <div ref={bottomRef} style={{ height: 32 }} />
        </div>
      </div>

    </div>
  )
}

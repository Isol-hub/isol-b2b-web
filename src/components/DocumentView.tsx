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
  aiFormattedAt?: number   // transcript.length at the moment AI ran
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
        <h2 key={i} style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: '20px 0 8px', fontFamily: 'var(--font-doc)', letterSpacing: '-0.01em' }}>
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', margin: '16px 0 6px', fontFamily: 'var(--font-ui)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {line.slice(4)}
        </h3>
      )
    } else if (line.trim() === '') {
      elements.push(<br key={i} />)
    } else {
      elements.push(
        <span key={i} style={{ display: 'block', marginBottom: 2, color: 'var(--text)', fontSize: 20, lineHeight: 1.65 }}>
          {line}
        </span>
      )
    }
  }
  return <>{elements}</>
}

function WordSpan({ word, sentence, onWordClick }: { word: string; sentence: string; onWordClick: (w: string, s: string) => void }) {
  return (
    <span
      onClick={() => onWordClick(word.replace(/[^\w]/g, ''), sentence)}
      style={{ cursor: 'pointer', borderRadius: 3, transition: 'background 0.15s', padding: '0 1px' }}
      onMouseEnter={e => (e.target as HTMLElement).style.background = 'rgba(124,58,237,0.15)'}
      onMouseLeave={e => (e.target as HTMLElement).style.background = 'transparent'}
    >{word}</span>
  )
}

function renderWords(text: string, sentence: string, onWordClick?: (w: string, s: string) => void): React.ReactNode {
  if (!onWordClick) return text
  return text.split(' ').map((word, j) => (
    <span key={j}>
      {j > 0 && ' '}
      <WordSpan word={word} sentence={sentence} onWordClick={onWordClick} />
    </span>
  ))
}

export default function DocumentView({ transcript, currentLine, isActive, targetLang, aiFormatted, aiFormattedAt, aiLoading, onWordClick }: Props) {
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

  // Switch to AI mode automatically when first formatted text arrives
  useEffect(() => {
    if (aiFormatted && !aiMode) setAiMode(true)
  }, [aiFormatted])

  const isEmpty = transcript.length === 0 && !currentLine
  const canAi = !!(aiFormatted)

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 300,
      maxHeight: 'calc(100vh - 240px)',
      flex: 1,
    }}>
      {/* Status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-2)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isActive ? (
            <>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--live)',
                animation: 'livePulse 2s ease-in-out infinite',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--live)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live</span>
              <span style={{ fontSize: 11, color: 'var(--border)', margin: '0 2px' }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>{targetLang}</span>
            </>
          ) : (
            <>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--border)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {transcript.length > 0 ? 'Transcript' : 'Waiting'}
              </span>
              {transcript.length > 0 && (
                <>
                  <span style={{ fontSize: 11, color: 'var(--border)', margin: '0 2px' }}>·</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{targetLang}</span>
                </>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* AI mode toggle */}
          {(canAi || aiLoading) && (
            <button
              onClick={() => setAiMode(m => !m)}
              disabled={!canAi}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 600,
                padding: '3px 9px', borderRadius: 6,
                border: `1px solid ${aiMode ? 'rgba(124,58,237,0.45)' : 'var(--border)'}`,
                background: aiMode ? 'rgba(124,58,237,0.12)' : 'transparent',
                color: aiMode ? '#a78bfa' : 'var(--text-dim)',
                cursor: canAi ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
            >
              {aiLoading && !canAi ? (
                <>
                  <span style={{
                    width: 9, height: 9, border: '1.5px solid rgba(167,139,250,0.3)',
                    borderTopColor: '#a78bfa', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', display: 'inline-block',
                  }} />
                  AI…
                </>
              ) : (
                <>✦ AI</>
              )}
            </button>
          )}

          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {isActive ? elapsed(sessionStart, now) : transcript.length > 0 ? `${transcript.length} lines` : ''}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px 40px',
        fontFamily: 'var(--font-doc)',
        lineHeight: 1.65,
      }}>
        {isEmpty ? (
          <div style={{
            height: 220, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            color: 'var(--text-muted)', fontFamily: 'var(--font-ui)',
          }}>
            <span style={{ fontSize: 24, opacity: 0.4 }}>✦</span>
            <span style={{ fontSize: 13 }}>The session will appear here…</span>
          </div>
        ) : aiMode && aiFormatted ? (
          /* AI Enhanced view */
          <div>
            <AiMarkdown text={aiFormatted} />

            {/* Lines that arrived after the last AI formatting run */}
            {(aiFormattedAt !== undefined ? transcript.slice(aiFormattedAt) : []).map((line, i) => (
              <span key={i} className="transcript-line" style={{ display: 'block', marginTop: 4, fontSize: 20, color: 'var(--text)', lineHeight: 1.65 }}>
                {renderWords(line.text, line.text, onWordClick)}
              </span>
            ))}

            {/* Live partial (draft) */}
            {currentLine && (
              <span style={{ display: 'block', marginTop: 4, color: 'var(--text-dim)', fontSize: 20 }}>
                <MatrixText text={currentLine} color="var(--text-dim)" />
                <span className="doc-cursor">|</span>
              </span>
            )}
            {isActive && !currentLine && <span className="doc-cursor">|</span>}
          </div>
        ) : (
          /* Raw word-by-word view */
          <p style={{ margin: 0, fontSize: 20, color: 'var(--text)', lineHeight: 1.65 }}>
            {transcript.map((line, i) => (
              <span key={i} className="transcript-line" style={{ display: 'inline' }}>
                {renderWords(line.text, line.text, onWordClick)}
                {' '}
              </span>
            ))}

            {/* Live current line (draft color) */}
            {currentLine && (
              <span style={{ color: 'var(--text-dim)' }}>
                <MatrixText text={currentLine} color="var(--text-dim)" />
                <span className="doc-cursor">|</span>
              </span>
            )}

            {/* Cursor when active but no current line */}
            {isActive && !currentLine && (
              <span className="doc-cursor">|</span>
            )}
          </p>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { getToken } from '../lib/auth'

interface Props {
  word: string
  sentences: string[]
  currentSentence: string
  targetLang?: string
  onClose: () => void
  isSaved?: boolean
  onSave?: (word: string, note?: string) => void
  savedCount?: number
  onShowAll?: () => void
}

interface AiDef {
  definition: string
  context: string
  register: string
}

const REGISTER_COLOR: Record<string, string> = {
  formal: 'var(--teal)',
  informal: '#FCA5A5',
  technical: 'var(--accent)',
  neutral: 'var(--text-muted)',
}

export default function GlossaryPanel({ word, sentences, currentSentence, targetLang = 'en', onClose, isSaved, onSave, savedCount, onShowAll }: Props) {
  // pass AI definition as note when saving so the list can show it without re-fetching
  const [aiDef, setAiDef] = useState<AiDef | null>(null)
  const [aiLoading, setAiLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setAiDef(null)
    setAiLoading(true)

    fetch('/api/ai/define', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken() ?? ''}` },
      body: JSON.stringify({ word, sentence: currentSentence, targetLang }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: AiDef | null) => {
        if (!cancelled && data?.definition) setAiDef(data)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setAiLoading(false) })

    return () => { cancelled = true }
  }, [word, currentSentence])

  function highlight(text: string, w: string) {
    const re = new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(re)
    return parts.map((p, i) =>
      re.test(p)
        ? <mark key={i} style={{
            background: 'rgba(99,102,241,0.10)',
            color: 'var(--accent)',
            borderRadius: 3,
            padding: '0 2px',
          }}>{p}</mark>
        : p
    )
  }

  const otherSentences = sentences.filter(s => s !== currentSentence).slice(-3)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      animation: 'glossarySlideIn 0.2s ease-out',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid var(--divider)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
          }}>Context</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{word}</span>
          {aiDef && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: REGISTER_COLOR[aiDef.register] ?? REGISTER_COLOR.neutral,
              background: 'rgba(0,0,0,0.04)',
              borderRadius: 5, padding: '2px 6px',
            }}>{aiDef.register}</span>
          )}
          {/* Save to workspace glossary — only shown after AI definition loads */}
          {onSave && !aiLoading && (
            <button
              onClick={() => !isSaved && onSave(word, aiDef?.definition ?? undefined)}
              disabled={isSaved}
              style={{
                background: isSaved ? 'rgba(34,197,94,0.08)' : 'rgba(99,102,241,0.08)',
                border: `1px solid ${isSaved ? 'rgba(34,197,94,0.20)' : 'rgba(99,102,241,0.20)'}`,
                color: isSaved ? 'var(--live)' : 'var(--accent)',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                padding: '2px 8px', borderRadius: 5,
                cursor: isSaved ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {isSaved ? '✓ Saved' : '+ Save'}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', color: 'var(--text-muted)',
            fontSize: 18, padding: '2px 6px', borderRadius: 4,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--text)'}
          onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--text-muted)'}
        >×</button>
      </div>

      {/* Scrollable content */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '20px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>

        {/* AI definition */}
        {aiLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
            <span style={{
              width: 14, height: 14,
              border: '1.5px solid rgba(99,102,241,0.15)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Looking up definition…</span>
          </div>
        ) : aiDef ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'var(--surface-2)',
              borderRadius: 10,
              padding: '14px 16px',
              border: '1px solid var(--divider)',
            }}>
              <p style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
                textTransform: 'uppercase', color: 'var(--text-muted)',
                marginBottom: 8,
              }}>Definition</p>
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.65 }}>
                {aiDef.definition}
              </p>
            </div>

            {aiDef.context && (
              <div style={{
                background: 'rgba(6,182,212,0.05)',
                borderRadius: 10,
                padding: '14px 16px',
                border: '1px solid rgba(6,182,212,0.12)',
              }}>
                <p style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
                  textTransform: 'uppercase', color: 'var(--text-muted)',
                  marginBottom: 8,
                }}>In this context</p>
                <p style={{ fontSize: 14, color: 'var(--teal)', lineHeight: 1.65, fontStyle: 'italic' }}>
                  {aiDef.context}
                </p>
              </div>
            )}
          </div>
        ) : null}

        {/* Sentence context */}
        {currentSentence && (
          <div>
            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
              textTransform: 'uppercase', color: 'var(--text-muted)',
              marginBottom: 10,
            }}>Sentence</p>
            <p style={{
              fontSize: 13, color: 'var(--text-dim)',
              lineHeight: 1.65,
              padding: '12px 14px',
              background: 'var(--surface)',
              borderRadius: 8,
              border: '1px solid var(--divider)',
            }}>
              "{highlight(currentSentence, word)}"
            </p>
          </div>
        )}

        {/* Other occurrences */}
        {otherSentences.length > 0 && (
          <div>
            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
              textTransform: 'uppercase', color: 'var(--text-muted)',
              marginBottom: 10,
            }}>Also appeared in</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {otherSentences.map((s, i) => (
                <p key={i} style={{
                  fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55,
                  borderLeft: '2px solid var(--border-accent)',
                  paddingLeft: 10, margin: 0,
                }}>
                  "{highlight(s, word)}"
                </p>
              ))}
            </div>
          </div>
        )}

        {sentences.length === 1 && !aiLoading && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            First occurrence in this session.
          </p>
        )}

        {/* Link to full workspace glossary */}
        {onShowAll && savedCount !== undefined && savedCount > 0 && (
          <button
            onClick={onShowAll}
            style={{
              background: 'none', border: 'none',
              fontSize: 12, color: 'var(--accent)',
              padding: 0, cursor: 'pointer',
              textAlign: 'left',
              transition: 'opacity 0.15s',
              marginTop: 4,
            }}
            onMouseEnter={e => (e.target as HTMLElement).style.opacity = '0.7'}
            onMouseLeave={e => (e.target as HTMLElement).style.opacity = '1'}
          >
            ← See all {savedCount} saved terms
          </button>
        )}
      </div>
    </div>
  )
}

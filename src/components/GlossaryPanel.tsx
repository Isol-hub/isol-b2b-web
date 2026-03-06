import { useEffect, useState } from 'react'

interface Props {
  word: string
  sentences: string[]   // all sentences from transcript containing this word
  currentSentence: string
  onClose: () => void
}

interface AiDef {
  definition: string
  context: string
  register: string
}

export default function GlossaryPanel({ word, sentences, currentSentence, onClose }: Props) {
  const [aiDef, setAiDef] = useState<AiDef | null>(null)
  const [aiLoading, setAiLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setAiDef(null)
    setAiLoading(true)

    fetch('/api/ai/define', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, sentence: currentSentence }),
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
        ? <mark key={i} style={{ background: 'rgba(167,139,250,0.25)', color: '#c4b5fd', borderRadius: 3, padding: '0 2px' }}>{p}</mark>
        : p
    )
  }

  const REGISTER_COLOR: Record<string, string> = {
    formal: '#60a5fa',
    informal: '#fb923c',
    technical: '#a78bfa',
    neutral: 'rgba(238,242,255,0.35)',
  }

  const otherSentences = sentences.filter(s => s !== currentSentence).slice(-3)

  return (
    <div style={{
      position: 'fixed', bottom: 32, right: 32, zIndex: 9000,
      width: 360,
      background: 'rgba(7,7,26,0.94)',
      border: '1px solid rgba(167,139,250,0.25)',
      borderRadius: 16,
      backdropFilter: 'blur(32px)',
      boxShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 32px rgba(124,58,237,0.12)',
      overflow: 'hidden',
      animation: 'glossarySlideIn 0.25s ease-out',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(124,58,237,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'rgba(238,242,255,0.40)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Glossary</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#c4b5fd' }}>{word}</span>
          {aiDef && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: REGISTER_COLOR[aiDef.register] ?? REGISTER_COLOR.neutral,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 6, padding: '2px 7px',
            }}>{aiDef.register}</span>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', color: 'rgba(238,242,255,0.40)', fontSize: 18, padding: '0 4px', borderRadius: 6 }}>×</button>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* AI definition */}
        {aiLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 14, height: 14, border: '2px solid rgba(167,139,250,0.3)',
              borderTopColor: '#a78bfa', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, color: 'rgba(238,242,255,0.35)' }}>Looking up definition…</span>
          </div>
        ) : aiDef ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(238,242,255,0.35)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                Definition
              </p>
              <p style={{ fontSize: 13, color: 'rgba(238,242,255,0.85)', lineHeight: 1.65 }}>
                {aiDef.definition}
              </p>
            </div>
            {aiDef.context && (
              <div>
                <p style={{ fontSize: 10, color: 'rgba(238,242,255,0.35)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                  In this context
                </p>
                <p style={{ fontSize: 13, color: 'rgba(167,139,250,0.85)', lineHeight: 1.65, fontStyle: 'italic' }}>
                  {aiDef.context}
                </p>
              </div>
            )}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
        ) : null}

        {/* Current context */}
        <div>
          <p style={{ fontSize: 10, color: 'rgba(238,242,255,0.35)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Sentence context
          </p>
          <p style={{ fontSize: 13, color: 'rgba(238,242,255,0.80)', lineHeight: 1.6, fontFamily: "'Georgia', serif" }}>
            "{highlight(currentSentence, word)}"
          </p>
        </div>

        {/* Other occurrences */}
        {otherSentences.length > 0 && (
          <div>
            <p style={{ fontSize: 10, color: 'rgba(238,242,255,0.35)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Also appeared in
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {otherSentences.map((s, i) => (
                <p key={i} style={{
                  fontSize: 12, color: 'rgba(238,242,255,0.50)', lineHeight: 1.5,
                  fontFamily: "'Georgia', serif",
                  borderLeft: '2px solid rgba(124,58,237,0.3)',
                  paddingLeft: 10, margin: 0,
                }}>
                  "{highlight(s, word)}"
                </p>
              ))}
            </div>
          </div>
        )}

        {sentences.length === 1 && !aiLoading && (
          <p style={{ fontSize: 12, color: 'rgba(238,242,255,0.30)', fontStyle: 'italic' }}>
            First occurrence in this session.
          </p>
        )}
      </div>
    </div>
  )
}

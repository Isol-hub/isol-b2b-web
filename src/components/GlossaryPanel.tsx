import { useEffect, useState } from 'react'

interface Props {
  word: string
  sentences: string[]
  currentSentence: string
  targetLang?: string
  onClose: () => void
}

interface AiDef {
  definition: string
  context: string
  register: string
}

export default function GlossaryPanel({ word, sentences, currentSentence, targetLang = 'en', onClose }: Props) {
  const [aiDef, setAiDef] = useState<AiDef | null>(null)
  const [aiLoading, setAiLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setAiDef(null)
    setAiLoading(true)

    fetch('/api/ai/define', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
        ? <mark key={i} style={{ background: 'rgba(124,58,237,0.20)', color: '#a78bfa', borderRadius: 3, padding: '0 2px' }}>{p}</mark>
        : p
    )
  }

  const REGISTER_COLOR: Record<string, string> = {
    formal: '#60a5fa',
    informal: '#fb923c',
    technical: '#a78bfa',
    neutral: 'var(--text-dim)',
  }

  const otherSentences = sentences.filter(s => s !== currentSentence).slice(-3)

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9000,
      width: 340,
      background: 'var(--surface)',
      border: '1px solid var(--border-accent)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
      overflow: 'hidden',
      animation: 'glossarySlideIn 0.2s ease-out',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(124,58,237,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Glossary</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{word}</span>
          {aiDef && (
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
              color: REGISTER_COLOR[aiDef.register] ?? REGISTER_COLOR.neutral,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 5, padding: '2px 6px',
            }}>{aiDef.register}</span>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', color: 'var(--text-dim)', fontSize: 18, padding: '0 4px', borderRadius: 4 }}>×</button>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* AI definition */}
        {aiLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 13, height: 13, border: '1.5px solid rgba(124,58,237,0.25)',
              borderTopColor: 'var(--accent)', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Looking up definition…</span>
          </div>
        ) : aiDef ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <p style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                Definition
              </p>
              <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                {aiDef.definition}
              </p>
            </div>
            {aiDef.context && (
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                  In this context
                </p>
                <p style={{ fontSize: 13, color: '#a78bfa', lineHeight: 1.6, fontStyle: 'italic' }}>
                  {aiDef.context}
                </p>
              </div>
            )}
            <div style={{ height: 1, background: 'var(--border)' }} />
          </div>
        ) : null}

        {/* Current context */}
        <div>
          <p style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Sentence context
          </p>
          <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, fontFamily: 'var(--font-doc)' }}>
            "{highlight(currentSentence, word)}"
          </p>
        </div>

        {/* Other occurrences */}
        {otherSentences.length > 0 && (
          <div>
            <p style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Also appeared in
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {otherSentences.map((s, i) => (
                <p key={i} style={{
                  fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5,
                  fontFamily: 'var(--font-doc)',
                  borderLeft: '2px solid rgba(124,58,237,0.25)',
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
      </div>
    </div>
  )
}

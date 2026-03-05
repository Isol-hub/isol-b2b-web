interface Props {
  word: string
  sentences: string[]   // all sentences from transcript containing this word
  currentSentence: string
  onClose: () => void
}

export default function GlossaryPanel({ word, sentences, currentSentence, onClose }: Props) {
  function highlight(text: string, w: string) {
    const re = new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(re)
    return parts.map((p, i) =>
      re.test(p)
        ? <mark key={i} style={{ background: 'rgba(167,139,250,0.25)', color: '#c4b5fd', borderRadius: 3, padding: '0 2px' }}>{p}</mark>
        : p
    )
  }

  const otherSentences = sentences.filter(s => s !== currentSentence).slice(-3)

  return (
    <div style={{
      position: 'fixed', bottom: 32, right: 32, zIndex: 9000,
      width: 340,
      background: 'rgba(7,7,26,0.92)',
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
        </div>
        <button onClick={onClose} style={{ background: 'none', color: 'rgba(238,242,255,0.40)', fontSize: 18, padding: '0 4px', borderRadius: 6 }}>×</button>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Current context */}
        <div>
          <p style={{ fontSize: 10, color: 'rgba(238,242,255,0.35)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Current context
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

        {sentences.length === 1 && (
          <p style={{ fontSize: 12, color: 'rgba(238,242,255,0.30)', fontStyle: 'italic' }}>
            First occurrence in this session.
          </p>
        )}
      </div>
    </div>
  )
}

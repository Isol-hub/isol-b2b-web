import { useRef, useState } from 'react'

export type SpeakerState = 'confirmed' | 'tentative' | 'overlap' | 'uncertain'

interface Props {
  speakerId: string | null
  state: SpeakerState
  label: string       // 'Voice 1', 'Marco', etc. — already resolved
  color: string
  onRename?: (label: string) => void   // undefined = read-only (archived session)
}

export default function SpeakerLabel({ speakerId, state, label, color, onRename }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  if (state === 'uncertain' || (!speakerId && state !== 'overlap')) return null

  if (state === 'overlap') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        marginBottom: 6, marginTop: 16,
        fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic',
        letterSpacing: '0.03em',
      }}>
        ⟨overlap⟩
      </div>
    )
  }

  const isTentative = state === 'tentative'
  const displayLabel = isTentative ? `~ ${label}` : label

  const commit = (value: string) => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== label) onRename?.(trimmed)
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6, marginTop: 16 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit(draft) }
            if (e.key === 'Escape') setEditing(false)
          }}
          style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
            border: 'none', borderBottom: `1.5px solid ${color}`,
            background: 'transparent', color: 'var(--text)',
            outline: 'none', width: 120, padding: '1px 0',
            fontFamily: 'inherit',
          }}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        marginBottom: 6, marginTop: 16,
        cursor: onRename ? 'pointer' : 'default',
        userSelect: 'none',
      }}
      onClick={() => {
        if (!onRename) return
        setDraft(label)
        setEditing(true)
        setTimeout(() => inputRef.current?.select(), 0)
      }}
      title={onRename ? 'Click to rename' : undefined}
    >
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: color, flexShrink: 0,
        opacity: isTentative ? 0.55 : 1,
      }} />
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: isTentative ? 'var(--text-muted)' : color,
        opacity: isTentative ? 0.75 : 1,
      }}>
        {displayLabel}
      </span>
      {onRename && (
        <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0, transition: 'opacity 0.12s' }}
          className="speaker-edit-hint">✎</span>
      )}
    </div>
  )
}

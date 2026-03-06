import { useState, useCallback } from 'react'

interface Props {
  sessionId: string
  workspaceSlug: string
}

function roomCode(sessionId: string): string {
  const raw = sessionId.replace(/-/g, '').slice(-8).toUpperCase()
  return `${raw.slice(0, 4)}-${raw.slice(4)}`
}

export default function RoomPanel({ sessionId, workspaceSlug }: Props) {
  const [copied, setCopied] = useState(false)

  const shareUrl = `${window.location.origin}/join/${workspaceSlug}/${sessionId}`
  const code = roomCode(sessionId)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [shareUrl])

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--live)',
          animation: 'roomPulse 2s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--live)' }}>Live Room</span>
        <span style={{
          marginLeft: 'auto',
          fontFamily: 'monospace', fontSize: 15, fontWeight: 700, letterSpacing: '0.12em',
          color: 'var(--text)',
        }}>
          {code}
        </span>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12, lineHeight: 1.5 }}>
        Share this link with participants. They choose their own language.
      </p>

      {/* URL row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{
          flex: 1,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '8px 12px',
          fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {shareUrl}
        </div>
        <button
          onClick={handleCopy}
          style={{
            flexShrink: 0,
            background: copied ? 'rgba(16,185,129,0.12)' : 'var(--accent)',
            color: copied ? 'var(--live)' : '#fff',
            fontWeight: 600, fontSize: 12,
            padding: '8px 14px', borderRadius: 'var(--radius)', border: 'none',
            cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'all 0.2s',
          }}
        >
          {copied ? '✓ Copied' : 'Copy link'}
        </button>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        {['Choose language', 'See live captions', 'Export'].map((step, i) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              width: 16, height: 16, borderRadius: '50%',
              background: 'rgba(124,58,237,0.20)',
              border: '1px solid rgba(124,58,237,0.35)',
              fontSize: 9, fontWeight: 700, color: '#a78bfa',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{i + 1}</span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

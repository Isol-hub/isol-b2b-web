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
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--divider)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--live)',
          animation: 'roomPulse 2s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 11, fontWeight: 700, color: 'var(--live)',
          letterSpacing: '0.07em', textTransform: 'uppercase', flex: 1,
        }}>Active Room</span>
        <span style={{
          fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
          letterSpacing: '0.10em', color: 'var(--text)',
        }}>{code}</span>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Share with participants. Each person chooses their language.
        </p>

        {/* URL row */}
        <div style={{
          display: 'flex',
          gap: 6,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}>
          <div style={{
            flex: 1,
            padding: '8px 10px',
            fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {shareUrl}
          </div>
          <button
            onClick={handleCopy}
            style={{
              flexShrink: 0,
              background: copied ? 'rgba(16,185,129,0.12)' : 'rgba(37,99,235,0.15)',
              color: copied ? 'var(--live)' : '#93C5FD',
              fontWeight: 600, fontSize: 12,
              padding: '0 14px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'

interface Props {
  sessionId: string
  workspaceSlug: string
}

function roomCode(sessionId: string): string {
  // Take last 8 hex chars of UUID and format as XXXX-XXXX
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
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(167,139,250,0.22)',
      borderRadius: 16,
      padding: '20px 24px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 0 32px rgba(124,58,237,0.10)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', flexShrink: 0, animation: 'roomPulse 2s infinite' }} />
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4ade80' }}>Live Room</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 18, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text)', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
          {code}
        </span>
      </div>

      <p style={{ fontSize: 12, color: 'rgba(238,242,255,0.45)', marginBottom: 12, lineHeight: 1.5 }}>
        Share this link with participants. Each viewer chooses their own language and sees live captions in real-time.
      </p>

      {/* URL row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
          flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '9px 14px',
          fontSize: 12, color: 'rgba(238,242,255,0.55)', fontFamily: 'monospace',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {shareUrl}
        </div>
        <button
          onClick={handleCopy}
          style={{
            flexShrink: 0,
            background: copied ? 'rgba(74,222,128,0.15)' : 'linear-gradient(135deg,#7c3aed,#0ea5e9)',
            color: copied ? '#4ade80' : '#fff',
            fontWeight: 600, fontSize: 13,
            padding: '9px 18px', borderRadius: 10, border: 'none',
            cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'all 0.2s',
            boxShadow: copied ? 'none' : '0 0 16px rgba(124,58,237,0.30)',
          }}
        >
          {copied ? '✓ Copied' : 'Copy link'}
        </button>
      </div>

      {/* Viewer instruction */}
      <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
        {['Choose language', 'See live captions', 'Download transcript'].map((step, i) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(124,58,237,0.3)', border: '1px solid rgba(124,58,237,0.5)', fontSize: 10, fontWeight: 700, color: '#c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {i + 1}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(238,242,255,0.45)' }}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

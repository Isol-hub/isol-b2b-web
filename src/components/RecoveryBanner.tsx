interface DraftInfo {
  lines: Array<{ text: string }>
  started_at: number   // unix seconds
  target_lang: string
}

interface Props {
  draft: DraftInfo
  onRestore: () => void
  onDiscard: () => void
}

function timeAgo(ts: number): string {
  const diffMs = Date.now() - ts * 1000
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ago`
}

export default function RecoveryBanner({ draft, onRestore, onDiscard }: Props) {
  return (
    <div style={{
      position: 'fixed', top: 'var(--header-h)', left: 0, right: 0,
      zIndex: 9000,
      background: 'rgba(234, 179, 8, 0.98)',
      borderBottom: '1px solid rgba(161,120,0,0.3)',
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#422006' }}>
          Unsaved session recovered
        </span>
        <span style={{ fontSize: 12, color: '#713f12', marginLeft: 8 }}>
          {draft.lines.length} lines · started {timeAgo(draft.started_at)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={onRestore}
          style={{
            background: '#422006', color: '#fef9c3', border: 'none',
            borderRadius: 7, fontSize: 12, fontWeight: 700,
            padding: '6px 14px', cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Restore
        </button>
        <button
          onClick={onDiscard}
          style={{
            background: 'rgba(0,0,0,0.12)', color: '#422006', border: 'none',
            borderRadius: 7, fontSize: 12, fontWeight: 600,
            padding: '6px 14px', cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Discard
        </button>
      </div>
    </div>
  )
}

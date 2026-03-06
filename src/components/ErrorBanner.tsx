interface Props { message: string; onDismiss: () => void }

export default function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <div style={{
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.22)',
      borderRadius: 'var(--radius)',
      padding: '12px 16px',
      display: 'flex', alignItems: 'flex-start', gap: 10,
      fontSize: 13, color: 'var(--red)',
      flexShrink: 0,
    }}>
      <span style={{ marginTop: 1, flexShrink: 0 }}>⚠</span>
      <span style={{ flex: 1, lineHeight: 1.5 }}>{message}</span>
      <button
        onClick={onDismiss}
        style={{ background: 'none', color: 'rgba(239,68,68,0.5)', fontSize: 16, padding: '0 2px', flexShrink: 0 }}
      >×</button>
    </div>
  )
}

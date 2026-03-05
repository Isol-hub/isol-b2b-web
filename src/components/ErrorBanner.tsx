interface Props { message: string; onDismiss: () => void }

export default function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <div style={{
      background: 'rgba(248,113,113,0.12)',
      border: '1px solid rgba(248,113,113,0.30)',
      borderRadius: 10,
      padding: '12px 16px',
      display: 'flex', alignItems: 'flex-start', gap: 10,
      fontSize: 14, color: 'var(--red)',
    }}>
      <span style={{ marginTop: 1 }}>⚠</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onDismiss} style={{ background: 'none', color: 'rgba(248,113,113,0.6)', fontSize: 16, padding: '0 2px' }}>×</button>
    </div>
  )
}

import type { WsState } from '../hooks/useWebSocket'
import type { AudioCaptureState } from '../hooks/useAudioCapture'

interface Props {
  wsState: WsState
  audioState: AudioCaptureState
}

export default function StatusBadge({ wsState, audioState }: Props) {
  const isActive = audioState === 'active' && wsState === 'connected'
  const isReconnecting = wsState === 'reconnecting'
  const isError = wsState === 'error' || audioState === 'error'

  const color = isError ? 'var(--red)'
    : isReconnecting ? 'var(--orange)'
    : isActive ? 'var(--live)'
    : 'rgba(255,255,255,0.2)'

  const label = isError ? 'Error'
    : isReconnecting ? 'Reconnecting…'
    : wsState === 'connecting' ? 'Connecting…'
    : audioState === 'requesting' ? 'Requesting…'
    : isActive ? 'Listening'
    : 'Ready'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{
        width: 7, height: 7,
        borderRadius: '50%',
        background: color,
        transition: 'background 0.3s',
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{label}</span>
    </div>
  )
}

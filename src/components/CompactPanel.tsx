import { useRef, useState, useCallback } from 'react'
import SubtitleView from './SubtitleView'
import type { WsState } from '../hooks/useWebSocket'
import type { AudioCaptureState } from '../hooks/useAudioCapture'

interface Props {
  current: string
  previous: string
  wsState: WsState
  audioState: AudioCaptureState
  onClose: () => void
}

export default function CompactPanel({ current, previous, wsState, audioState, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const [pos, setPos] = useState({ left: 40, top: 40 })
  const [size, setSize] = useState({ width: 500, height: 150 })

  const isActive = audioState === 'active' && wsState === 'connected'
  const isError = wsState === 'error' || audioState === 'error'
  const dotColor = isError ? 'var(--red)'
    : wsState === 'reconnecting' ? 'var(--orange)'
    : isActive ? 'var(--green)'
    : 'rgba(238,242,255,0.3)'

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!panelRef.current) return
    dragStart.current = { x: e.clientX, y: e.clientY, left: pos.left, top: pos.top }
    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return
      setPos({
        left: Math.max(0, dragStart.current.left + ev.clientX - dragStart.current.x),
        top:  Math.max(0, dragStart.current.top  + ev.clientY - dragStart.current.y),
      })
    }
    const onUp = () => {
      dragStart.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [pos])

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: pos.left, top: pos.top,
        width: size.width, height: size.height,
        background: 'rgba(7,7,26,0.82)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(167,139,250,0.18)',
        borderRadius: 16,
        overflow: 'hidden',
        zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 48px rgba(0,0,0,0.6), 0 0 32px rgba(124,58,237,0.10)',
        resize: 'both', minWidth: 280, minHeight: 100,
      }}
      onMouseMove={() => {
        const r = panelRef.current?.getBoundingClientRect()
        if (r) setSize({ width: r.width, height: r.height })
      }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', cursor: 'grab',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(238,242,255,0.35)', fontWeight: 700, letterSpacing: '0.1em' }}>ISOL</span>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, boxShadow: isActive ? `0 0 6px ${dotColor}` : 'none', transition: 'all 0.3s' }} />
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', color: 'rgba(238,242,255,0.35)', fontSize: 16, lineHeight: 1, padding: '2px 6px', borderRadius: 4, transition: 'color 0.15s' }}
          onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--text)'}
          onMouseLeave={e => (e.target as HTMLElement).style.color = 'rgba(238,242,255,0.35)'}
        >×</button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <SubtitleView current={current} previous={previous} compact />
      </div>
    </div>
  )
}

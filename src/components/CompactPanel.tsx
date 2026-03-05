import { useRef, useState, useCallback } from 'react'
import SubtitleView from './SubtitleView'
import StatusBadge from './StatusBadge'
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
  const [size, setSize] = useState({ width: 480, height: 140 })

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
        background: 'rgba(10,15,26,0.92)',
        backdropFilter: 'blur(18px)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 14,
        overflow: 'hidden',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        resize: 'both',
        minWidth: 280,
        minHeight: 100,
      }}
      onMouseMove={e => {
        if ((e.target as HTMLElement).dataset.resize) return
        const r = panelRef.current?.getBoundingClientRect()
        if (r) setSize({ width: r.width, height: r.height })
      }}
    >
      {/* Header drag handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px',
          cursor: 'grab',
          background: 'rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(249,250,251,0.40)', fontWeight: 600, letterSpacing: '0.08em' }}>ISOL</span>
          <StatusBadge wsState={wsState} audioState={audioState} />
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', color: 'rgba(249,250,251,0.40)', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}
        >x</button>
      </div>
      {/* Subtitles */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <SubtitleView current={current} previous={previous} compact />
      </div>
    </div>
  )
}

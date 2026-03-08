import { useRef, useState } from 'react'

export interface TimelineSegment {
  index: number
  offsetMs: number
  text: string
  hasComment?: boolean
}

interface Props {
  segments: TimelineSegment[]
  sessionStartMs: number
  sessionEndMs?: number  // undefined = live
  onJumpTo: (index: number) => void
}

function fmtMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function SessionTimeline({ segments, sessionStartMs, sessionEndMs, onJumpTo }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const isLive = sessionEndMs === undefined
  const durationMs = isLive
    ? (Date.now() - sessionStartMs)
    : (sessionEndMs - sessionStartMs)

  if (durationMs <= 0 || segments.length === 0) return null

  const getPos = (offsetMs: number): number =>
    Math.min(Math.max(offsetMs / durationMs, 0), 1) * 100

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = (e.clientX - rect.left) / rect.width
    const targetMs = ratio * durationMs
    let nearest = segments[0]
    let minDist = Infinity
    for (const seg of segments) {
      const dist = Math.abs(seg.offsetMs - targetMs)
      if (dist < minDist) { minDist = dist; nearest = seg }
    }
    onJumpTo(nearest.index)
  }

  const hoveredSeg = hoveredIndex !== null ? segments.find(s => s.index === hoveredIndex) ?? null : null

  return (
    <div style={{ padding: '8px 24px 18px', position: 'relative', userSelect: 'none' }}>

      {/* Track */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        style={{
          position: 'relative',
          height: 3,
          background: 'var(--divider)',
          borderRadius: 4,
          cursor: 'pointer',
          overflow: 'visible',
        }}
      >
        {/* Filled portion */}
        {isLive ? (
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${getPos(Date.now() - sessionStartMs)}%`,
            background: 'linear-gradient(90deg, var(--accent), rgba(99,102,241,0.4))',
            borderRadius: 4,
            pointerEvents: 'none',
          }} />
        ) : (
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%', width: '100%',
            background: 'var(--accent)', opacity: 0.25, borderRadius: 4,
            pointerEvents: 'none',
          }} />
        )}

        {/* Segment markers */}
        {segments.map(seg => {
          const pos = getPos(seg.offsetMs)
          const isHovered = seg.index === hoveredIndex
          return (
            <div
              key={seg.index}
              style={{
                position: 'absolute',
                left: `${pos}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
              }}
            >
              {/* Tooltip */}
              {isHovered && hoveredSeg && (
                <div style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--canvas)',
                  border: '1px solid var(--divider)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  maxWidth: 220,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtMs(hoveredSeg.offsetMs)}
                  </span>
                  {' '}
                  <span style={{ color: 'var(--text-muted)' }}>
                    {hoveredSeg.text.length > 48 ? hoveredSeg.text.slice(0, 48) + '…' : hoveredSeg.text}
                  </span>
                </div>
              )}

              {/* Dot */}
              <div
                onClick={e => { e.stopPropagation(); onJumpTo(seg.index) }}
                onMouseEnter={() => setHoveredIndex(seg.index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  width: isHovered ? 9 : 6,
                  height: isHovered ? 9 : 6,
                  borderRadius: '50%',
                  background: seg.hasComment ? '#D97706' : 'var(--accent)',
                  cursor: 'pointer',
                  transition: 'width 0.12s, height 0.12s',
                  boxShadow: isHovered ? '0 0 0 2px rgba(99,102,241,0.20)' : 'none',
                }}
              />
            </div>
          )
        })}

        {/* Live pulse at the leading edge */}
        {isLive && (
          <div style={{
            position: 'absolute',
            left: `${getPos(Date.now() - sessionStartMs)}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--live)',
            animation: 'livePulse 1.5s ease-in-out infinite',
            pointerEvents: 'none',
            zIndex: 3,
          }} />
        )}
      </div>

      {/* Time labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>0:00</span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {isLive ? 'live' : fmtMs(durationMs)}
        </span>
      </div>
    </div>
  )
}

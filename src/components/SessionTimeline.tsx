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

export default function SessionTimeline({ segments, sessionEndMs, onJumpTo }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const isLive = sessionEndMs === undefined
  const n = segments.length

  // Need at least 3 segments to be worth showing
  if (n < 3) return null

  // For live sessions: position by index (stable between renders).
  // For archived sessions: position by offsetMs / totalDuration (accurate timestamps).
  const getPos = (seg: TimelineSegment): number => {
    if (isLive) {
      return n <= 1 ? 0 : (seg.index / (n - 1)) * 100
    }
    const durationMs = sessionEndMs - segments[0].offsetMs
    if (durationMs <= 0) return 0
    return Math.min(Math.max((seg.offsetMs - segments[0].offsetMs) / durationMs, 0), 1) * 100
  }

  const handleTrackClick = (e: { clientX: number }) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const ratio = (e.clientX - rect.left) / rect.width
    // Find the segment nearest to the clicked position
    const targetIdx = isLive
      ? Math.round(ratio * (n - 1))
      : null
    if (isLive && targetIdx !== null) {
      const clamped = Math.max(0, Math.min(n - 1, targetIdx))
      onJumpTo(segments[clamped].index)
      return
    }
    // Archived: find nearest by position ratio
    let nearest = segments[0]
    let minDist = Infinity
    for (const seg of segments) {
      const dist = Math.abs(getPos(seg) / 100 - ratio)
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
        {/* Fill: accent bar across the whole track */}
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%', width: '100%',
          background: isLive
            ? 'linear-gradient(90deg, rgba(99,102,241,0.35), rgba(99,102,241,0.12))'
            : 'var(--accent)',
          opacity: isLive ? 1 : 0.25,
          borderRadius: 4,
          pointerEvents: 'none',
        }} />

        {/* Segment markers */}
        {segments.map(seg => {
          const pos = getPos(seg)
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
                // Large invisible click area so dots are easy to hit
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={e => { e.stopPropagation(); onJumpTo(seg.index) }}
              onMouseEnter={() => setHoveredIndex(seg.index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Tooltip */}
              {isHovered && hoveredSeg && (
                <div style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 4px)',
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

              {/* Visual dot */}
              <div style={{
                width: isHovered ? 9 : 6,
                height: isHovered ? 9 : 6,
                borderRadius: '50%',
                background: seg.hasComment ? '#D97706' : 'var(--accent)',
                transition: 'width 0.12s, height 0.12s',
                boxShadow: isHovered ? '0 0 0 3px rgba(99,102,241,0.18)' : 'none',
                flexShrink: 0,
              }} />
            </div>
          )
        })}
      </div>

      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {fmtMs(segments[0].offsetMs)}
        </span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {isLive
            ? `${n} lines`
            : fmtMs(segments[n - 1].offsetMs)}
        </span>
      </div>
    </div>
  )
}

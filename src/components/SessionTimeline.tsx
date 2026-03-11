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
  sessionEndMs?: number
  onJumpTo: (index: number) => void
}

function fmtMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const BUCKETS = 48

export default function SessionTimeline({ segments, sessionEndMs, onJumpTo }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [scrubFrac, setScrubFrac] = useState<number | null>(null)
  const [hoverFrac, setHoverFrac] = useState<number | null>(null)

  const isLive = sessionEndMs === undefined
  const n = segments.length
  if (n < 3) return null

  const startOffset = segments[0].offsetMs
  const endOffset = isLive ? segments[n - 1].offsetMs : (sessionEndMs! - /* sessionStartMs offset already baked in */ 0)
  const totalMs = isLive
    ? Math.max(segments[n - 1].offsetMs - startOffset, 1)
    : Math.max(segments[n - 1].offsetMs - startOffset, 1)

  const frac = (seg: TimelineSegment): number => {
    if (isLive) return n <= 1 ? 0 : seg.index / (n - 1)
    return Math.min(Math.max((seg.offsetMs - startOffset) / totalMs, 0), 1)
  }

  const nearestAt = (r: number): TimelineSegment => {
    let best = segments[0]
    let minD = Infinity
    for (const s of segments) {
      const d = Math.abs(frac(s) - r)
      if (d < minD) { minD = d; best = s }
    }
    return best
  }

  const ratioFrom = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
  }

  // Density waveform — count segments per time bucket
  const density = Array.from({ length: BUCKETS }, (_, bi) => {
    const lo = bi / BUCKETS
    const hi = (bi + 1) / BUCKETS
    return segments.filter(s => { const p = frac(s); return p >= lo && p < hi }).length
  })
  const maxDensity = Math.max(...density, 1)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    const r = ratioFrom(e.clientX)
    setScrubFrac(r)
    onJumpTo(nearestAt(r).index)

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const rr = ratioFrom(ev.clientX)
      setScrubFrac(rr)
      onJumpTo(nearestAt(rr).index)
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const commentSegs = segments.filter(s => s.hasComment)
  const hoveredSeg = hoverFrac !== null ? nearestAt(hoverFrac) : null
  const activeFrac = scrubFrac ?? 0

  // Mid-point time labels (every ~25% of duration)
  const midLabels = [0.25, 0.5, 0.75].map(p => ({
    pct: p,
    label: fmtMs(startOffset + totalMs * p),
  }))

  return (
    <div
      style={{
        padding: '0 24px 12px',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* Hover tooltip */}
      {hoveredSeg && hoverFrac !== null && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% - 6px)',
            left: `calc(${hoverFrac * 100}% - 24px + 24px)`,  // account for padding
            transform: 'translateX(-50%)',
            background: 'var(--canvas)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 11,
            lineHeight: 1.45,
            maxWidth: 220,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          <span style={{ color: 'var(--accent)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginRight: 6 }}>
            {fmtMs(hoveredSeg.offsetMs)}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            {hoveredSeg.text.length > 52 ? hoveredSeg.text.slice(0, 52) + '…' : hoveredSeg.text}
          </span>
        </div>
      )}

      {/* Main interactive track area */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onMouseMove={e => setHoverFrac(ratioFrom(e.clientX))}
        onMouseLeave={() => setHoverFrac(null)}
        style={{ position: 'relative', height: 40, cursor: 'col-resize' }}
      >
        {/* Waveform bars */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 22, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          {density.map((count, i) => {
            const h = Math.max((count / maxDensity) * 18, count > 0 ? 3 : 1)
            const isBeforeScrub = scrubFrac !== null && (i / BUCKETS) <= scrubFrac
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: h,
                  borderRadius: 2,
                  background: isBeforeScrub
                    ? 'rgba(99,102,241,0.55)'
                    : 'var(--divider)',
                  transition: 'background 0.1s',
                }}
              />
            )
          })}
        </div>

        {/* Track line */}
        <div style={{
          position: 'absolute',
          top: 26,
          left: 0, right: 0,
          height: 3,
          borderRadius: 4,
          background: 'var(--divider)',
          overflow: 'visible',
        }}>
          {/* Filled portion */}
          {scrubFrac !== null && (
            <div style={{
              position: 'absolute',
              left: 0, top: 0,
              width: `${activeFrac * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent), rgba(99,102,241,0.5))',
              borderRadius: 4,
              pointerEvents: 'none',
            }} />
          )}

          {/* Comment markers */}
          {commentSegs.map(seg => (
            <div
              key={seg.index}
              onClick={e => { e.stopPropagation(); setScrubFrac(frac(seg)); onJumpTo(seg.index) }}
              style={{
                position: 'absolute',
                left: `${frac(seg) * 100}%`,
                top: '50%',
                transform: 'translate(-50%, -50%) rotate(45deg)',
                width: 7, height: 7,
                background: '#F59E0B',
                borderRadius: 1,
                cursor: 'pointer',
                zIndex: 3,
                boxShadow: '0 0 0 2px rgba(245,158,11,0.2)',
              }}
            />
          ))}

          {/* Hover ghost line */}
          {hoverFrac !== null && !dragging.current && (
            <div style={{
              position: 'absolute',
              left: `${hoverFrac * 100}%`,
              top: -6,
              width: 1,
              height: 15,
              background: 'rgba(99,102,241,0.3)',
              pointerEvents: 'none',
              borderRadius: 1,
            }} />
          )}

          {/* Scrubber thumb */}
          {scrubFrac !== null && (
            <div style={{
              position: 'absolute',
              left: `${activeFrac * 100}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 13, height: 13,
              borderRadius: '50%',
              background: 'var(--accent)',
              border: '2px solid var(--canvas)',
              boxShadow: '0 0 0 2px var(--accent)',
              zIndex: 4,
              pointerEvents: 'none',
              transition: dragging.current ? 'none' : 'left 0.05s',
            }} />
          )}
        </div>

        {/* Playhead vertical line (extends into waveform) */}
        {scrubFrac !== null && (
          <div style={{
            position: 'absolute',
            left: `${activeFrac * 100}%`,
            top: 0,
            width: 1,
            height: 26,
            background: 'rgba(99,102,241,0.25)',
            pointerEvents: 'none',
            transform: 'translateX(-50%)',
          }} />
        )}
      </div>

      {/* Labels row */}
      <div style={{ position: 'relative', height: 14, marginTop: 3 }}>
        {/* Start */}
        <span style={{
          position: 'absolute', left: 0,
          fontSize: 9, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', fontWeight: 500,
        }}>
          {fmtMs(startOffset)}
        </span>

        {/* Mid labels */}
        {midLabels.map(({ pct, label }) => (
          <span key={pct} style={{
            position: 'absolute', left: `${pct * 100}%`,
            transform: 'translateX(-50%)',
            fontSize: 9, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', fontWeight: 500,
            opacity: 0.6,
          }}>
            {label}
          </span>
        ))}

        {/* End / live */}
        <span style={{
          position: 'absolute', right: 0,
          fontSize: 9, color: isLive ? 'var(--live)' : 'var(--text-muted)',
          fontVariantNumeric: 'tabular-nums', fontWeight: isLive ? 700 : 500,
          letterSpacing: isLive ? '0.04em' : 0,
        }}>
          {isLive ? `● ${n} lines` : fmtMs(segments[n - 1].offsetMs)}
        </span>
      </div>
    </div>
  )
}

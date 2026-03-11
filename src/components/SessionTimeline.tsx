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

const BUCKETS = 60
const SVG_W = 1000
const SVG_H = 40

function buildPath(pts: { x: number; y: number }[], baseY: number): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${baseY} L ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const cur = pts[i]
    const cpx = (prev.x + cur.x) / 2
    d += ` C ${cpx} ${prev.y} ${cpx} ${cur.y} ${cur.x} ${cur.y}`
  }
  d += ` L ${pts[pts.length - 1].x} ${baseY} Z`
  return d
}

export default function SessionTimeline({ segments, sessionEndMs, onJumpTo }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [scrubFrac, setScrubFrac] = useState<number | null>(null)
  const [hoverFrac, setHoverFrac] = useState<number | null>(null)

  const isLive = sessionEndMs === undefined
  const n = segments.length
  if (n < 3) return null

  const startOffset = segments[0].offsetMs
  const totalMs = Math.max(segments[n - 1].offsetMs - startOffset, 1)

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

  // Density per bucket
  const density = Array.from({ length: BUCKETS }, (_, bi) => {
    const lo = bi / BUCKETS
    const hi = (bi + 1) / BUCKETS
    return segments.filter(s => { const p = frac(s); return p >= lo && p < hi }).length
  })
  const maxDensity = Math.max(...density, 1)

  // SVG path points — smooth monotone area
  const pts = density.map((v, i) => ({
    x: ((i + 0.5) / BUCKETS) * SVG_W,
    y: SVG_H - Math.max((v / maxDensity) * SVG_H * 0.88, v > 0 ? 4 : 1),
  }))
  const pathD = buildPath(pts, SVG_H)

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

  const midLabels = [0.25, 0.5, 0.75].map(p => ({
    pct: p,
    label: fmtMs(startOffset + totalMs * p),
  }))

  return (
    <div style={{ padding: '8px 24px 10px', userSelect: 'none', position: 'relative' }}>

      {/* Tooltip */}
      {hoveredSeg && hoverFrac !== null && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 2px)',
          left: `calc(24px + ${hoverFrac * 100}% - 48px)`,
          transform: 'translateX(-50%)',
          background: 'var(--canvas)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '5px 10px',
          fontSize: 11,
          lineHeight: 1.5,
          maxWidth: 240,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
          zIndex: 20,
        }}>
          <span style={{ color: 'var(--accent)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginRight: 6 }}>
            {fmtMs(hoveredSeg.offsetMs)}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            {hoveredSeg.text.length > 55 ? hoveredSeg.text.slice(0, 55) + '…' : hoveredSeg.text}
          </span>
        </div>
      )}

      {/* Interactive area */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onMouseMove={e => setHoverFrac(ratioFrom(e.clientX))}
        onMouseLeave={() => setHoverFrac(null)}
        style={{ position: 'relative', cursor: 'col-resize' }}
      >
        {/* ── SVG Waveform ── */}
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: 36, display: 'block', overflow: 'visible' }}
        >
          <defs>
            {/* Filled gradient (left of scrubber) */}
            <linearGradient id="tl-grad-filled" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(99,102,241,0.65)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0.08)" />
            </linearGradient>
            {/* Dimmed gradient (right of scrubber) */}
            <linearGradient id="tl-grad-dim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(150,150,160,0.18)" />
              <stop offset="100%" stopColor="rgba(150,150,160,0.03)" />
            </linearGradient>
            {/* Clip: filled portion */}
            <clipPath id="tl-clip-filled">
              <rect x={0} y={0} width={activeFrac * SVG_W} height={SVG_H} />
            </clipPath>
            {/* Clip: unfilled portion */}
            <clipPath id="tl-clip-dim">
              <rect x={activeFrac * SVG_W} y={0} width={SVG_W} height={SVG_H} />
            </clipPath>
          </defs>

          {/* Dim waveform (full) */}
          <path d={pathD} fill="url(#tl-grad-dim)" clipPath="url(#tl-clip-dim)" />
          {/* Filled waveform (up to scrubber) */}
          {scrubFrac !== null && (
            <path d={pathD} fill="url(#tl-grad-filled)" clipPath="url(#tl-clip-filled)" />
          )}

          {/* Hover vertical line */}
          {hoverFrac !== null && (
            <line
              x1={hoverFrac * SVG_W} y1={0}
              x2={hoverFrac * SVG_W} y2={SVG_H}
              stroke="rgba(99,102,241,0.25)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          )}
        </svg>

        {/* ── Track line + markers ── */}
        <div style={{
          position: 'relative',
          height: 3,
          background: 'var(--divider)',
          borderRadius: 4,
          marginTop: 1,
        }}>
          {/* Filled bar */}
          {scrubFrac !== null && (
            <div style={{
              position: 'absolute',
              left: 0, top: 0,
              width: `${activeFrac * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent), rgba(99,102,241,0.4))',
              borderRadius: 4,
              pointerEvents: 'none',
            }} />
          )}

          {/* Comment markers — small triangles above track */}
          {commentSegs.map(seg => (
            <div
              key={seg.index}
              onClick={e => { e.stopPropagation(); setScrubFrac(frac(seg)); onJumpTo(seg.index) }}
              title={seg.text.slice(0, 60)}
              style={{
                position: 'absolute',
                left: `${frac(seg) * 100}%`,
                top: -7,
                transform: 'translateX(-50%)',
                width: 0, height: 0,
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderTop: '6px solid #F59E0B',
                cursor: 'pointer',
                zIndex: 3,
                filter: 'drop-shadow(0 1px 2px rgba(245,158,11,0.4))',
              }}
            />
          ))}

          {/* Scrubber thumb */}
          {scrubFrac !== null && (
            <div style={{
              position: 'absolute',
              left: `${activeFrac * 100}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 14, height: 14,
              borderRadius: '50%',
              background: 'var(--accent)',
              border: '2.5px solid var(--canvas)',
              boxShadow: '0 0 0 2px var(--accent), 0 2px 8px rgba(99,102,241,0.4)',
              zIndex: 4,
              pointerEvents: 'none',
            }} />
          )}
        </div>

        {/* ── Labels ── */}
        <div style={{ position: 'relative', height: 14, marginTop: 5 }}>
          <span style={{ position: 'absolute', left: 0, fontSize: 9, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
            {fmtMs(startOffset)}
          </span>
          {midLabels.map(({ pct, label }) => (
            <span key={pct} style={{ position: 'absolute', left: `${pct * 100}%`, transform: 'translateX(-50%)', fontSize: 9, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', opacity: 0.55 }}>
              {label}
            </span>
          ))}
          <span style={{ position: 'absolute', right: 0, fontSize: 9, fontVariantNumeric: 'tabular-nums', fontWeight: isLive ? 700 : 500, color: isLive ? 'var(--live)' : 'var(--text-muted)', letterSpacing: isLive ? '0.04em' : 0 }}>
            {isLive ? `● ${n}` : fmtMs(segments[n - 1].offsetMs)}
          </span>
        </div>
      </div>
    </div>
  )
}

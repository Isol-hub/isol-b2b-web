import { useEffect, useRef } from 'react'

interface Props {
  current: string
  previous: string
  compact?: boolean
}

export default function SubtitleView({ current, previous, compact }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [current])

  const currentSize = compact ? 17 : 31
  const prevSize = compact ? 13 : 21

  if (!current && !previous) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: compact ? 80 : 160,
      color: 'rgba(238,242,255,0.22)', fontSize: 14, gap: 10,
      flexDirection: 'column',
    }}>
      <span style={{ fontSize: compact ? 20 : 28, opacity: 0.4 }}>✦</span>
      <span>Subtitles will appear here…</span>
    </div>
  )

  return (
    <div style={{
      padding: compact ? '12px 16px' : '28px 32px',
      display: 'flex', flexDirection: 'column', gap: compact ? 8 : 14,
    }}>
      {previous && (
        <p style={{
          fontSize: prevSize,
          lineHeight: 1.5,
          color: 'rgba(238,242,255,0.22)',
          fontWeight: 400,
          margin: 0,
          transition: 'opacity 0.5s',
        }}>
          {previous}
        </p>
      )}
      <p ref={ref} key={current} style={{
        fontSize: currentSize,
        lineHeight: 1.45,
        color: 'var(--text)',
        fontWeight: 600,
        margin: 0,
        animation: 'subtitleFadeIn 0.3s ease-out',
        letterSpacing: '-0.01em',
      }}>
        {current}
      </p>
    </div>
  )
}

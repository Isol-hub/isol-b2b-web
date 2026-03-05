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

  const currentSize = compact ? 17 : 30
  const prevSize = compact ? 14 : 22

  if (!current && !previous) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: compact ? 80 : 140,
      color: 'var(--text-dim)', fontSize: 14,
    }}>
      Subtitles will appear here…
    </div>
  )

  return (
    <div style={{
      padding: compact ? '12px 16px' : '24px 28px',
      display: 'flex', flexDirection: 'column', gap: compact ? 8 : 12,
    }}>
      {previous && (
        <p style={{
          fontSize: prevSize,
          lineHeight: 1.45,
          color: 'rgba(249,250,251,0.30)',
          fontWeight: 400,
          margin: 0,
          transition: 'opacity 0.4s',
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
        animation: 'subtitleFadeIn 0.25s ease-out',
      }}>
        {current}
      </p>
    </div>
  )
}

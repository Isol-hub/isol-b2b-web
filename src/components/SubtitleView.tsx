import { useEffect, useRef } from 'react'
import HeroQuotes from './HeroQuotes'

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
      flexDirection: 'column', gap: 10,
    }}>
      <HeroQuotes fontSize={compact ? 13 : 16} />
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
          color: 'var(--text-muted)',
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
        animation: 'lineReveal 0.25s ease-out',
        letterSpacing: '-0.01em',
      }}>
        {current}
      </p>
    </div>
  )
}

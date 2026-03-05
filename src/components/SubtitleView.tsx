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

  const baseFontSize = compact ? 16 : 26

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
      padding: compact ? '12px 16px' : '20px 24px',
      display: 'flex', flexDirection: 'column', gap: compact ? 6 : 10,
    }}>
      {previous && (
        <p style={{
          fontSize: baseFontSize - 4,
          lineHeight: 1.45,
          color: 'rgba(249,250,251,0.35)',
          fontWeight: 400,
          margin: 0,
          transition: 'opacity 0.3s',
        }}>
          {previous}
        </p>
      )}
      <p ref={ref} style={{
        fontSize: baseFontSize,
        lineHeight: 1.45,
        color: 'var(--text)',
        fontWeight: 500,
        margin: 0,
        transition: 'all 0.2s',
      }}>
        {current}
      </p>
    </div>
  )
}

import { useState, useEffect } from 'react'

const HERO_QUOTES = [
  'Every meeting understood.',
  'Any language, any speaker.',
  'Real-time. Zero friction.',
  'From speech to knowledge.',
  'No word left behind.',
]

export default function HeroQuotes({ fontSize = 12 }: { fontSize?: number }) {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'in' | 'out'>('in')

  useEffect(() => {
    const t = setInterval(() => {
      setPhase('out')
      setTimeout(() => {
        setIdx(i => (i + 1) % HERO_QUOTES.length)
        setPhase('in')
      }, 380)
    }, 3200)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ height: fontSize + 10, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
      <span
        key={idx}
        style={{
          fontSize,
          color: 'var(--text-muted)',
          fontWeight: 500,
          letterSpacing: '0.01em',
          display: 'inline-block',
          transformOrigin: 'center center',
          animation: phase === 'in'
            ? 'quoteFlipIn 0.38s cubic-bezier(0.22,1,0.36,1) forwards'
            : 'quoteFlipOut 0.32s cubic-bezier(0.64,0,0.78,0) forwards',
        }}
      >
        {HERO_QUOTES[idx]}
      </span>
    </div>
  )
}

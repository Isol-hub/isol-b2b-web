import { useState, useEffect, useRef } from 'react'

interface CharEntry {
  c: string
  isNew: boolean
  id: number
}

let _id = 0

interface Props {
  text: string
  fontSize?: number
  color?: string
}

/**
 * Renders text character-by-character with a glow/matrix reveal effect
 * on newly added characters. Existing characters are rendered statically.
 */
export default function MatrixText({ text, fontSize, color = 'var(--text)' }: Props) {
  const prevRef = useRef('')
  const [chars, setChars] = useState<CharEntry[]>([])

  useEffect(() => {
    const prev = prevRef.current
    const next = text

    // Find shared prefix length
    let prefix = 0
    const min = Math.min(prev.length, next.length)
    while (prefix < min && prev[prefix] === next[prefix]) prefix++

    setChars(
      next.split('').map((c, i) => ({
        c,
        isNew: i >= prefix,
        id: i < prefix ? i : ++_id,
      }))
    )
    prevRef.current = next
  }, [text])

  return (
    <span style={{ fontSize, color }}>
      {chars.map(ch =>
        ch.isNew ? (
          <span key={ch.id} className="matrix-char">{ch.c}</span>
        ) : (
          <span key={ch.id}>{ch.c}</span>
        )
      )}
    </span>
  )
}

import { useEffect, useRef } from 'react'
import MatrixText from './MatrixText'

interface Props {
  currentLine: string   // live in-progress text
  previousLine: string  // last committed line
  isActive: boolean
}

function drawWave(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  phase: number,
  color: string,
  baseFrac: number,
  ampFrac: number,
) {
  const wavelength = w * 1.2
  const amp = h * ampFrac
  const baseY = h * baseFrac
  const step = w / 40

  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x <= w + step; x += step) {
    const y = baseY + Math.sin((x / wavelength) * Math.PI * 2 + phase) * amp
    ctx.lineTo(x, y)
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

export default function LiveBanner({ currentLine, previousLine, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const phaseRef = useRef(0)
  const lastTimeRef = useRef(0)

  // Canvas ocean animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const CYCLE = 7000

    const frame = (time: number) => {
      const dt = lastTimeRef.current ? time - lastTimeRef.current : 0
      lastTimeRef.current = time

      const w = canvas.width
      const h = canvas.height
      if (w === 0 || h === 0) { animRef.current = requestAnimationFrame(frame); return }

      // Advance phase
      phaseRef.current = (phaseRef.current + (dt / CYCLE) * Math.PI * 2) % (Math.PI * 2)
      const p1 = phaseRef.current
      const p2 = (phaseRef.current * 1.35) % (Math.PI * 2)

      // Base gradient: deep navy → mid blue → bright cyan
      const grad = ctx.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0,    '#05081A')
      grad.addColorStop(0.55, '#12263F')
      grad.addColorStop(1,    '#1AD2FF')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      // Wave 1 — cyan (50% opacity)
      drawWave(ctx, w, h, p1, 'rgba(226,254,255,0.50)', 0.55, 0.20)
      // Wave 2 — blue-violet (50% opacity), counter-phase
      drawWave(ctx, w, h, p2, 'rgba(145,147,255,0.50)', 0.45, 0.14)

      animRef.current = requestAnimationFrame(frame)
    }

    animRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  // Sync canvas size to display size
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const obs = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    })
    obs.observe(canvas)
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    return () => obs.disconnect()
  }, [])

  const isEmpty = !currentLine && !previousLine

  return (
    <div style={{
      position: 'relative',
      borderRadius: 32,
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(26,210,255,0.18), 0 10px 40px rgba(0,0,0,0.28)',
      minHeight: 80,
      display: 'flex',
      alignItems: 'center',
    }}>

      {/* Ocean canvas background */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />

      {/* Text content */}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '14px 20px 14px 24px',
        width: '100%',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {isEmpty ? (
          /* Waiting / idle state — pulsing ISOL */
          <span style={{
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: '0.45em',
            color: '#fff',
            textShadow: '0 0 4px rgba(26,210,255,0.5)',
            textAlign: 'center',
            animation: 'isolPulse 3s ease-in-out infinite',
            userSelect: 'none',
          }}>
            ISOL
          </span>
        ) : (
          <>
            {/* Previous line — muted white */}
            {previousLine && (
              <p style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.4,
                color: 'rgba(255,255,255,0.55)',
                fontWeight: 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transition: 'opacity 0.18s',
              }}>
                {previousLine}
              </p>
            )}

            {/* Current line — full white, bold */}
            <p key={currentLine || 'idle'} style={{
              margin: 0,
              fontSize: 17,
              lineHeight: 1.5,
              color: '#ffffff',
              fontWeight: 700,
              letterSpacing: 0,
              textShadow: '0 0 4px rgba(26,210,255,0.5)',
              animation: 'lineReveal 0.25s ease-out',
              opacity: currentLine ? 1 : 0.45,
            }}>
              {currentLine ? (
                isActive
                  ? <><MatrixText text={currentLine} color="#fff" /><span className="doc-cursor" style={{ background: '#1AD2FF' }} /></>
                  : currentLine
              ) : (
                <span style={{ opacity: 0.6, fontWeight: 400 }}>
                  Listening<span className="doc-cursor" style={{ background: '#1AD2FF' }} />
                </span>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

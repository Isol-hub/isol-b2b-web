import { useEffect, useRef, useState } from 'react'
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

  // Delay canvas DOM mount so Chrome doesn't allocate the GPU backing store
  // while React is still mounting WorkspacePage (causes compositor crash on navigation).
  // The CSS gradient background is visible during the 200ms gap.
  const [canvasReady, setCanvasReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setCanvasReady(true), 200)
    return () => clearTimeout(t)
  }, [])

  // Start animation as soon as the canvas element is in the DOM
  useEffect(() => {
    if (!canvasReady) return
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

      phaseRef.current = (phaseRef.current + (dt / CYCLE) * Math.PI * 2) % (Math.PI * 2)
      const p1 = phaseRef.current
      const p2 = (phaseRef.current * 1.35) % (Math.PI * 2)

      const grad = ctx.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0,    '#05081A')
      grad.addColorStop(0.55, '#12263F')
      grad.addColorStop(1,    '#1AD2FF')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      drawWave(ctx, w, h, p1, 'rgba(226,254,255,0.50)', 0.55, 0.20)
      drawWave(ctx, w, h, p2, 'rgba(145,147,255,0.50)', 0.45, 0.14)

      animRef.current = requestAnimationFrame(frame)
    }

    animRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(animRef.current)
  }, [canvasReady])

  // Sync canvas size to display size
  useEffect(() => {
    if (!canvasReady) return
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
  }, [canvasReady])

  return (
    <div style={{
      position: 'relative',
      borderRadius: 32,
      boxShadow: '0 4px 24px rgba(26,210,255,0.18), 0 10px 40px rgba(0,0,0,0.28)',
      minHeight: 80,
      display: 'flex',
      alignItems: 'center',
      background: 'linear-gradient(90deg, #05081A 0%, #12263F 55%, #1AD2FF 100%)',
    }}>

      {/* Canvas mounts after 200ms to avoid GPU backing store allocation during navigation */}
      {canvasReady && (
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', borderRadius: 32 }}
        />
      )}

      {/* Text content */}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '14px 24px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        {/* Previous line — context row, only visible when live text is incoming */}
        {previousLine && currentLine && (
          <p style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.4,
            fontWeight: 400,
            letterSpacing: '-0.005em',
            color: 'rgba(255,255,255,0.45)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {previousLine}
          </p>
        )}

        {/* Bottom row — always shows last known text, never disappears */}
        {(currentLine || previousLine) && (
          <p
            key={currentLine || previousLine}
            style={{
              margin: 0,
              fontSize: 19,
              lineHeight: 1.35,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              textShadow: '0 0 10px rgba(26,210,255,0.45)',
              animation: currentLine ? 'lineReveal 0.15s ease-out' : 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {currentLine
              ? isActive
                ? <><MatrixText text={currentLine} color="#fff" /><span className="doc-cursor" style={{ background: '#1AD2FF' }} /></>
                : <>{currentLine}<span className="doc-cursor" style={{ background: '#1AD2FF' }} /></>
              : <>{previousLine}<span className="doc-cursor" style={{ background: 'rgba(26,210,255,0.7)' }} /></>
            }
          </p>
        )}
      </div>
    </div>
  )
}

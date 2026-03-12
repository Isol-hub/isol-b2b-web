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

  const isEmpty = !currentLine && !previousLine

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
        padding: '14px 20px 14px 24px',
        width: '100%',
      }}>
        {isEmpty ? (
          <div style={{ position: 'relative', width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {/* Blob 1 — cyan */}
            <div style={{
              position: 'absolute',
              width: 72, height: 72,
              borderRadius: '50%',
              background: 'rgba(26,210,255,0.55)',
              filter: 'blur(22px)',
              left: 'calc(50% - 60px)',
              top: '50%',
              transform: 'translateY(-50%)',
              animation: 'blob1 5.8s ease-in-out infinite',
            }} />
            {/* Blob 2 — violet */}
            <div style={{
              position: 'absolute',
              width: 60, height: 60,
              borderRadius: '50%',
              background: 'rgba(99,102,241,0.60)',
              filter: 'blur(20px)',
              left: 'calc(50% + 10px)',
              top: '50%',
              transform: 'translateY(-50%)',
              animation: 'blob2 7.2s ease-in-out infinite',
            }} />
            {/* Blob 3 — ice white center merge */}
            <div style={{
              position: 'absolute',
              width: 36, height: 36,
              borderRadius: '50%',
              background: 'rgba(226,254,255,0.38)',
              filter: 'blur(12px)',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'blob3 4.5s ease-in-out infinite',
            }} />
          </div>
        ) : (
          <p style={{
            margin: 0,
            fontSize: 17,
            lineHeight: 1.6,
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}>
            {previousLine && (
              <span style={{
                color: 'rgba(255,255,255,0.52)',
                fontWeight: 400,
              }}>
                {previousLine}{currentLine ? ' ' : ''}
              </span>
            )}
            {currentLine && (
              <span
                key={currentLine}
                style={{
                  color: '#ffffff',
                  fontWeight: 700,
                  textShadow: '0 0 6px rgba(26,210,255,0.55)',
                  animation: 'lineReveal 0.15s ease-out',
                }}
              >
                {isActive
                  ? <><MatrixText text={currentLine} color="#fff" /><span className="doc-cursor" style={{ background: '#1AD2FF' }} /></>
                  : <>{currentLine}<span className="doc-cursor" style={{ background: '#1AD2FF' }} /></>
                }
              </span>
            )}
            {!currentLine && previousLine && (
              <span className="doc-cursor" style={{ background: 'rgba(26,210,255,0.7)' }} />
            )}
          </p>
        )}
      </div>
    </div>
  )
}

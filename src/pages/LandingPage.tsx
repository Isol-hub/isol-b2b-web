import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/auth'

// Demo script — English source → Italian translation, simulates a live meeting
const SCRIPT = [
  { src: 'The Q4 results exceeded all projections.',        tr: 'I risultati del Q4 hanno superato ogni proiezione.' },
  { src: 'Revenue grew by 34% year over year.',             tr: 'Il fatturato è cresciuto del 34% anno su anno.' },
  { src: 'Customer retention reached an all-time high.',    tr: 'La retention ha raggiunto un massimo storico.' },
  { src: 'We need to expand into three new markets.',       tr: 'Dobbiamo espanderci in tre nuovi mercati.' },
  { src: 'Product launches are scheduled for Q1.',          tr: 'I lanci di prodotto sono previsti per il Q1.' },
]

const USE_CASES = [
  { title: 'Meetings',   desc: 'Every meeting understood and captured, in any language.' },
  { title: 'Lectures',   desc: 'Every lecture, even across languages.' },
  { title: 'Podcasts',   desc: 'Every spoken idea becomes accessible.' },
  { title: 'Interviews', desc: "Every insight captured the moment it's spoken." },
]

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function LandingPage() {
  const navigate = useNavigate()
  const session = getSession()

  // Session timer on the demo
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Live transcript demo
  const [lines, setLines]     = useState<{ src: string; tr: string }[]>([])
  const [partial, setPartial] = useState('')

  useEffect(() => {
    const alive = { v: true }
    const wait = (ms: number) => new Promise<void>(res => setTimeout(res, ms))

    async function run() {
      while (alive.v) {
        setLines([])
        setPartial('')
        await wait(1000)

        for (const line of SCRIPT) {
          if (!alive.v) return
          // type the source text word by word
          const words = line.src.split(' ')
          for (let i = 1; i <= words.length; i++) {
            if (!alive.v) return
            setPartial(words.slice(0, i).join(' '))
            await wait(80 + Math.random() * 70)
          }
          if (!alive.v) return
          await wait(360)
          // finalize → show translation
          setLines(prev => [...prev, line].slice(-4))
          setPartial('')
          await wait(600)
        }
        await wait(2600)
      }
    }

    run()
    return () => { alive.v = false }
  }, [])

  const goCTA = () => {
    if (session) navigate(`/${session.workspaceSlug}`)
    else navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(250,250,248,0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--divider)',
        display: 'flex', alignItems: 'center',
        padding: '0 40px', height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 36 }}>
          <div className="logo-mark" style={{ width: 26, height: 26 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>i</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>ISOL</span>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          <a href="#" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none', fontWeight: 500 }}>Product</a>
          <a href="#" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none', fontWeight: 500 }}>Docs</a>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => navigate('/login')} className="btn-icon" style={{ fontSize: 13 }}>
            Sign in
          </button>
          <button
            onClick={goCTA}
            className="btn-primary"
            style={{ width: 'auto', fontSize: 13, padding: '0 22px', height: 36, borderRadius: 999 }}
          >
            Start a session
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1100, margin: '0 auto',
        padding: 'clamp(60px, 8vw, 110px) 40px clamp(60px, 8vw, 100px)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
        gap: 'clamp(48px, 6vw, 80px)',
        alignItems: 'center',
      }}>

        {/* ── Left: copy ── */}
        <div>
          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 58px)',
            fontWeight: 800, lineHeight: 1.1,
            letterSpacing: '-0.04em', marginBottom: 20,
          }}>
            Every word,<br />
            transcribed and<br />
            <span className="gradient-text">translated.</span>
          </h1>
          <p style={{
            fontSize: 'clamp(15px, 1.8vw, 18px)',
            color: 'var(--text-dim)', lineHeight: 1.75,
            maxWidth: 400, marginBottom: 36,
          }}>
            Open ISOL and play any audio — a meeting, a lecture, a YouTube video.
            Watch it transcribe and translate speech in real time.
          </p>
          <button
            onClick={goCTA}
            className="btn-primary"
            style={{ width: 'auto', fontSize: 15, padding: '0 32px', height: 50, borderRadius: 999, marginBottom: 14 }}
          >
            Start a session →
          </button>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Works with meetings · lectures · podcasts · interviews
          </p>
        </div>

        {/* ── Right: live demo ── */}
        <div style={{
          background: 'var(--canvas)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          boxShadow: '0 8px 48px rgba(0,0,0,0.09)',
        }}>
          {/* Fake browser chrome */}
          <div style={{
            padding: '10px 14px',
            background: 'var(--surface-1)',
            borderBottom: '1px solid var(--divider)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {['#EF4444', '#F59E0B', '#22C55E'].map(c => (
              <span key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.55, flexShrink: 0 }} />
            ))}
            <span style={{
              flex: 1, marginLeft: 8,
              background: 'var(--surface-2)', borderRadius: 5,
              padding: '3px 10px', fontSize: 10, color: 'var(--text-muted)',
            }}>isolstudio.live/workspace</span>
          </div>

          {/* Session status bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 16px',
            background: 'var(--surface-1)',
            borderBottom: '1px solid var(--divider)',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--live)', flexShrink: 0,
              animation: 'livePulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--live)', letterSpacing: '0.08em' }}>LIVE</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{fmt(tick)}</span>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: 'var(--accent)', marginLeft: 10,
              background: 'rgba(99,102,241,0.07)',
              border: '1px solid rgba(99,102,241,0.18)',
              borderRadius: 5, padding: '2px 7px',
            }}>EN → IT</span>
          </div>

          {/* Transcript area */}
          <div style={{ padding: '18px 18px', minHeight: 280 }}>
            {lines.length === 0 && !partial && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                Listening…
              </p>
            )}

            {/* Finalized lines: translation bold on top, source small below */}
            {lines.map((line, i) => (
              <div
                key={`${i}-${line.src}`}
                style={{
                  marginBottom: 14, paddingBottom: 14,
                  borderBottom: '1px solid var(--divider)',
                  animation: 'lineAppear 0.35s ease forwards',
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '0 0 3px', lineHeight: 1.45 }}>
                  {line.tr}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                  {line.src}
                </p>
              </div>
            ))}

            {/* Current partial — source text typing in */}
            {partial && (
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 4px', letterSpacing: '0.04em' }}>
                  recognizing…
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  {partial}
                  <span style={{
                    display: 'inline-block',
                    width: 2, height: '1em',
                    background: 'var(--accent)',
                    marginLeft: 2, verticalAlign: 'text-bottom',
                    animation: 'cursorBlink 1s ease-in-out infinite',
                  }} />
                </p>
              </div>
            )}
          </div>
        </div>

      </section>

      {/* ── USE CASES ────────────────────────────────────────────── */}
      <section style={{
        background: 'var(--surface-1)',
        borderTop: '1px solid var(--divider)',
        borderBottom: '1px solid var(--divider)',
        padding: 'clamp(56px, 7vw, 88px) 40px',
      }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 16,
        }}>
          {USE_CASES.map(uc => (
            <div key={uc.title} style={{
              background: 'var(--canvas)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '22px 20px',
            }}>
              <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 7px', letterSpacing: '-0.01em' }}>{uc.title}</p>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>{uc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CLOSING ──────────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(88px, 12vw, 150px) 40px',
        textAlign: 'center', maxWidth: 620, margin: '0 auto',
      }}>
        <h2 style={{
          fontSize: 'clamp(34px, 5.5vw, 60px)',
          fontWeight: 800, letterSpacing: '-0.04em',
          lineHeight: 1.08, marginBottom: 32,
        }}>
          Speech becomes<br />
          <span className="gradient-text">knowledge.</span>
        </h2>
        <button
          onClick={goCTA}
          className="btn-primary"
          style={{ width: 'auto', fontSize: 15, padding: '0 38px', height: 52, borderRadius: 999 }}
        >
          Start your first session
        </button>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--divider)',
        padding: '24px 40px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="logo-mark" style={{ width: 20, height: 20 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 10 }}>i</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>ISOL</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy', 'Terms', 'Contact'].map(l => (
            <a key={l} href="#" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>

    </div>
  )
}

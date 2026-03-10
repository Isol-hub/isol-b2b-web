import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/auth'

const WORDS = ['meeting', 'lecture', 'podcast', 'interview', 'conversation']

const HOW_IT_WORKS = [
  { n: '01', title: 'Speak or play audio', desc: 'Use your microphone or capture audio from any screen.' },
  { n: '02', title: 'ISOL understands and translates', desc: 'Speech is recognized and translated across languages in real time.' },
  { n: '03', title: 'Ideas are captured instantly', desc: 'A structured document builds itself as you speak.' },
]

const USE_CASES = [
  { title: 'Meetings', desc: 'Understand every meeting instantly.' },
  { title: 'Lectures', desc: 'Capture knowledge from any lecture.' },
  { title: 'Podcasts', desc: 'Turn spoken ideas into accessible knowledge.' },
  { title: 'Interviews', desc: 'Never miss an insight.' },
]

const TECH = [
  'Real-time speech understanding',
  'Live translation across 14 languages',
  'Speaker recognition',
]

const DEMO_LINES = [
  { src: 'The Q4 results exceeded all projections.', tr: 'I risultati del Q4 hanno superato ogni proiezione.' },
  { src: 'Revenue grew by 34% year over year.', tr: 'Il fatturato è cresciuto del 34% anno su anno.' },
  { src: 'Customer retention reached 94%.', tr: 'La retention ha raggiunto il 94%.' },
]

const WAVE_HEIGHTS = [0.5, 0.85, 1, 0.6, 0.9, 0.55, 1, 0.7, 0.8, 0.5, 0.9, 0.65]

export default function LandingPage() {
  const navigate = useNavigate()
  const session = getSession()
  const [wordIdx, setWordIdx] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setWordIdx(i => (i + 1) % WORDS.length)
        setFading(false)
      }, 240)
    }, 2600)
    return () => clearInterval(t)
  }, [])

  const goCTA = () => {
    if (session) navigate(`/${session.workspaceSlug}`)
    else navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>

      {/* ── NAV ───────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(250,250,248,0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--divider)',
        display: 'flex', alignItems: 'center',
        padding: '0 40px', height: 56, gap: 0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 36 }}>
          <div className="logo-mark" style={{ width: 26, height: 26 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>i</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>ISOL</span>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          <a href="#" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none', fontWeight: 500 }}>Product</a>
          <a href="#" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none', fontWeight: 500 }}>Docs</a>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/login')}
            className="btn-icon"
            style={{ fontSize: 13 }}
          >
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

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 780, margin: '0 auto',
        padding: 'clamp(80px, 12vw, 140px) 32px 80px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: 'clamp(40px, 7vw, 74px)',
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: '-0.04em',
          marginBottom: 26,
        }}>
          {'Understand every '}
          <span style={{
            display: 'inline-block',
            color: 'var(--accent)',
            opacity: fading ? 0 : 1,
            transform: fading ? 'translateY(-8px)' : 'translateY(0)',
            transition: 'opacity 0.22s ease, transform 0.22s ease',
            minWidth: '5ch',
          }}>
            {WORDS[wordIdx]}
          </span>
          {'.'}<br />
          {'In any language.'}
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 2.2vw, 20px)',
          color: 'var(--text-dim)',
          lineHeight: 1.6,
          maxWidth: 460, margin: '0 auto 48px',
          fontWeight: 400,
        }}>
          ISOL listens, translates and captures speech instantly.
        </p>

        <button
          onClick={goCTA}
          className="btn-primary"
          style={{ width: 'auto', fontSize: 15, padding: '0 38px', height: 52, borderRadius: 999 }}
        >
          Start a session
        </button>
      </section>

      {/* ── WHY IT MATTERS ────────────────────────────────────── */}
      <section style={{
        background: '#111110',
        padding: 'clamp(80px, 12vw, 130px) 32px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <p style={{
            fontSize: 'clamp(17px, 2.8vw, 24px)',
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.7,
            fontWeight: 400,
            marginBottom: 20,
          }}>
            Important ideas are spoken every day — in meetings,<br />
            lectures, interviews and conversations.
          </p>
          <p style={{
            fontSize: 'clamp(17px, 2.8vw, 24px)',
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.7,
            marginBottom: 44,
          }}>
            Most of them disappear.
          </p>
          <p style={{
            fontSize: 'clamp(24px, 4vw, 40px)',
            color: '#fff',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            lineHeight: 1.15,
            marginBottom: 52,
          }}>
            ISOL makes sure they don't.
          </p>
          <button
            onClick={goCTA}
            style={{
              background: '#fff', color: '#111110',
              border: 'none', borderRadius: 999,
              fontSize: 15, fontWeight: 700,
              padding: '0 38px', height: 52,
              cursor: 'pointer', letterSpacing: '-0.01em',
            }}
          >
            Start a session
          </button>
        </div>
      </section>

      {/* ── VIDEO DEMO PLACEHOLDER ────────────────────────────── */}
      <section style={{
        padding: 'clamp(72px, 10vw, 100px) 32px',
        maxWidth: 960, margin: '0 auto',
      }}>
        <p style={{
          textAlign: 'center', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.10em', textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: 40,
        }}>See it in action</p>

        {/* Split screen */}
        <div style={{
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          minHeight: 260,
          boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
        }}>
          {/* Left: audio source */}
          <div style={{
            background: '#0D0D0C',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 22, padding: '36px 28px',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: 52, height: 52,
              background: 'rgba(255,255,255,0.07)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 20, marginLeft: 4, color: 'rgba(255,255,255,0.7)' }}>▶</span>
            </div>
            {/* Waveform */}
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 32 }}>
              {WAVE_HEIGHTS.map((h, i) => (
                <div key={i} style={{
                  width: 3,
                  height: `${h * 28}px`,
                  background: 'rgba(255,255,255,0.28)',
                  borderRadius: 2,
                  animation: 'waveBar 0.9s ease-in-out infinite alternate',
                  animationDelay: `${i * 0.08}s`,
                  transformOrigin: 'bottom',
                }} />
              ))}
            </div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0 }}>
              Audio source
            </p>
          </div>

          {/* Right: ISOL transcript */}
          <div style={{ background: 'var(--canvas)', padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 22 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--live)',
                animation: 'livePulse 2s ease-in-out infinite',
              }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--live)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>EN → IT</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {DEMO_LINES.map((line, i) => (
                <div key={i} style={{
                  opacity: 0,
                  animation: 'lineAppear 0.5s ease forwards',
                  animationDelay: `${0.6 + i * 1.1}s`,
                  paddingBottom: 14,
                  marginBottom: 14,
                  borderBottom: i < DEMO_LINES.length - 1 ? '1px solid var(--divider)' : 'none',
                }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 3px', fontStyle: 'italic' }}>{line.src}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{line.tr}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 14 }}>
          Video demo coming soon — replace this placeholder with your screen recording
        </p>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section style={{
        background: 'var(--surface-1)',
        borderTop: '1px solid var(--divider)',
        borderBottom: '1px solid var(--divider)',
        padding: 'clamp(72px, 10vw, 100px) 32px',
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <p style={{
            textAlign: 'center', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            color: 'var(--text-muted)', marginBottom: 56,
          }}>How it works</p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 48,
          }}>
            {HOW_IT_WORKS.map(step => (
              <div key={step.n}>
                <span style={{
                  display: 'block',
                  fontSize: 11, fontWeight: 700,
                  color: 'var(--accent)', letterSpacing: '0.06em',
                  marginBottom: 14,
                }}>{step.n}</span>
                <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.01em' }}>{step.title}</p>
                <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ─────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(72px, 10vw, 100px) 32px',
        maxWidth: 880, margin: '0 auto',
      }}>
        <p style={{
          textAlign: 'center', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.10em', textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: 48,
        }}>Built for</p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
        }}>
          {USE_CASES.map(uc => (
            <div key={uc.title} style={{
              background: 'var(--canvas)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 22px',
            }}>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.01em', margin: '0 0 8px' }}>{uc.title}</p>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>{uc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TECH ──────────────────────────────────────────────── */}
      <section style={{
        background: 'var(--surface-1)',
        borderTop: '1px solid var(--divider)',
        borderBottom: '1px solid var(--divider)',
        padding: '44px 32px',
      }}>
        <div style={{
          maxWidth: 680, margin: '0 auto',
          display: 'flex', flexWrap: 'wrap',
          justifyContent: 'center', gap: '12px 48px',
        }}>
          {TECH.map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CLOSING ───────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(90px, 14vw, 150px) 32px',
        textAlign: 'center',
        maxWidth: 640, margin: '0 auto',
      }}>
        <h2 style={{
          fontSize: 'clamp(36px, 6vw, 64px)',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.08,
          marginBottom: 36,
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

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--divider)',
        padding: '24px 40px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
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

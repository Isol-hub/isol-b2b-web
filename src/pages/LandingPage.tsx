import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/auth'

const STEPS = [
  { icon: '🎙', label: 'Capture', desc: 'Stream audio from any screen or microphone in real time.' },
  { icon: '🌐', label: 'Translate', desc: 'Every spoken line is translated instantly into your language.' },
  { icon: '✦', label: 'Structure', desc: 'AI formats the stream into a clean, readable document.' },
  { icon: '↓', label: 'Export', desc: 'Download as Markdown, PDF, Word, or calendar event.' },
]

const USE_CASES = [
  { icon: '🎓', title: 'Online courses', desc: 'Follow lectures in any language with live captions and structured notes.' },
  { icon: '🌍', title: 'Multilingual meetings', desc: 'Everyone reads in their own language. No interpreter needed.' },
  { icon: '📡', title: 'Webinars', desc: 'Share a viewer link so remote attendees follow along in real time.' },
  { icon: '🔬', title: 'Research & study', desc: 'Capture interviews or fieldwork and export structured transcripts.' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const session = getSession()
  const emailFormRef = useRef<HTMLDivElement>(null)

  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const scrollToForm = () => {
    emailFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleOpenWorkspace = () => {
    if (session) {
      navigate(`/${session.workspaceSlug}`)
    } else {
      navigate('/login')
    }
  }

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSubmitted(true)
    } catch {
      setSubmitError('Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-ui)' }}>

      {/* ── NAV ──────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#FAFAF8',
        borderBottom: '1px solid var(--divider)',
        display: 'flex', alignItems: 'center',
        padding: '0 40px', height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div className="logo-mark" style={{ width: 28, height: 28 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>i</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>ISOL Studio</span>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleOpenWorkspace}
          className="btn-icon"
          style={{ fontSize: 13 }}
        >
          {session ? 'Open workspace →' : 'Sign in →'}
        </button>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 760, margin: '0 auto',
        padding: 'clamp(60px, 10vw, 120px) 32px 80px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: 'rgba(34,197,94,0.07)',
          border: '1px solid rgba(34,197,94,0.18)',
          borderRadius: 999, padding: '4px 14px', marginBottom: 36,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--live)',
            animation: 'livePulse 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--live)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            Early access
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 6vw, 64px)',
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-0.035em',
          marginBottom: 22,
        }}>
          Turn speech into<br />
          <span className="gradient-text">a structured document.</span>
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 2vw, 19px)',
          color: 'var(--text-dim)',
          lineHeight: 1.65,
          maxWidth: 520, margin: '0 auto 44px',
        }}>
          Capture live speech, translate it instantly, structure it with AI,
          and export a clean document — in real time.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={scrollToForm}
            className="btn-primary"
            style={{ width: 'auto', fontSize: 15, padding: '0 32px', height: 50, borderRadius: 999 }}
          >
            Get early access
          </button>
          <button
            onClick={handleOpenWorkspace}
            className="btn-icon"
            style={{ fontSize: 14, padding: '0 24px', height: 50, borderRadius: 999 }}
          >
            {session ? 'Open workspace' : 'Sign in'} →
          </button>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section style={{
        background: 'var(--surface-1)',
        borderTop: '1px solid var(--divider)',
        borderBottom: '1px solid var(--divider)',
        padding: '72px 32px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{
            textAlign: 'center', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            color: 'var(--text-muted)', marginBottom: 48,
          }}>How it works</p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 32,
          }}>
            {STEPS.map((step, i) => (
              <div key={step.label} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, margin: '0 auto 16px',
                }}>{step.icon}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 10 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'var(--accent)', color: '#fff',
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{step.label}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ────────────────────────────────────────── */}
      <section style={{ padding: '80px 32px', maxWidth: 900, margin: '0 auto' }}>
        <p style={{
          textAlign: 'center', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.10em', textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: 48,
        }}>Built for</p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
        }}>
          {USE_CASES.map(uc => (
            <div key={uc.title} style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 22px',
            }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>{uc.icon}</div>
              <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 7 }}>{uc.title}</p>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{uc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── DEMO PREVIEW ─────────────────────────────────────── */}
      <section style={{
        padding: '0 32px 80px',
        maxWidth: 900, margin: '0 auto',
      }}>
        <div style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
        }}>
          {/* Fake browser chrome */}
          <div style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--divider)',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            {['#EF4444','#F59E0B','#22C55E'].map(c => (
              <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.5 }} />
            ))}
            <span style={{
              flex: 1, marginLeft: 8,
              background: 'var(--surface-2)', borderRadius: 6,
              padding: '4px 12px', fontSize: 11, color: 'var(--text-muted)',
            }}>isolstudio.live/app</span>
          </div>
          {/* Fake workspace mockup */}
          <div style={{ display: 'flex', minHeight: 240 }}>
            <div style={{
              width: 180, borderRight: '1px solid var(--divider)',
              padding: '16px 14px',
              background: 'var(--rail)',
            }}>
              {['Capture', 'Language', 'Session'].map(label => (
                <div key={label} style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 7 }}>{label}</p>
                  <div style={{ height: 28, background: 'var(--surface-2)', borderRadius: 6, opacity: 0.6 }} />
                </div>
              ))}
            </div>
            <div style={{ flex: 1, padding: '20px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)', animation: 'livePulse 2s ease-in-out infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--live)', letterSpacing: '0.07em' }}>LIVE</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>00:02:14</span>
              </div>
              {['The Q4 results exceeded all projections.', 'Revenue grew by 34% year-over-year.', 'Customer retention reached an all-time high of 94%.'].map((line, i) => (
                <div key={i} style={{
                  height: 18, borderRadius: 4, marginBottom: 12,
                  background: 'var(--surface-2)', opacity: 0.7 + i * 0.1,
                  width: `${70 + i * 10}%`,
                }} />
              ))}
              <div style={{ height: 18, borderRadius: 4, width: '45%', background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.15)' }} />
            </div>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 14 }}>
          Real workspace — captions update live as you speak
        </p>
      </section>

      {/* ── EMAIL CAPTURE ────────────────────────────────────── */}
      <section
        ref={emailFormRef}
        style={{
          background: 'var(--surface-1)',
          borderTop: '1px solid var(--divider)',
          borderBottom: '1px solid var(--divider)',
          padding: '80px 32px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(24px, 4vw, 36px)',
            fontWeight: 800, letterSpacing: '-0.025em',
            marginBottom: 14,
          }}>
            Join the early access list
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 32 }}>
            We're onboarding teams one by one. Drop your email and we'll reach out.
          </p>

          {submitted ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
              background: 'rgba(34,197,94,0.07)',
              border: '1px solid rgba(34,197,94,0.20)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 24px',
            }}>
              <span style={{ fontSize: 18 }}>✓</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--live)' }}>
                You're on the list. We'll be in touch.
              </span>
            </div>
          ) : (
            <form onSubmit={handleWaitlist} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <input
                className="input-field"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ maxWidth: 300, borderRadius: 999 }}
              />
              <button
                type="submit"
                disabled={submitting || !email}
                className="btn-primary"
                style={{ width: 'auto', padding: '0 28px', borderRadius: 999 }}
              >
                {submitting ? 'Sending…' : 'Get early access'}
              </button>
              {submitError && (
                <p style={{ width: '100%', fontSize: 13, color: 'var(--red)', marginTop: 4 }}>{submitError}</p>
              )}
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{
        padding: '32px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="logo-mark" style={{ width: 22, height: 22 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 11 }}>i</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>ISOL Studio</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Audio is processed for live captioning and never stored.
        </p>
      </footer>

    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveToken, getSession } from '../lib/auth'

type Step = 'email' | 'otp'

const VIEWER_QUOTES = [
  { flag: '🇫🇷', lang: 'French',   text: '"j\'étais dos au mur…"' },
  { flag: '🇯🇵', lang: 'Japanese', text: '「前に出ることができたのに」' },
  { flag: '🇷🇺', lang: 'Russian',  text: '"кто-то, о ком я думал…"' },
]

const LP_CSS = `
@keyframes lp-float-a { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-7px)} }
@keyframes lp-float-b { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-5px)} }
@keyframes lp-float-c { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-9px)} }
@keyframes lp-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.8)} }
`

export default function LoginPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const s = getSession()
    if (s) navigate(`/${s.workspaceSlug}`, { replace: true })
  }, [navigate])

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send code')
      setStep('otp')
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid code')
      saveToken(data.token)
      const session = getSession()
      navigate(`/${session?.workspaceSlug ?? ''}`, { replace: true })
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      <style>{LP_CSS}</style>

      {/* ── Left: visual panel ──────────────────────────────────── */}
      <div style={{
        flex: '1 1 0',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#07070e',
      }}
      className="login-hero"
      >
        {/* Full-bleed screenshot */}
        <img
          src="/screens/host-it.png"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'top',
            opacity: 0.28,
          }}
        />

        {/* Dark gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg,rgba(7,7,14,.82) 0%,rgba(12,10,28,.88) 100%)', pointerEvents: 'none' }} />

        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.18) 0%,transparent 70%)', pointerEvents: 'none' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1, padding: 'clamp(32px,5vw,52px)' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'auto' }}>
            <div className="logo-mark" style={{ width: 34, height: 34 }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>i</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: '#fff' }}>ISOL Studio</span>
          </div>

          {/* Center content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 480, paddingTop: 48 }}>

            {/* Live badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.3)', borderRadius: 999, padding: '5px 13px', marginBottom: 26, alignSelf: 'flex-start' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', animation: 'lp-pulse 2s infinite', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.8)', letterSpacing: '.06em' }}>LIVE SESSION ACTIVE</span>
            </div>

            <h1 style={{ fontSize: 'clamp(28px,3.5vw,50px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 18, color: '#fff' }}>
              Speech becomes<br />
              <span style={{ background: 'linear-gradient(90deg,#818cf8,#38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                a living document.
              </span>
            </h1>

            <p style={{ fontSize: 15, color: 'rgba(255,255,255,.48)', lineHeight: 1.75, marginBottom: 40, maxWidth: 380 }}>
              Real-time transcription, translation & AI structuring. One session, every viewer in their language — live.
            </p>

            {/* Language viewer cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {VIEWER_QUOTES.map(({ flag, lang, text }, i) => (
                <div
                  key={lang}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'rgba(255,255,255,.05)',
                    border: '1px solid rgba(255,255,255,.09)',
                    borderRadius: 12, padding: '11px 16px',
                    animation: `lp-float-${['a','b','c'][i]} ${[4.5,5.5,4][i]}s ease-in-out infinite`,
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{flag}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', margin: '0 0 3px' }}>VIEWER · {lang.toUpperCase()}</p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontStyle: 'italic' }}>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom tagline */}
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.2)', marginTop: 48 }}>
            Audio is processed for live captioning and never stored permanently.
          </p>
        </div>
      </div>

      {/* ── Right: form ────────────────────────────────────────── */}
      <div style={{
        flex: '0 0 auto',
        width: '100%',
        maxWidth: 440,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 36px',
        background: 'var(--bg)',
      }}>
        <div style={{ width: '100%' }}>

          {/* Mobile logo — only shown when left panel is hidden */}
          <div className="login-mobile-logo" style={{ marginBottom: 32 }}>
            <div className="logo-mark" style={{ width: 44, height: 44, marginBottom: 12 }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>i</span>
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>ISOL Studio</h1>
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Live translation for your team</p>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 32 }}>
            {(['email','otp'] as Step[]).map((s, i) => (
              <div key={s} style={{ height: 3, flex: 1, borderRadius: 2, background: i === 0 ? 'var(--accent)' : (step === 'otp' ? 'var(--accent)' : 'var(--surface-3)'), transition: 'background .3s' }} />
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.025em' }}>
            {step === 'email' ? 'Sign in to your workspace' : 'Check your inbox'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 28, lineHeight: 1.6 }}>
            {step === 'email'
              ? "Enter your work email — we'll send a one-time code. No password needed."
              : <>We sent a 6-digit code to <strong style={{ color: 'var(--text)' }}>{email}</strong></>}
          </p>

          <div style={{ background: 'var(--canvas)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 22px', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>
            {step === 'email' ? (
              <form onSubmit={requestOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 7, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase' }}>
                    Work email
                  </label>
                  <input
                    className="input-field"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required autoFocus
                    style={{ fontSize: 15 }}
                  />
                </div>
                {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={loading || !email}
                  style={{ width: '100%', height: 48, fontSize: 14, fontWeight: 700, borderRadius: 10 }}
                >
                  {loading ? 'Sending…' : 'Continue →'}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 7, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase' }}>
                    6-digit code
                  </label>
                  <input
                    className="input-field"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    placeholder="000000"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required autoFocus
                    style={{ textAlign: 'center', fontSize: 32, letterSpacing: '0.35em', fontWeight: 800, padding: '14px', height: 68 }}
                  />
                </div>
                {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  style={{ width: '100%', height: 48, fontSize: 14, fontWeight: 700, borderRadius: 10 }}
                >
                  {loading ? 'Verifying…' : 'Sign in →'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); setError('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: '4px 0' }}
                >
                  ← Use a different email
                </button>
              </form>
            )}
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 20, lineHeight: 1.6 }}>
            By continuing you agree to our{' '}
            <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Terms</a>
            {' '}and{' '}
            <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}

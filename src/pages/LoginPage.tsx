import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveToken, getSession } from '../lib/auth'

type Step = 'email' | 'otp'

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

      {/* ── Left: hero ─────────────────────────────────────────── */}
      <div className="login-hero">
        <div style={{ maxWidth: 460 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 52 }}>
            <div className="logo-mark" style={{ width: 36, height: 36 }}>
              <span style={{ color: '#111', fontWeight: 800, fontSize: 18 }}>i</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>ISOL Studio</span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(28px, 3vw, 46px)',
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: 16,
          }}>
            Speech becomes<br />
            <span className="gradient-text">a live document.</span>
          </h1>

          <p style={{
            fontSize: 16,
            color: 'var(--text-dim)',
            lineHeight: 1.65,
            marginBottom: 44,
            maxWidth: 380,
          }}>
            Real-time captions, translation, and AI structuring for your team — no app, no delay.
          </p>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '🌐', text: 'Understand every word, even in foreign-language calls' },
              { icon: '⚡', text: 'Under 2 seconds latency, streamed live' },
              { icon: '🎤', text: 'Works with microphone or any browser tab audio' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  fontSize: 18, flexShrink: 0,
                  width: 36, height: 36,
                  background: 'rgba(214,178,94,0.10)',
                  border: '1px solid rgba(214,178,94,0.18)',
                  borderRadius: 'var(--radius)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{icon}</span>
                <span style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.55 }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          {/* Live preview card */}
          <div style={{
            marginTop: 44,
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 22px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--live)',
                animation: 'livePulse 2s ease-in-out infinite',
              }} />
              <span style={{
                fontSize: 11, color: 'var(--text-muted)',
                fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>Live preview</span>
            </div>
            <p style={{
              fontSize: 14, color: 'var(--text-muted)',
              lineHeight: 1.5, marginBottom: 8,
            }}>
              …il bilancio del Q4 è stato migliore del previsto
            </p>
            <p style={{
              fontSize: 18, fontWeight: 500,
              color: 'var(--text)', lineHeight: 1.5,
            }}>
              Q4 results exceeded expectations.
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="login-divider" />

      {/* ── Right: form ────────────────────────────────────────── */}
      <div style={{
        flex: '0 0 auto',
        width: '100%',
        maxWidth: 420,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 36px',
      }}>
        <div style={{ width: '100%' }}>

          {/* Mobile logo */}
          <div className="login-mobile-logo" style={{ marginBottom: 32 }}>
            <div className="logo-mark" style={{ width: 44, height: 44, marginBottom: 12 }}>
              <span style={{ color: '#111', fontWeight: 800, fontSize: 20 }}>i</span>
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>ISOL Studio</h1>
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Live translation for your team</p>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.02em' }}>
            {step === 'email' ? 'Sign in to your workspace' : 'Check your inbox'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 24, lineHeight: 1.6 }}>
            {step === 'email'
              ? "Enter your work email — we'll send a one-time code."
              : <>Code sent to <strong style={{ color: 'var(--text)' }}>{email}</strong></>}
          </p>

          <div className="card">
            {step === 'email' ? (
              <form onSubmit={requestOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{
                    display: 'block', fontSize: 11, color: 'var(--text-muted)',
                    marginBottom: 7, fontWeight: 700,
                    letterSpacing: '0.09em', textTransform: 'uppercase',
                  }}>
                    Work email
                  </label>
                  <input
                    className="input-field"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required autoFocus
                  />
                </div>
                {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
                <button className="btn-primary" type="submit" disabled={loading || !email} style={{ width: '100%' }}>
                  {loading ? 'Sending…' : 'Continue →'}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input
                  className="input-field"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required autoFocus
                  style={{ textAlign: 'center', fontSize: 28, letterSpacing: '0.3em', fontWeight: 700, padding: '14px' }}
                />
                {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
                <button className="btn-primary" type="submit" disabled={loading || otp.length !== 6} style={{ width: '100%' }}>
                  {loading ? 'Verifying…' : 'Sign in →'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); setError('') }}
                  style={{ background: 'none', color: 'var(--text-muted)', fontSize: 13 }}
                >
                  ← Use a different email
                </button>
              </form>
            )}
          </div>

          <p style={{
            textAlign: 'center', fontSize: 12, color: 'var(--text-muted)',
            marginTop: 20, lineHeight: 1.6,
          }}>
            Audio is streamed for live captioning and never stored.
          </p>
        </div>
      </div>
    </div>
  )
}

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
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send code')
      setStep('otp')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
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
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left — value proposition (hidden on narrow screens) */}
      <div className="login-hero">
        <div style={{ maxWidth: 460 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 52 }}>
            <div style={{
              width: 36, height: 36,
              background: 'var(--blue)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#0a0f1a', fontWeight: 900, fontSize: 18 }}>i</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text)' }}>ISOL</span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(28px, 3vw, 42px)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: 18,
            letterSpacing: '-0.02em',
          }}>
            Every meeting,<br />
            <span style={{ color: 'var(--blue)' }}>in every language.</span>
          </h1>

          <p style={{
            fontSize: 17,
            color: 'rgba(249,250,251,0.60)',
            lineHeight: 1.65,
            marginBottom: 40,
          }}>
            Real-time captions and translation for your team — no installation, no delay.
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[
              { icon: '🌐', text: 'Understand every word, even in foreign-language meetings' },
              { icon: '🎧', text: 'Works with any audio: meetings, webinars, podcasts' },
              { icon: '⚡', text: 'Under 2 seconds latency. No app to install.' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <span style={{
                  fontSize: 20,
                  flexShrink: 0,
                  marginTop: 1,
                  filter: 'grayscale(0.2)',
                }}>{icon}</span>
                <span style={{
                  fontSize: 15,
                  color: 'rgba(249,250,251,0.72)',
                  lineHeight: 1.5,
                }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Fake subtitle preview */}
          <div style={{
            marginTop: 48,
            background: 'rgba(26,210,255,0.06)',
            border: '1px solid rgba(26,210,255,0.16)',
            borderRadius: 14,
            padding: '18px 22px',
          }}>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>Live preview →</p>
            <p style={{ fontSize: 20, fontWeight: 500, color: 'rgba(249,250,251,0.40)', lineHeight: 1.45 }}>
              …il bilancio del Q4 è stato migliore del previsto
            </p>
            <p style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', lineHeight: 1.45, marginTop: 6 }}>
              Q4 results exceeded expectations.
            </p>
          </div>
        </div>
      </div>

      {/* Right — login form */}
      <div style={{
        flex: '0 0 auto',
        width: '100%',
        maxWidth: 440,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        borderLeft: '1px solid var(--border)',
      }}>
        <div style={{ width: '100%' }}>
          {/* Mobile-only logo */}
          <div className="login-mobile-logo">
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 44, height: 44,
              background: 'var(--blue)',
              borderRadius: 12,
              marginBottom: 14,
            }}>
              <span style={{ color: '#0a0f1a', fontWeight: 900, fontSize: 20 }}>i</span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>ISOL Meeting Captions</h1>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 28 }}>Live translation for your team</p>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
            {step === 'email' ? 'Sign in to your workspace' : 'Check your email'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 28 }}>
            {step === 'email'
              ? 'Enter your work email to receive a login code.'
              : `We sent a 6-digit code to ${email}`}
          </p>

          <div className="card">
            {step === 'email' ? (
              <form onSubmit={requestOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>
                    Work email
                  </label>
                  <input
                    className="input-field"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
                <button className="btn-primary" type="submit" disabled={loading || !email}>
                  {loading ? 'Sending…' : 'Send login code →'}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <input
                  className="input-field"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoFocus
                  style={{ textAlign: 'center', fontSize: 28, letterSpacing: '0.25em', fontWeight: 600 }}
                />
                {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
                <button className="btn-primary" type="submit" disabled={loading || otp.length !== 6}>
                  {loading ? 'Verifying…' : 'Sign in →'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); setError('') }}
                  style={{ background: 'none', color: 'var(--text-dim)', fontSize: 13, textDecoration: 'underline' }}
                >
                  ← Use a different email
                </button>
              </form>
            )}
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', marginTop: 20, lineHeight: 1.6 }}>
            Audio is streamed for live captioning and is not stored.
          </p>
        </div>
      </div>
    </div>
  )
}

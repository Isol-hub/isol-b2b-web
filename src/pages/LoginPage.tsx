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

  // Redirect if already logged in
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
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 48, height: 48,
            background: 'var(--blue)',
            borderRadius: 14,
            marginBottom: 16,
          }}>
            <span style={{ color: '#0a0f1a', fontWeight: 800, fontSize: 22 }}>i</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>ISOL Meeting Captions</h1>
          <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>Live translation for your team</p>
        </div>

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
                {loading ? 'Sending…' : 'Send login code'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ textAlign: 'center', paddingBottom: 4 }}>
                <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>
                  Enter the 6-digit code sent to<br/>
                  <strong style={{ color: 'var(--text)' }}>{email}</strong>
                </p>
              </div>
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
                style={{ textAlign: 'center', fontSize: 24, letterSpacing: '0.2em' }}
              />
              {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
              <button className="btn-primary" type="submit" disabled={loading || otp.length !== 6}>
                {loading ? 'Verifying…' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); setError('') }}
                style={{ background: 'none', color: 'var(--text-dim)', fontSize: 13, textDecoration: 'underline' }}
              >
                Use a different email
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', marginTop: 20, lineHeight: 1.6 }}>
          Audio is streamed for live captioning and is not stored.
        </p>
      </div>
    </div>
  )
}

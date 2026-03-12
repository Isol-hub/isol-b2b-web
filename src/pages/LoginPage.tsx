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
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif' }}>

      {/* ── Left: product visual ─────────────────────────────── */}
      <div style={{
        flex: '1 1 0',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        background: '#000',
        display: 'flex', flexDirection: 'column',
      }} className="login-hero">

        {/* Screenshot — full bleed, cropped to show AI notes + annotations */}
        <img
          src="/screens/viewer-fr.png"
          alt=""
          aria-hidden
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'top',
            opacity: 0.55,
          }}
        />

        {/* Gradient vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right,rgba(0,0,0,.5) 0%,rgba(0,0,0,.1) 100%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 60%)',
          pointerEvents: 'none',
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1, padding: 'clamp(28px,4vw,48px)' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div className="logo-mark" style={{ width: 28, height: 28 }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>i</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>ISOL Studio</span>
          </div>

          {/* Bottom text */}
          <div style={{ marginTop: 'auto' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.45)', letterSpacing: '.08em', margin: '0 0 10px' }}>
              🇫🇷 VIEWER · LIVE SESSION
            </p>
            <p style={{ fontSize: 'clamp(22px,3vw,36px)', fontWeight: 700, color: '#fff', margin: '0 0 6px', lineHeight: 1.2, letterSpacing: '-0.03em' }}>
              "j'étais dos au mur…"
            </p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.45)', margin: 0 }}>
              French viewer — Timothée & McConaughey Town Hall
            </p>

            {/* Language row */}
            <div style={{ display: 'flex', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
              {[['🇮🇹','IT'],['🇫🇷','FR'],['🇯🇵','JP'],['🇷🇺','RU'],['🇩🇪','DE'],['🇪🇸','ES']].map(([flag, code]) => (
                <div key={code} style={{
                  background: 'rgba(255,255,255,.1)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,.15)',
                  borderRadius: 999, padding: '5px 12px',
                  fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.75)',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span>{flag}</span> {code}
                </div>
              ))}
            </div>
          </div>
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
        padding: '48px 40px',
        background: '#fff',
      }}>
        <div style={{ width: '100%' }}>

          {/* Mobile logo */}
          <div className="login-mobile-logo" style={{ marginBottom: 36 }}>
            <div className="logo-mark" style={{ width: 44, height: 44, marginBottom: 14 }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>i</span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 5, letterSpacing: '-0.02em' }}>ISOL Studio</h1>
            <p style={{ fontSize: 14, color: '#6e6e73' }}>Live translation for your team</p>
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 7, letterSpacing: '-0.03em' }}>
            {step === 'email' ? 'Sign in' : 'Check your inbox'}
          </h2>
          <p style={{ fontSize: 15, color: '#6e6e73', marginBottom: 32, lineHeight: 1.55 }}>
            {step === 'email'
              ? "Enter your work email. We'll send a one-time code — no password needed."
              : <>Code sent to <strong style={{ color: '#1d1d1f' }}>{email}</strong></>}
          </p>

          {step === 'email' ? (
            <form onSubmit={requestOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6e6e73', marginBottom: 6, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  Work email
                </label>
                <input
                  className="input-field"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required autoFocus
                  style={{ fontSize: 16, height: 50, borderRadius: 12 }}
                />
              </div>
              {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
              <button
                className="btn-primary"
                type="submit"
                disabled={loading || !email}
                style={{ width: '100%', height: 50, fontSize: 15, fontWeight: 700, borderRadius: 12 }}
              >
                {loading ? 'Sending…' : 'Continue →'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6e6e73', marginBottom: 6, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  6-digit code
                </label>
                <input
                  className="input-field"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  placeholder="000 000"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required autoFocus
                  style={{ textAlign: 'center', fontSize: 34, letterSpacing: '0.3em', fontWeight: 800, padding: '14px', height: 72, borderRadius: 12 }}
                />
              </div>
              {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
              <button
                className="btn-primary"
                type="submit"
                disabled={loading || otp.length !== 6}
                style={{ width: '100%', height: 50, fontSize: 15, fontWeight: 700, borderRadius: 12 }}
              >
                {loading ? 'Verifying…' : 'Sign in →'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); setError('') }}
                style={{ background: 'none', border: 'none', color: '#6e6e73', fontSize: 14, cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit' }}
              >
                ← Use a different email
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', fontSize: 12, color: '#aeaeb2', marginTop: 28, lineHeight: 1.6 }}>
            Audio is processed for live captioning only and never stored permanently.
          </p>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveToken, getSession } from '../lib/auth'

type Step = 'email' | 'otp'

/* ── Banner demo data (same as landing) ─────────────────────────────────── */
const DEMO = [
  { lang: 'Italian',  flag: '🇮🇹', prev: 'Il personaggio di Marty Supreme trascura le relazioni', curr: 'per cui Matthew ha vinto l\'Oscar.' },
  { lang: 'French',   flag: '🇫🇷', prev: 'ainsi je pouvais faire mes affaires. J\'étais comme une éponge', curr: 'j\'étais dos au mur. Je me suis dit…' },
  { lang: 'Japanese', flag: '🇯🇵', prev: '前に出ることができたのに、わかるでしょ？', curr: '前に出ることができたのに、知ってるでしょ？' },
  { lang: 'Russian',  flag: '🇷🇺', prev: 'И как, я в тот момент были те,', curr: 'кто-то, о ком я думал. Не ска…' },
]

const CSS = `
@keyframes lp-cur   { 0%,100%{opacity:1} 49%{opacity:1} 50%{opacity:0} }
@keyframes lp-fadU  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes lp-fadD  { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-8px)} }
@keyframes lp-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.75)} }
@keyframes lp-float { 0%,100%{transform:perspective(1400px) rotateX(18deg) translateY(0px)}
                      50%{transform:perspective(1400px) rotateX(18deg) translateY(-6px)} }
@keyframes ann-float-a { 0%,100%{transform:perspective(700px) rotateY(-24deg) rotateX(-3deg) translateY(0px)}
                         50%{transform:perspective(700px) rotateY(-24deg) rotateX(-3deg) translateY(-5px)} }
@keyframes ann-float-b { 0%,100%{transform:perspective(700px) rotateY(-20deg) rotateX(4deg) translateY(0px)}
                         50%{transform:perspective(700px) rotateY(-20deg) rotateX(4deg) translateY(-4px)} }
`

function LiveBanner() {
  const [idx, setIdx] = useState(0)
  const [vis, setVis] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setVis(false)
      setTimeout(() => { setIdx(i => (i + 1) % DEMO.length); setVis(true) }, 420)
    }, 4000)
    return () => clearInterval(t)
  }, [])

  const d = DEMO[idx]
  return (
    <div style={{
      background: 'linear-gradient(100deg,#05091a 0%,#161050 28%,#3b2a8a 52%,#1e6fa0 76%,#0ea5e9 100%)',
      borderRadius: '16px 16px 8px 8px',
      padding: '16px 24px 20px',
      boxShadow: '0 -6px 32px rgba(99,102,241,.22), 0 20px 40px rgba(0,0,0,.4)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 65% 0%,rgba(255,255,255,.06) 0%,transparent 60%)', pointerEvents: 'none' }} />
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,.38)', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', animation: vis ? 'lp-fadU .3s ease both' : 'lp-fadD .25s ease both' }}>
        {d.prev}
      </p>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.4, textShadow: '0 0 18px rgba(120,160,255,.4)', animation: vis ? 'lp-fadU .3s ease .04s both' : 'lp-fadD .25s ease both' }}>
        {d.curr}
        <span style={{ display: 'inline-block', width: 2, height: '0.85em', background: '#fff', marginLeft: 3, verticalAlign: 'text-bottom', animation: 'lp-cur 1s step-end infinite' }} />
      </p>

      {/* Language pills inside banner */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        {DEMO.map((d2, i) => (
          <button
            key={d2.lang}
            onClick={() => { setVis(false); setTimeout(() => { setIdx(i); setVis(true) }, 160) }}
            style={{
              background: i === idx ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.07)',
              border: `1px solid ${i === idx ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.12)'}`,
              borderRadius: 999, padding: '3px 10px',
              fontSize: 11, fontWeight: 600,
              color: i === idx ? '#fff' : 'rgba(255,255,255,.45)',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all .18s',
            }}
          >
            {d2.flag} {d2.lang}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────────────── */
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      <style>{CSS}</style>

      {/* ── LEFT: visual panel ────────────────────────────────── */}
      <div style={{
        flex: '1 1 0', minHeight: '100vh', minWidth: 0,
        background: '#07070e',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(48px,6vw,72px) clamp(28px,4vw,56px)',
        position: 'relative', overflow: 'hidden',
      }} className="login-hero">

        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.10) 0%,transparent 65%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ position: 'absolute', top: 28, left: 32, display: 'flex', alignItems: 'center', gap: 9 }}>
          <div className="logo-mark" style={{ width: 26, height: 26 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>i</span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>ISOL Studio</span>
        </div>

        {/* ── 3D Scene ── */}
        <div style={{ width: '100%', maxWidth: 520, position: 'relative' }}>

          {/* Banner — floating, tilted back */}
          <div style={{
            animation: 'lp-float 5s ease-in-out infinite',
            transformOrigin: 'bottom center',
            marginBottom: -6,
            position: 'relative', zIndex: 2,
          }}>
            <LiveBanner />
          </div>

          {/* YouTube video — flat base */}
          <div style={{
            position: 'relative',
            borderRadius: '4px 4px 18px 18px',
            overflow: 'visible',
            boxShadow: '0 40px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.06)',
          }}>
            <div style={{ borderRadius: '4px 4px 18px 18px', overflow: 'hidden' }}>
              <img
                src="/screens/source-yt.png"
                alt="Variety & CNN Town Hall"
                style={{ width: '100%', display: 'block', height: 300, objectFit: 'cover', objectPosition: 'center 18%' }}
              />
              {/* Bottom gradient */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.65) 0%,transparent 55%)', pointerEvents: 'none' }} />
              {/* Video label */}
              <div style={{ position: 'absolute', bottom: 16, left: 18 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', letterSpacing: '.08em', margin: '0 0 3px' }}>ANY SCREEN AUDIO</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>
                  Timothée Chalamet & Matthew McConaughey
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', margin: '2px 0 0' }}>Variety & CNN Town Hall</p>
              </div>
            </div>

            {/* ANNOTATION 1 — "← Matthew" */}
            <div style={{
              position: 'absolute', top: '26%', right: -16,
              animation: 'ann-float-a 4.5s ease-in-out .5s infinite',
              transformOrigin: 'right center',
              background: 'rgba(255,255,255,0.97)',
              borderRadius: 8, padding: '7px 13px 7px 10px',
              boxShadow: '-10px 10px 32px rgba(0,0,0,.35), -2px 2px 6px rgba(0,0,0,.18)',
              display: 'flex', alignItems: 'center', gap: 7,
              pointerEvents: 'none', zIndex: 10,
            }}>
              <span style={{ color: '#B91C1C', fontSize: 12, opacity: .55 }}>←</span>
              <span style={{ fontFamily: "'Caveat',cursive", fontSize: 20, color: '#B91C1C', fontStyle: 'italic', lineHeight: 1, whiteSpace: 'nowrap' }}>
                Matthew
              </span>
            </div>

            {/* ANNOTATION 2 — "← questions from the audience" */}
            <div style={{
              position: 'absolute', bottom: '20%', right: -16,
              animation: 'ann-float-b 5.5s ease-in-out 1.2s infinite',
              transformOrigin: 'right center',
              background: 'rgba(255,255,255,0.97)',
              borderRadius: 8, padding: '7px 13px 7px 10px',
              boxShadow: '-10px 10px 32px rgba(0,0,0,.35), -2px 2px 6px rgba(0,0,0,.18)',
              pointerEvents: 'none', zIndex: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <span style={{ color: '#B91C1C', fontSize: 12, opacity: .55, marginTop: 3 }}>←</span>
                <span style={{ fontFamily: "'Caveat',cursive", fontSize: 17, color: '#B91C1C', fontStyle: 'italic', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                  questions from<br />the audience
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,.2)', marginTop: 40, textAlign: 'center', lineHeight: 1.6 }}>
          No audio is ever recorded or stored permanently.
        </p>
      </div>

      {/* ── RIGHT: form ──────────────────────────────────────────── */}
      <div style={{
        flex: '0 0 auto', width: '100%', maxWidth: 440,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
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

          {/* Step progress bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 32 }}>
            <div style={{ height: 3, flex: 1, borderRadius: 2, background: '#6366F1' }} />
            <div style={{ height: 3, flex: 1, borderRadius: 2, background: step === 'otp' ? '#6366F1' : '#e5e5ea', transition: 'background .3s' }} />
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 7, letterSpacing: '-0.03em', color: '#1d1d1f' }}>
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
                  placeholder="000000"
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
            No audio is ever recorded or stored.
          </p>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveToken, getSession } from '../lib/auth'
import { sentryFetch } from '../lib/sentryFetch'

type Step = 'email' | 'otp'

const DEMO = [
  { lang: 'Italian',  flag: '🇮🇹', prev: 'Il personaggio di Marty Supreme trascura le relazioni', curr: 'per cui Matthew ha vinto l\'Oscar.' },
  { lang: 'French',   flag: '🇫🇷', prev: 'ainsi je pouvais faire mes affaires. J\'étais comme une éponge', curr: 'j\'étais dos au mur. Je me suis dit…' },
  { lang: 'Japanese', flag: '🇯🇵', prev: '前に出ることができたのに、わかるでしょ？', curr: '前に出ることができたのに、知ってるでしょ？' },
  { lang: 'Russian',  flag: '🇷🇺', prev: 'И как, я в тот момент были те,', curr: 'кто-то, о ком я думал. Не ска…' },
]

const CSS = `
@keyframes lp-cur    { 0%,100%{opacity:1} 49%{opacity:1} 50%{opacity:0} }
@keyframes lp-fadU   { from{opacity:0;transform:translateY(9px)} to{opacity:1;transform:translateY(0)} }
@keyframes lp-fadD   { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-9px)} }
@keyframes lp-pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.75)} }
@keyframes lp-float  { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-7px)} }
@keyframes ann-float-a { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-5px)} }
@keyframes ann-float-b { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-4px)} }
@keyframes lp-scene-in { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
@keyframes lp-text-in  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

@media (max-width:768px) {
  .login-root {
    flex-direction: column !important;
  }
  .login-hero {
    min-height: auto !important;
    padding: 52px 20px 28px !important;
    justify-content: flex-start !important;
  }
  .login-hero-headline {
    margin-bottom: 20px !important;
  }
  .login-hero-headline h1 {
    font-size: 30px !important;
  }
  .login-hero-scene {
    max-width: 100% !important;
  }
  .login-hero-video {
    height: 200px !important;
  }
  .lp-lang-pills {
    flex-wrap: wrap !important;
    gap: 4px !important;
  }
  .login-hero-stats {
    margin-top: 20px !important;
    gap: 20px !important;
  }
  .login-form-wrap {
    max-width: 100% !important;
    width: 100% !important;
    border-left: none !important;
    border-top: 1px solid rgba(0,0,0,0.06) !important;
    padding: 36px 20px 48px !important;
    justify-content: flex-start !important;
  }
  .login-form-inner {
    max-width: 100% !important;
  }
}
`

function LiveBanner() {
  const [idx, setIdx] = useState(0)
  const [vis, setVis] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setVis(false)
      setTimeout(() => { setIdx(i => (i + 1) % DEMO.length); setVis(true) }, 400)
    }, 4000)
    return () => clearInterval(t)
  }, [])

  const d = DEMO[idx]
  return (
    <div style={{
      background: 'linear-gradient(108deg,#05091a 0%,#14104a 28%,#3b2a8a 52%,#1e6fa0 78%,#0ea5e9 100%)',
      borderRadius: 18,
      padding: '18px 22px 22px',
      boxShadow: '0 2px 0 rgba(255,255,255,0.06) inset, 0 24px 48px rgba(99,102,241,.28), 0 6px 16px rgba(0,0,0,.4)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(ellipse at 70% 0%,rgba(255,255,255,.07) 0%,transparent 60%)', pointerEvents:'none' }} />

      {/* LIVE + pills */}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:'#EF4444', animation:'lp-pulse 1.2s ease-in-out infinite', flexShrink:0 }} />
        <span style={{ fontSize:10, fontWeight:800, letterSpacing:'0.12em', color:'#EF4444' }}>LIVE</span>
        <div style={{ flex:1 }} />
        <div className="lp-lang-pills" style={{ display:'flex', gap:5 }}>
          {DEMO.map((d2, i) => (
            <button
              key={d2.lang}
              onClick={() => { setVis(false); setTimeout(() => { setIdx(i); setVis(true) }, 160) }}
              style={{
                background: i === idx ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.07)',
                border: `1px solid ${i === idx ? 'rgba(255,255,255,.38)' : 'rgba(255,255,255,.1)'}`,
                borderRadius: 999, padding: '2px 9px',
                fontSize: 11, fontWeight: 600,
                color: i === idx ? '#fff' : 'rgba(255,255,255,.4)',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all .18s',
              }}
            >
              {d2.flag} {d2.lang}
            </button>
          ))}
        </div>
      </div>

      <p style={{ fontSize:12, color:'rgba(255,255,255,.35)', margin:'0 0 5px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', animation: vis ? 'lp-fadU .3s ease both' : 'lp-fadD .25s ease both' }}>
        {d.prev}
      </p>
      <p style={{ fontSize:20, fontWeight:700, color:'#fff', margin:0, lineHeight:1.38, textShadow:'0 0 20px rgba(120,160,255,.4)', animation: vis ? 'lp-fadU .3s ease .05s both' : 'lp-fadD .25s ease both' }}>
        {d.curr}
        <span style={{ display:'inline-block', width:2, height:'0.82em', background:'#fff', marginLeft:3, verticalAlign:'text-bottom', animation:'lp-cur 1s step-end infinite' }} />
      </p>
    </div>
  )
}

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
      const res = await sentryFetch('/api/auth/request-otp', {
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
      const res = await sentryFetch('/api/auth/verify-otp', {
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
    <div
      className="login-root"
      style={{ minHeight:'100vh', display:'flex', fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif' }}
    >
      <style>{CSS}</style>

      {/* ══ LEFT / TOP: immersive hero ══════════════════════════════════════ */}
      <div
        className="login-hero"
        style={{
          flex:'1 1 0', minHeight:'100vh', minWidth:0,
          background:'#06060f',
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
          padding:'80px clamp(20px,5vw,72px)',
          position:'relative', overflow:'hidden',
        }}
      >
        {/* Ambient glows */}
        <div style={{ position:'absolute', top:-180, left:-120, width:560, height:560, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,.13) 0%,transparent 68%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-160, right:-80, width:440, height:440, borderRadius:'50%', background:'radial-gradient(circle,rgba(14,165,233,.10) 0%,transparent 68%)', pointerEvents:'none' }} />

        {/* Logo */}
        <div style={{ position:'absolute', top:22, left:22, display:'flex', alignItems:'center', gap:9 }}>
          <div className="logo-mark" style={{ width:26, height:26 }}>
            <span style={{ color:'#fff', fontWeight:800, fontSize:12 }}>i</span>
          </div>
          <span style={{ fontSize:15, fontWeight:700, color:'#fff', letterSpacing:'-0.01em' }}>ISOL Studio</span>
        </div>

        {/* Headline */}
        <div className="login-hero-headline" style={{ width:'100%', maxWidth:480, marginBottom:32, animation:'lp-text-in .5s ease both' }}>
          <p style={{
            fontSize:11, fontWeight:700, letterSpacing:'0.14em',
            color:'rgba(255,255,255,.28)', margin:'0 0 14px', textTransform:'uppercase',
          }}>
            Real-time &nbsp;·&nbsp; 42 languages &nbsp;·&nbsp; Zero storage
          </p>
          <h1 style={{
            fontSize:'clamp(30px,3.5vw,44px)', fontWeight:800,
            letterSpacing:'-0.04em', color:'#fff',
            margin:'0 0 12px', lineHeight:1.1, whiteSpace:'pre-line',
          }}>{"Speech becomes\na living document"}</h1>
          <p style={{ fontSize:15, color:'rgba(255,255,255,.38)', lineHeight:1.65, margin:0, maxWidth:380 }}>
            Transcription and translation captured as it happens — in any language, from any source.
          </p>
        </div>

        {/* 3D Scene */}
        <div className="login-hero-scene" style={{ width:'100%', maxWidth:480, position:'relative', animation:'lp-scene-in .55s ease .1s both' }}>

          {/* Banner */}
          <div style={{ animation:'lp-float 5s ease-in-out infinite', marginBottom:14, position:'relative', zIndex:2 }}>
            <LiveBanner />
          </div>

          {/* Video card */}
          <div style={{
            position:'relative', borderRadius:18,
            boxShadow:'0 48px 96px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.07)',
          }}>
            <div style={{ borderRadius:18, overflow:'hidden' }}>
              <img
                src="/screens/source-yt.png"
                alt="Variety & CNN Town Hall"
                className="login-hero-video"
                style={{ width:'100%', display:'block', height:340, objectFit:'cover', objectPosition:'center 18%' }}
              />
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.72) 0%,rgba(0,0,0,.0) 50%)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', bottom:14, left:16 }}>
                <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.35)', letterSpacing:'.1em', margin:'0 0 3px', textTransform:'uppercase' }}>Any screen audio</p>
                <p style={{ fontSize:14, fontWeight:700, color:'#fff', margin:0, lineHeight:1.3 }}>Timothée Chalamet &amp; Matthew McConaughey</p>
                <p style={{ fontSize:11, color:'rgba(255,255,255,.42)', margin:'2px 0 0' }}>Variety &amp; CNN Town Hall</p>
              </div>
            </div>

            {/* Annotation 1 */}
            <div style={{ position:'absolute', top:'22%', right:16, animation:'ann-float-a 4.6s ease-in-out .5s infinite', zIndex:10 }}>
              <div style={{
                transform:'perspective(600px) rotateY(-22deg) rotateX(-4deg)',
                background:'rgba(255,255,255,0.97)', borderRadius:9, padding:'6px 12px 6px 10px',
                boxShadow:'-8px 12px 28px rgba(0,0,0,.32), -2px 3px 8px rgba(0,0,0,.16)',
                display:'flex', alignItems:'center', gap:6, pointerEvents:'none',
              }}>
                <span style={{ color:'#B91C1C', fontSize:12, opacity:.45 }}>←</span>
                <span style={{ fontFamily:"'Caveat',cursive", fontSize:20, color:'#B91C1C', fontStyle:'italic', lineHeight:1, whiteSpace:'nowrap' }}>Matthew</span>
              </div>
            </div>

            {/* Annotation 2 */}
            <div style={{ position:'absolute', bottom:'24%', right:16, animation:'ann-float-b 5.6s ease-in-out 1.2s infinite', zIndex:10 }}>
              <div style={{
                transform:'perspective(600px) rotateY(-18deg) rotateX(5deg)',
                background:'rgba(255,255,255,0.97)', borderRadius:9, padding:'7px 12px 7px 10px',
                boxShadow:'-8px 12px 28px rgba(0,0,0,.32), -2px 3px 8px rgba(0,0,0,.16)',
                pointerEvents:'none',
              }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:6 }}>
                  <span style={{ color:'#B91C1C', fontSize:12, opacity:.45, marginTop:2 }}>←</span>
                  <span style={{ fontFamily:"'Caveat',cursive", fontSize:16, color:'#B91C1C', fontStyle:'italic', lineHeight:1.35, whiteSpace:'nowrap' }}>
                    questions from<br />the audience
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="login-hero-stats" style={{ display:'flex', gap:32, marginTop:32, width:'100%', maxWidth:480, animation:'lp-text-in .5s ease .25s both' }}>
          {([['42+', 'Languages'], ['< 1 s', 'Latency'], ['Zero', 'Audio stored']] as const).map(([val, label]) => (
            <div key={label} style={{ display:'flex', alignItems:'baseline', gap:6 }}>
              <span style={{ fontSize:17, fontWeight:800, color:'rgba(255,255,255,.75)', letterSpacing:'-0.03em' }}>{val}</span>
              <span style={{ fontSize:11, color:'rgba(255,255,255,.28)', fontWeight:500 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ RIGHT / BOTTOM: form ════════════════════════════════════════════ */}
      <div
        className="login-form-wrap"
        style={{
          flex:'0 0 auto', width:'100%', maxWidth:460,
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:'52px 48px',
          background:'#fff',
          borderLeft:'1px solid rgba(0,0,0,0.055)',
        }}
      >
        <div className="login-form-inner" style={{ width:'100%', maxWidth:360 }}>

          {/* Step bar */}
          <div style={{ display:'flex', gap:5, marginBottom:40 }}>
            {(['email', 'otp'] as Step[]).map((s, i) => (
              <div key={s} style={{
                height:3, flex:1, borderRadius:2,
                background: (i === 0 || step === 'otp') ? '#6366F1' : 'rgba(0,0,0,0.08)',
                transition:'background .3s',
              }} />
            ))}
          </div>

          <h2 style={{ fontSize:28, fontWeight:800, margin:'0 0 8px', letterSpacing:'-0.035em', color:'#1a1a1a', lineHeight:1.2 }}>
            {step === 'email' ? 'Sign in to ISOL' : 'Check your inbox'}
          </h2>
          <p style={{ fontSize:15, color:'#6e6e73', margin:'0 0 36px', lineHeight:1.6 }}>
            {step === 'email'
              ? "Enter your work email. We'll send a one-time code — no password needed."
              : <><span style={{ color:'#1a1a1a', fontWeight:600 }}>{email}</span> — a 6-digit code is on its way.</>
            }
          </p>

          {step === 'email' ? (
            <form onSubmit={requestOtp} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ display:'block', fontSize:11, color:'#8e8e93', marginBottom:7, fontWeight:600, letterSpacing:'.07em', textTransform:'uppercase' }}>
                  Work email
                </label>
                <input
                  className="input-field"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required autoFocus
                  style={{ fontSize:16, height:52, borderRadius:12 }}
                />
              </div>
              {error && <p style={{ color:'var(--red)', fontSize:13, margin:0 }}>{error}</p>}
              <button
                className="btn-primary"
                type="submit"
                disabled={loading || !email}
                style={{ width:'100%', height:52, fontSize:15, fontWeight:700, borderRadius:12, marginTop:4 }}
              >
                {loading ? 'Sending…' : 'Continue →'}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ display:'block', fontSize:11, color:'#8e8e93', marginBottom:7, fontWeight:600, letterSpacing:'.07em', textTransform:'uppercase' }}>
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
                  style={{ textAlign:'center', fontSize:36, letterSpacing:'0.28em', fontWeight:800, height:76, borderRadius:12, padding:'14px' }}
                />
              </div>
              {error && <p style={{ color:'var(--red)', fontSize:13, margin:0 }}>{error}</p>}
              <button
                className="btn-primary"
                type="submit"
                disabled={loading || otp.length !== 6}
                style={{ width:'100%', height:52, fontSize:15, fontWeight:700, borderRadius:12, marginTop:4 }}
              >
                {loading ? 'Verifying…' : 'Sign in →'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); setError('') }}
                style={{ background:'none', border:'none', color:'#8e8e93', fontSize:13, cursor:'pointer', padding:'4px 0', fontFamily:'inherit' }}
              >
                ← Use a different email
              </button>
            </form>
          )}

          <div style={{ marginTop:36, paddingTop:24, borderTop:'1px solid rgba(0,0,0,0.06)' }}>
            <p style={{ textAlign:'center', fontSize:12, color:'#aeaeb2', margin:0, lineHeight:1.7 }}>
              No audio is ever recorded or stored permanently.<br />
              <span style={{ color:'#c7c7cc' }}>Your words are yours.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

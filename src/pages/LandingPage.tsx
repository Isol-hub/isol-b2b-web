import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getSession } from '../lib/auth'

/* ─── CSS ────────────────────────────────────────────────────────────────── */
const CSS = `
@keyframes cur   { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes fadU  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadD  { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-10px)} }
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.75)} }
@keyframes heroIn{ from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }

.lp-cta {
  display:inline-flex;align-items:center;justify-content:center;
  background:#fff;color:#000;border:none;
  border-radius:980px;font-size:16px;font-weight:700;
  padding:0 30px;height:52px;cursor:pointer;
  letter-spacing:-.01em;font-family:inherit;
  transition:background .15s,transform .12s;
  white-space:nowrap;
}
.lp-cta:hover{background:#e8e8ed;transform:scale(1.02);}
.lp-cta.inv{background:#000;color:#fff;}
.lp-cta.inv:hover{background:#1d1d1f;}
.lp-cta.accent{background:#6366F1;color:#fff;}
.lp-cta.accent:hover{background:#4f46e5;}

.lp-ghost{
  background:none;border:none;cursor:pointer;
  color:rgba(255,255,255,.5);font-size:15px;font-weight:500;
  letter-spacing:-.01em;font-family:inherit;
  transition:color .15s;padding:0;white-space:nowrap;
}
.lp-ghost:hover{color:#fff;}

.lp-feature-card {
  padding:32px 28px;background:#fff;border-radius:20px;
  border:1px solid rgba(0,0,0,.07);
  transition:box-shadow .2s,transform .18s;
}
.lp-feature-card:hover{
  box-shadow:0 16px 56px rgba(0,0,0,.1);
  transform:translateY(-3px);
}

.lp-plan {
  padding:32px 28px;background:#fff;border-radius:20px;
  border:1.5px solid rgba(0,0,0,.08);
  display:flex;flex-direction:column;
  transition:box-shadow .2s,transform .18s;
}
.lp-plan:hover{box-shadow:0 16px 56px rgba(0,0,0,.08);transform:translateY(-3px);}
.lp-plan.featured{border-color:#6366F1;background:#fafafe;}

.lp-trust-dot{width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.2);flex-shrink:0;}

@media(max-width:768px){
  .lp-hero-h1{font-size:clamp(44px,13vw,72px)!important;line-height:.97!important;}
  .lp-hero-sub{font-size:15px!important;}
  .lp-section-h2{font-size:clamp(28px,9vw,52px)!important;}
  .lp-grid-3{grid-template-columns:1fr!important;}
  .lp-grid-2{grid-template-columns:1fr!important;}
  .lp-trust-bar{flex-wrap:wrap;gap:14px!important;}
  .lp-trust-dot{display:none!important;}
  .lp-viewers{grid-template-columns:1fr!important;}
  .lp-hero-actions{flex-direction:column;align-items:stretch!important;}
  .lp-hero-actions .lp-cta,.lp-hero-actions .lp-ghost{width:100%;justify-content:center;}
}
`

/* ─── Demo banner data ───────────────────────────────────────────────────── */
const DEMO = [
  { lang: 'Italian',  flag: '🇮🇹', prev: 'Il personaggio di Marty Supreme trascura le relazioni', curr: 'per cui Matthew ha vinto l\'Oscar.' },
  { lang: 'French',   flag: '🇫🇷', prev: 'ainsi je pouvais faire mes affaires. J\'étais comme une éponge', curr: 'j\'étais dos au mur. Je me suis dit, tu sais…' },
  { lang: 'Japanese', flag: '🇯🇵', prev: '前に出ることができたのに、わかるでしょ？', curr: '前に出ることができたのに、知ってるでしょ？' },
  { lang: 'Russian',  flag: '🇷🇺', prev: 'И как, я в тот момент были те,', curr: 'кто-то, о ком я думал. Не ска…' },
]

/* ─── Viewer output data (coded, no screenshots) ─────────────────────────── */
const VIEWERS = [
  {
    flag: '🇮🇹', lang: 'Italian', label: 'Live banner',
    prev: 'Il personaggio di Marty Supreme',
    curr: 'per cui Matthew ha vinto l\'Oscar.',
    grad: 'linear-gradient(120deg,#05091a 0%,#161050 35%,#3b2a8a 60%,#0ea5e9 100%)',
  },
  {
    flag: '🇫🇷', lang: 'French', label: 'AI structured',
    prev: 'ainsi je pouvais faire mes affaires.',
    curr: 'j\'étais dos au mur. Je me suis dit…',
    grad: 'linear-gradient(120deg,#0a0520 0%,#2d0a60 35%,#7c1a8a 60%,#e91e8c 100%)',
  },
  {
    flag: '🇯🇵', lang: 'Japanese', label: 'Notes view',
    prev: '前に出ることができたのに、わかるでしょ？',
    curr: '前に出ることができたのに、知ってるでしょ？',
    grad: 'linear-gradient(120deg,#050a1a 0%,#0a2040 35%,#1a4a8a 60%,#0ea5e9 100%)',
  },
]

/* ─── SVG icons ─────────────────────────────────────────────────────────── */
const IconNoRec = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-7 7m-4.2-2.8A7 7 0 0 1 5 12v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    <line x1="2" y1="2" x2="22" y2="22" strokeOpacity=".5"/>
  </svg>
)
const IconClock = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 15.5 14"/>
    <path d="M20 12h2M2 12h2" strokeOpacity=".4"/>
  </svg>
)
const IconShield = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
)
const IconBanner = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="10" rx="3"/>
    <line x1="6" y1="11" x2="10" y2="11"/><line x1="6" y1="14" x2="14" y2="14"/>
    <circle cx="18" cy="11" r="1.2" fill="currentColor" stroke="none"/>
  </svg>
)
const IconDoc = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
  </svg>
)
const IconArchive = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/>
  </svg>
)

/* ─── Animated live banner ───────────────────────────────────────────────── */
function LiveBannerDemo() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % DEMO.length); setVisible(true) }, 450)
    }, 4200)
    return () => clearInterval(t)
  }, [])

  const d = DEMO[idx]

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        background: 'linear-gradient(100deg,#05091a 0%,#161050 28%,#3b2a8a 52%,#1e6fa0 76%,#0ea5e9 100%)',
        borderRadius: 20, padding: '22px 32px 26px',
        boxShadow: '0 32px 80px rgba(0,0,0,.55)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(ellipse at 60% 0%,rgba(255,255,255,.07) 0%,transparent 60%)' }} />
        <p style={{ fontSize: 16, lineHeight: 1.5, color: 'rgba(255,255,255,.4)', margin: '0 0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', animation: visible ? 'fadU .35s ease both' : 'fadD .3s ease both' }}>
          {d.prev}
        </p>
        <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.45, color: '#fff', margin: 0, textShadow: '0 0 24px rgba(100,160,255,.35)', animation: visible ? 'fadU .35s ease .05s both' : 'fadD .3s ease both' }}>
          {d.curr}
          <span style={{ display: 'inline-block', width: 3, height: '1em', background: '#fff', marginLeft: 3, verticalAlign: 'text-bottom', animation: 'cur 1s step-end infinite' }} />
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        {DEMO.map((d2, i) => (
          <button key={d2.lang} onClick={() => { setVisible(false); setTimeout(() => { setIdx(i); setVisible(true) }, 150) }} style={{
            background: i === idx ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.06)',
            border: `1px solid ${i === idx ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.1)'}`,
            borderRadius: 999, padding: '5px 13px',
            fontSize: 12, fontWeight: 600,
            color: i === idx ? '#fff' : 'rgba(255,255,255,.45)',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s',
          }}>{d2.flag} {d2.lang}</button>
        ))}
      </div>
    </div>
  )
}

/* ─── Mini viewer card (coded, no screenshot) ────────────────────────────── */
function ViewerCard({ flag, lang, label, prev, curr, grad }: typeof VIEWERS[0]) {
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,.12)', border: '1px solid rgba(0,0,0,.07)' }}>
      {/* Simulated app chrome */}
      <div style={{ background: '#0f0f14', padding: '10px 14px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ff5f57','#ffbd2e','#28c840'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,.07)', borderRadius: 6, height: 18, display: 'flex', alignItems: 'center', padding: '0 8px' }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', fontWeight: 500 }}>isol.live/s/…</span>
        </div>
      </div>
      {/* Banner */}
      <div style={{ background: grad, padding: '16px 20px 18px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 70% 0%,rgba(255,255,255,.06) 0%,transparent 60%)', pointerEvents: 'none' }} />
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prev}</p>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.4 }}>
          {curr}
          <span style={{ display: 'inline-block', width: 2, height: '1em', background: '#fff', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'cur 1s step-end infinite' }} />
        </p>
      </div>
      {/* Footer label */}
      <div style={{ background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 18 }}>{flag}</span>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>{lang}</p>
          <p style={{ margin: 0, fontSize: 10, color: '#aeaeb2' }}>{label}</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate()
  const session = getSession()
  const goCTA = () => (session ? navigate(`/${session.workspaceSlug}`) : navigate('/login'))

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif', overflowX: 'hidden' }}>
      <style>{CSS}</style>

      {/* ── NAV ────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(20px,4vw,48px)', height: 54,
        background: 'rgba(0,0,0,.72)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div className="logo-mark" style={{ width: 24, height: 24 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 11 }}>i</span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>ISOL</span>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate('/login')} className="lp-ghost" style={{ marginRight: 18 }}>Sign in</button>
        <button onClick={goCTA} className="lp-cta" style={{ height: 36, fontSize: 13, padding: '0 20px' }}>Start free</button>
      </nav>

      {/* ══════════════════════════════════════════════════
          § 1  HERO
      ══════════════════════════════════════════════════ */}
      <section style={{
        paddingTop: 'clamp(110px,14vw,160px)',
        paddingBottom: 'clamp(60px,8vw,100px)',
        paddingLeft: 'clamp(20px,4vw,48px)',
        paddingRight: 'clamp(20px,4vw,48px)',
        background: '#000',
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.1) 0%,transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 860, animation: 'heroIn .7s ease both' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.35)',
            borderRadius: 999, padding: '5px 14px 5px 10px',
            fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.75)',
            marginBottom: 32, letterSpacing: '.02em',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#818CF8', animation: 'pulse 2s infinite', flexShrink: 0 }} />
            47 languages · &lt; 2 second latency
          </div>

          <h1 className="lp-hero-h1" style={{ fontSize: 'clamp(52px,9vw,108px)', fontWeight: 700, lineHeight: 0.97, letterSpacing: '-0.05em', margin: '0 0 28px' }}>
            Real-time interpretation.<br />
            <span style={{ color: 'rgba(255,255,255,.28)' }}>Without interpreters.</span>
          </h1>

          <p className="lp-hero-sub" style={{ fontSize: 'clamp(16px,1.9vw,19px)', color: 'rgba(255,255,255,.48)', lineHeight: 1.68, maxWidth: 520, margin: '0 auto 44px', fontWeight: 400 }}>
            ISOL captures any live audio and streams it as translated text — to every viewer's device, in their language, under 2 seconds.
          </p>

          <div className="lp-hero-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 64 }}>
            <button onClick={goCTA} className="lp-cta">Start a session →</button>
            <button onClick={() => navigate('/login')} className="lp-ghost">Sign in ›</button>
          </div>

          {/* Live banner demo — inline in hero */}
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: 'rgba(255,255,255,.28)', marginBottom: 14, textAlign: 'left' }}>
              WHAT YOUR AUDIENCE SEES · LIVE
            </p>
            <LiveBannerDemo />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 2  TRUST BAR
      ══════════════════════════════════════════════════ */}
      <div style={{ background: '#08080f', borderTop: '1px solid rgba(255,255,255,.05)', borderBottom: '1px solid rgba(255,255,255,.05)', padding: '18px clamp(20px,4vw,48px)' }}>
        <div className="lp-trust-bar" style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          {[
            '< 2s latency',
            '47 languages',
            'Zero audio stored',
            'No hardware',
            'No interpreters',
          ].flatMap((label, i, arr) => [
            <span key={label} style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.4)', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{label}</span>,
            i < arr.length - 1 ? <div key={`dot-${i}`} className="lp-trust-dot" /> : null,
          ])}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          § 3  ONE SOURCE → EVERY LANGUAGE
      ══════════════════════════════════════════════════ */}
      <section style={{ background: '#f5f5f7', color: '#1d1d1f', padding: 'clamp(80px,10vw,130px) clamp(20px,4vw,48px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#0ea5e9', marginBottom: 14 }}>SAME SESSION · EVERY VIEWER</p>
          <h2 className="lp-section-h2" style={{ fontSize: 'clamp(32px,5vw,64px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.07, marginBottom: 14, maxWidth: 720 }}>
            One room.<br />Every language, simultaneously.
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.8vw,18px)', color: '#6e6e73', lineHeight: 1.65, maxWidth: 560, marginBottom: 52 }}>
            Play any screen audio — a meeting, a YouTube video, a lecture. Each viewer joins with a link and reads in their own language. All at the same time.
          </p>

          {/* Source: YouTube screenshot (kept as requested) */}
          <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.14)', marginBottom: 16, position: 'relative', border: '1px solid rgba(0,0,0,.08)' }}>
            <img
              src="/screens/source-yt.png"
              alt="Any screen audio — captured live with ISOL"
              style={{ width: '100%', display: 'block', height: 340, objectFit: 'cover', objectPosition: 'center 15%' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.8) 0%,transparent 55%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 24, left: 28, right: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.45)', letterSpacing: '.08em', margin: '0 0 4px' }}>ANY SCREEN AUDIO</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>
                  Timothée Chalamet & Matthew McConaughey
                  <span style={{ fontWeight: 400, fontSize: 13, display: 'block', opacity: .6, marginTop: 3 }}>Variety & CNN Town Hall · captured live with ISOL</span>
                </p>
              </div>
              <div style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 999, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '.06em' }}>LIVE</span>
              </div>
            </div>
          </div>

          {/* Flow indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 0 18px', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,.1)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: '1px solid rgba(0,0,0,.09)', borderRadius: 999, padding: '6px 16px', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366F1', animation: 'pulse 1.8s infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6e6e73', letterSpacing: '.06em' }}>ISOL TRANSLATES LIVE TO</span>
            </div>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,.1)' }} />
          </div>

          {/* 3 viewer outputs — coded, no screenshots */}
          <div className="lp-viewers" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {VIEWERS.map(v => <ViewerCard key={v.lang} {...v} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 4  FEATURES
      ══════════════════════════════════════════════════ */}
      <section style={{ background: '#fff', color: '#1d1d1f', padding: 'clamp(80px,10vw,130px) clamp(20px,4vw,48px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#6366F1', marginBottom: 14 }}>WHAT YOU GET</p>
          <h2 className="lp-section-h2" style={{ fontSize: 'clamp(32px,5vw,64px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.07, marginBottom: 52, maxWidth: 680 }}>
            More than subtitles.<br />
            <span style={{ color: '#aeaeb2' }}>A complete workspace.</span>
          </h2>

          <div className="lp-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {[
              {
                Icon: IconBanner,
                title: 'Live caption banner',
                color: '#0ea5e9',
                desc: 'A two-line banner updates in real-time as you speak. Viewers open a shared link and read in their own language — no app required.',
                detail: ['< 2s latency', '47 languages', 'Any device'],
              },
              {
                Icon: IconDoc,
                title: 'AI-structured document',
                color: '#6366F1',
                desc: 'Every session is automatically formatted into a titled, structured document. AI-generated sections, highlights, and speaker notes — ready to share.',
                detail: ['Auto title', 'Speaker detection', 'Export ready'],
              },
              {
                Icon: IconArchive,
                title: 'Searchable archive',
                color: '#10B981',
                desc: 'Every session is saved and full-text searchable. Generate a share link with optional expiry to let anyone access the transcript in their language.',
                detail: ['Full-text search', 'Share links', 'Expiry control'],
              },
            ].map(({ Icon, title, color, desc, detail }) => (
              <div key={title} className="lp-feature-card">
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, color }}>
                  <Icon />
                </div>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', margin: '0 0 10px', letterSpacing: '-0.01em' }}>{title}</p>
                <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.65, margin: '0 0 20px' }}>{desc}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {detail.map(d => (
                    <span key={d} style={{ fontSize: 11, fontWeight: 600, color, background: `${color}12`, border: `1px solid ${color}22`, borderRadius: 999, padding: '3px 10px' }}>{d}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 5  PRIVACY
      ══════════════════════════════════════════════════ */}
      <section style={{ background: '#05050d', color: '#fff', padding: 'clamp(80px,10vw,130px) clamp(20px,4vw,48px)', borderTop: '1px solid rgba(255,255,255,.05)' }}>
        <div style={{ maxWidth: 920, margin: '0 auto', textAlign: 'center' }}>

          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', color: '#10B981' }}>
            <IconShield />
          </div>

          <h2 className="lp-section-h2" style={{ fontSize: 'clamp(32px,5vw,64px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.07, marginBottom: 18 }}>
            Your words are yours.
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.9vw,19px)', color: 'rgba(255,255,255,.45)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 52px' }}>
            No audio is ever recorded or stored. Speech is streamed for real-time transcription only — never written to disk, never retained after the session ends.
          </p>

          <div className="lp-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,.05)', maxWidth: 760, margin: '0 auto' }}>
            {[
              { Icon: IconNoRec, title: 'Zero recording', desc: 'Audio is never written to disk or any storage system.' },
              { Icon: IconClock,  title: 'Real-time only', desc: 'Deleted immediately after transcription — not even temporarily stored.' },
              { Icon: IconShield, title: 'GDPR compliant', desc: 'No audio data persists. Right to erasure via workspace deletion.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} style={{ padding: '32px 24px', textAlign: 'center', background: 'rgba(255,255,255,.03)' }}>
                <div style={{ color: '#10B981', display: 'flex', justifyContent: 'center', marginBottom: 14 }}><Icon /></div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>{title}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 6  PRICING TEASER
      ══════════════════════════════════════════════════ */}
      <section style={{ background: '#fff', color: '#1d1d1f', padding: 'clamp(80px,10vw,130px) clamp(20px,4vw,48px)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>

          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#6366F1', marginBottom: 14, textAlign: 'center' }}>PRICING</p>
          <h2 className="lp-section-h2" style={{ fontSize: 'clamp(32px,5vw,64px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.07, marginBottom: 14, textAlign: 'center' }}>
            Start free.<br />
            <span style={{ color: '#aeaeb2' }}>Scale when you need to.</span>
          </h2>
          <p style={{ fontSize: 16, color: '#6e6e73', lineHeight: 1.6, maxWidth: 420, margin: '0 auto 52px', textAlign: 'center' }}>
            No credit card required to start. Upgrade when you need more sessions, languages, or team features.
          </p>

          <div className="lp-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, alignItems: 'start' }}>
            {[
              {
                plan: 'Free',
                price: '€0',
                period: 'forever',
                desc: 'Try ISOL with no commitment.',
                featured: false,
                features: ['3 sessions', '14 languages', 'Live caption banner', 'Shareable links'],
                cta: 'Start free',
                ctaAction: goCTA,
              },
              {
                plan: 'Pro',
                price: '€29',
                period: '/month',
                desc: 'For professionals who use ISOL daily.',
                featured: true,
                features: ['Unlimited sessions', 'All 47 languages', 'AI-structured documents', 'Session archive & search', 'Custom glossary', 'Priority support'],
                cta: 'Start Pro →',
                ctaAction: goCTA,
              },
              {
                plan: 'Studio',
                price: 'Custom',
                period: '',
                desc: 'For teams and organizations.',
                featured: false,
                features: ['Everything in Pro', 'Multiple seats', 'Team workspace', 'Usage analytics', 'Dedicated onboarding', 'SLA & invoice billing'],
                cta: 'Contact us',
                ctaAction: () => navigate('/login'),
              },
            ].map(({ plan, price, period, desc, featured, features, cta, ctaAction }) => (
              <div key={plan} className={`lp-plan${featured ? ' featured' : ''}`}>
                {featured && (
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: '#6366F1', background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.2)', borderRadius: 999, padding: '3px 10px', alignSelf: 'flex-start', marginBottom: 16 }}>
                    MOST POPULAR
                  </div>
                )}
                <p style={{ fontSize: 14, fontWeight: 700, color: featured ? '#6366F1' : '#aeaeb2', letterSpacing: '.04em', margin: '0 0 6px' }}>{plan.toUpperCase()}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', color: '#1d1d1f' }}>{price}</span>
                  {period && <span style={{ fontSize: 14, color: '#aeaeb2', fontWeight: 500 }}>{period}</span>}
                </div>
                <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 24px', lineHeight: 1.5 }}>{desc}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: '#3a3a3c' }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill={featured ? '#6366F1' : '#e5e5ea'}/><polyline points="4 7 6 9 10 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={ctaAction} style={{
                  width: '100%', padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', border: 'none', marginTop: 'auto',
                  background: featured ? '#6366F1' : '#f5f5f7',
                  color: featured ? '#fff' : '#1d1d1f',
                  transition: 'background .15s, transform .12s',
                }}
                onMouseEnter={e => { (e.currentTarget.style.background = featured ? '#4f46e5' : '#e5e5ea') }}
                onMouseLeave={e => { (e.currentTarget.style.background = featured ? '#6366F1' : '#f5f5f7') }}
                >{cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 7  FINAL CTA
      ══════════════════════════════════════════════════ */}
      <section style={{ background: '#000', color: '#fff', textAlign: 'center', padding: 'clamp(88px,12vw,160px) clamp(20px,4vw,48px)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.13) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <h2 className="lp-section-h2" style={{ fontSize: 'clamp(38px,7vw,96px)', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1.0, marginBottom: 24 }}>
            Start now.<br />
            <span style={{ color: 'rgba(255,255,255,.25)' }}>It takes 30 seconds.</span>
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,.4)', marginBottom: 44, maxWidth: 380, margin: '0 auto 44px', lineHeight: 1.6 }}>
            No app, no hardware, no credit card. Open ISOL, share the link, start speaking.
          </p>
          <button onClick={goCTA} className="lp-cta" style={{ fontSize: 17, height: 56, padding: '0 40px' }}>
            Start a session →
          </button>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer style={{ background: '#f5f5f7', borderTop: '1px solid rgba(0,0,0,.09)', padding: '22px clamp(20px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="logo-mark" style={{ width: 18, height: 18 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 9 }}>i</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#aeaeb2' }}>ISOL Studio</span>
        </div>
        <div style={{ display: 'flex', gap: 22 }}>
          <Link to="/legal/privacy" style={{ fontSize: 12, color: '#aeaeb2', textDecoration: 'none' }}>Privacy</Link>
          <Link to="/legal/terms"   style={{ fontSize: 12, color: '#aeaeb2', textDecoration: 'none' }}>Terms</Link>
          <a href="mailto:support@isol.live" style={{ fontSize: 12, color: '#aeaeb2', textDecoration: 'none' }}>Contact</a>
        </div>
      </footer>
    </div>
  )
}

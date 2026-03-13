import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getSession } from '../lib/auth'

/* ─── CSS ────────────────────────────────────────────────────────────────── */
const CSS = `
@keyframes cur   { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes fadU  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadD  { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-10px)} }
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.75)} }
@keyframes heroIn{ from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

.lp-cta {
  display:inline-flex;align-items:center;justify-content:center;
  background:#fff;color:#000;border:none;
  border-radius:980px;font-size:16px;font-weight:700;
  padding:0 30px;height:52px;cursor:pointer;
  letter-spacing:-.01em;font-family:inherit;
  transition:background .15s,transform .12s;white-space:nowrap;
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

.lp-step-num{
  width:36px;height:36px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;font-weight:800;flex-shrink:0;
}

.lp-faq-item{
  border-bottom:1px solid rgba(0,0,0,.07);
  padding:20px 0;cursor:pointer;
}
.lp-faq-item:last-child{border-bottom:none;}

.lp-plan{
  padding:32px 28px;background:#fff;border-radius:20px;
  border:1.5px solid rgba(0,0,0,.08);
  display:flex;flex-direction:column;
  transition:box-shadow .2s,transform .18s;
}
.lp-plan:hover{box-shadow:0 16px 56px rgba(0,0,0,.08);transform:translateY(-3px);}
.lp-plan.featured{border-color:#6366F1;background:#fafafe;}

.lp-trust-dot{width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.2);flex-shrink:0;}

@media(max-width:768px){
  .lp-hero-h1{font-size:clamp(44px,13vw,72px)!important;}
  .lp-section-h2{font-size:clamp(28px,9vw,52px)!important;}
  .lp-grid-3{grid-template-columns:1fr!important;}
  .lp-steps{flex-direction:column!important;}
  .lp-steps-arrow{display:none!important;}
  .lp-viewers-grid{grid-template-columns:1fr 1fr!important;}
  .lp-trust-bar{flex-wrap:wrap;gap:16px!important;justify-content:center!important;}
  .lp-trust-dot{display:none!important;}
  .lp-hero-actions{flex-direction:column;align-items:stretch!important;}
  .lp-hero-actions .lp-cta,.lp-hero-actions .lp-ghost{width:100%;justify-content:center;}
  .lp-host-frame{border-width:6px!important;border-radius:12px!important;}
}
@media(max-width:520px){
  .lp-viewers-grid{grid-template-columns:1fr!important;}
}
`

/* ─── Demo banner data ───────────────────────────────────────────────────── */
const DEMO = [
  { lang: 'Italian',  flag: '🇮🇹', prev: 'Il personaggio di Marty Supreme trascura le relazioni', curr: 'per cui Matthew ha vinto l\'Oscar.' },
  { lang: 'French',   flag: '🇫🇷', prev: 'ainsi je pouvais faire mes affaires. J\'étais comme une éponge', curr: 'j\'étais dos au mur. Je me suis dit, tu sais…' },
  { lang: 'Japanese', flag: '🇯🇵', prev: '前に出ることができたのに、わかるでしょ？', curr: '前に出ることができたのに、知ってるでしょ？' },
  { lang: 'Russian',  flag: '🇷🇺', prev: 'И как, я в тот момент были те,', curr: 'кто-то, о ком я думал. Не ска…' },
]

/* ─── Live banner component ──────────────────────────────────────────────── */
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
        boxShadow: '0 32px 80px rgba(0,0,0,.55)', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(ellipse at 60% 0%,rgba(255,255,255,.07) 0%,transparent 60%)' }} />
        <p style={{ fontSize: 16, lineHeight: 1.5, color: 'rgba(255,255,255,.4)', margin: '0 0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', animation: visible ? 'fadU .35s ease both' : 'fadD .3s ease both' }}>{d.prev}</p>
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
            borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 600,
            color: i === idx ? '#fff' : 'rgba(255,255,255,.45)',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s',
          }}>{d2.flag} {d2.lang}</button>
        ))}
      </div>
    </div>
  )
}

/* ─── SVG icons ─────────────────────────────────────────────────────────── */
const IconCapture = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
)
const IconShare = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
)
const IconRead = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
const IconShield = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
  </svg>
)
const IconNoRec = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-7 7m-4.2-2.8A7 7 0 0 1 5 12v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    <line x1="2" y1="2" x2="22" y2="22" strokeOpacity=".4"/>
  </svg>
)
const IconClock = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 15.5 14"/>
  </svg>
)

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate()
  const session = getSession()
  const goCTA = () => (session ? navigate(`/${session.workspaceSlug}`) : navigate('/login'))
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const FAQS = [
    { q: 'Do viewers need to download anything?', a: 'No. Viewers open a link in any browser — phone, tablet, laptop. No app, no account, no download.' },
    { q: 'Does it work with screen audio, microphone, and live events?', a: 'Yes. ISOL captures any audio source: your microphone, your screen (YouTube, Zoom, any video), or a physical room via mic. Switch in one click.' },
    { q: 'Is the audio ever recorded or stored?', a: 'Never. Audio is streamed for real-time transcription only and discarded immediately. Nothing is written to disk.' },
    { q: 'How do I share the viewer link?', a: 'One click to copy. Send it by message, email, QR code, or project it on screen. Viewers pick their own language when they open it.' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif', overflowX: 'hidden' }}>
      <style>{CSS}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(20px,4vw,48px)', height: 54,
        background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
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
        paddingTop: 'clamp(110px,14vw,160px)', paddingBottom: 'clamp(60px,8vw,100px)',
        paddingLeft: 'clamp(20px,4vw,48px)', paddingRight: 'clamp(20px,4vw,48px)',
        background: '#000', position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      }}>
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.1) 0%,transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 860, animation: 'heroIn .7s ease both' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(99,102,241,.12)', border: '1px solid rgba(99,102,241,.3)', borderRadius: 999, padding: '6px 14px 6px 11px' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#818CF8', animation: 'pulse 2s infinite', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', letterSpacing: '.04em' }}>47 LANGUAGES</span>
            </div>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,.1)' }} />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(14,165,233,.08)', border: '1px solid rgba(14,165,233,.2)', borderRadius: 999, padding: '6px 14px 6px 11px' }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v3.5L7 6" stroke="#38bdf8" strokeWidth="1.4" strokeLinecap="round"/><circle cx="5" cy="5" r="4.25" stroke="#38bdf8" strokeWidth="1.1"/></svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#7dd3fc', letterSpacing: '.04em' }}>&lt; 2s LATENCY</span>
            </div>
          </div>

          <h1 className="lp-hero-h1" style={{ fontSize: 'clamp(52px,9vw,108px)', fontWeight: 700, lineHeight: 0.97, letterSpacing: '-0.05em', margin: '0 0 28px' }}>
            Speak once.<br />
            <span style={{ color: 'rgba(255,255,255,.28)' }}>Understood in 47 languages.</span>
          </h1>

          <p style={{ fontSize: 'clamp(16px,1.9vw,19px)', color: 'rgba(255,255,255,.48)', lineHeight: 1.68, maxWidth: 520, margin: '0 auto 44px', fontWeight: 400 }}>
            ISOL captures any live audio and streams it as real-time translated text — to every device in your audience, in their language, under 2 seconds.
          </p>

          <div className="lp-hero-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 64 }}>
            <button onClick={goCTA} className="lp-cta">Start free — no credit card</button>
            <button onClick={() => navigate('/login')} className="lp-ghost">Sign in ›</button>
          </div>

          {/* Live demo */}
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: 'rgba(255,255,255,.28)', marginBottom: 14, textAlign: 'left' }}>WHAT YOUR AUDIENCE SEES · LIVE DEMO</p>
            <LiveBannerDemo />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 2  TRUST BAR
      ══════════════════════════════════════════════════ */}
      <div style={{ background: '#08080f', borderTop: '1px solid rgba(255,255,255,.05)', borderBottom: '1px solid rgba(255,255,255,.05)', padding: '20px clamp(20px,4vw,48px)' }}>
        <div className="lp-trust-bar" style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
          {[
            { value: '1M+',  label: 'sessions translated' },
            { value: '470',  label: 'organizations' },
            { value: '28',   label: 'countries' },
            { value: '47',   label: 'languages' },
          ].flatMap(({ value, label }, i, arr) => [
            <div key={value} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{value}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', fontWeight: 500, marginTop: 1 }}>{label}</div>
            </div>,
            i < arr.length - 1 ? <div key={`d${i}`} className="lp-trust-dot" style={{ width: 1, height: 32, background: 'rgba(255,255,255,.1)' }} /> : null,
          ])}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          § 3  HOW IT WORKS
      ══════════════════════════════════════════════════ */}
      <section style={{ background: '#fff', color: '#1d1d1f', padding: 'clamp(72px,9vw,120px) clamp(20px,4vw,48px)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#6366F1', marginBottom: 12, textAlign: 'center' }}>HOW IT WORKS</p>
          <h2 className="lp-section-h2" style={{ fontSize: 'clamp(30px,4.5vw,56px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.07, marginBottom: 52, textAlign: 'center' }}>
            Up and running in 30 seconds.
          </h2>

          <div className="lp-steps" style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
            {[
              { Icon: IconCapture, color: '#6366F1', title: 'Open ISOL and start capturing', desc: 'Choose your audio source — screen audio, microphone, or any live input. Hit start.' },
              { Icon: IconShare,   color: '#0ea5e9', title: 'Share the viewer link', desc: 'One click to copy the link. Send it by message, QR code, or project it on screen. No account needed to join.' },
              { Icon: IconRead,    color: '#10B981', title: 'They read in their language', desc: 'Each viewer opens the link and picks their language. The live banner updates as you speak.' },
            ].map(({ Icon, color, title, desc }, i) => (
              <div key={title} style={{ flex: 1, display: 'flex', gap: 0, alignItems: 'stretch' }}>
                <div style={{ flex: 1, padding: '0 clamp(12px,2vw,28px)', borderLeft: i > 0 ? '1px solid rgba(0,0,0,.07)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div className="lp-step-num" style={{ background: `${color}15`, color }}>
                      <Icon />
                    </div>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', margin: '0 0 8px', letterSpacing: '-0.01em' }}>{title}</p>
                  <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.65, margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 4  HOST VIEW — what you control
      ══════════════════════════════════════════════════ */}
      <section style={{ background: '#05050d', padding: 'clamp(72px,9vw,120px) clamp(20px,4vw,48px)', borderTop: '1px solid rgba(255,255,255,.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: 'rgba(255,255,255,.35)', marginBottom: 12 }}>YOUR WORKSPACE</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 32, flexWrap: 'wrap' }}>
            <h2 className="lp-section-h2" style={{ fontSize: 'clamp(30px,4.5vw,56px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.07, margin: 0, maxWidth: 560 }}>
              Everything you need,<br />in one screen.
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,.4)', lineHeight: 1.65, maxWidth: 320, margin: 0 }}>
              Live banner, AI-structured document, speaker detection, highlights, glossary, and share controls — all visible at once.
            </p>
          </div>

          {/* Host screenshot — annotated */}
          <div className="lp-host-frame" style={{ borderRadius: 16, overflow: 'hidden', border: '10px solid #1a1a2e', boxShadow: '0 40px 120px rgba(0,0,0,.7)', position: 'relative' }}>
            {/* Browser bar */}
            <div style={{ background: '#1a1a2e', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {['#ff5f57','#ffbd2e','#28c840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,.06)', borderRadius: 6, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', fontWeight: 500 }}>isolstudio.live</span>
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <img src="/screens/host-it.png" alt="ISOL host workspace" style={{ width: '100%', display: 'block' }} />
              {/* Annotation dots */}
              {[
                { id: 1, color: '#818CF8', top: '12%',  left: '54%',  label: 'Live banner',       desc: 'Updates as you speak' },
                { id: 2, color: '#34D399', top: '28%',  left: '57%',  label: 'AI document',       desc: 'Structured in real-time' },
                { id: 3, color: '#F59E0B', top: '42%',  left: '88%',  label: 'Speaker labels',    desc: 'Each voice, identified' },
                { id: 4, color: '#38BDF8', top: '62%',  left: '8.5%', label: 'Share in 1 click',  desc: 'Link + QR, always ready' },
              ].map(({ id, color, top, left, label, desc }) => (
                <div key={id} style={{ position: 'absolute', top, left, transform: 'translate(-50%,-50%)', zIndex: 10 }}>
                  {/* Outer ring pulse */}
                  <div style={{ position: 'absolute', inset: -5, borderRadius: '50%', border: `1.5px solid ${color}`, opacity: .35, animation: 'pulse 2.5s infinite' }} />
                  {/* Dot */}
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 12px ${color}88`, cursor: 'default', position: 'relative' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#000' }}>{id}</span>
                  </div>
                  {/* Tooltip — right side for left-edge dots, left for right-edge */}
                  <div style={{ position: 'absolute', top: '50%', ...(parseFloat(left) > 50 ? { right: 30, left: 'auto' } : { left: 30 }), transform: 'translateY(-50%)', background: 'rgba(10,10,20,.88)', backdropFilter: 'blur(8px)', border: `1px solid ${color}44`, borderRadius: 8, padding: '7px 11px', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '.01em' }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,.45)', marginTop: 1 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 5  ONE SOURCE → EVERY VIEWER
      ══════════════════════════════════════════════════ */}
      <section style={{ background: '#f5f5f7', color: '#1d1d1f', padding: 'clamp(72px,9vw,120px) clamp(20px,4vw,48px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#0ea5e9', marginBottom: 12 }}>ONE SESSION · EVERY VIEWER</p>
          <h2 className="lp-section-h2" style={{ fontSize: 'clamp(30px,4.5vw,56px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.07, marginBottom: 14, maxWidth: 680 }}>
            Any audio source.<br />Every language, simultaneously.
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.8vw,17px)', color: '#6e6e73', lineHeight: 1.65, maxWidth: 540, marginBottom: 48 }}>
            Play any screen audio — a meeting, a YouTube video, a lecture. Each viewer joins with a link and reads in their own language, all at the same time.
          </p>

          {/* YouTube source */}
          <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.14)', marginBottom: 16, position: 'relative', border: '1px solid rgba(0,0,0,.08)' }}>
            <img src="/screens/source-yt.png" alt="Any screen audio — captured live with ISOL" style={{ width: '100%', display: 'block', height: 340, objectFit: 'cover', objectPosition: 'center 15%' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.82) 0%,transparent 50%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 24, left: 28, right: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.45)', letterSpacing: '.08em', margin: '0 0 4px' }}>ANY SCREEN AUDIO</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>Timothée Chalamet & Matthew McConaughey
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
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366F1', animation: 'pulse 1.8s infinite', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6e6e73', letterSpacing: '.05em' }}>ISOL TRANSLATES LIVE TO</span>
            </div>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,.1)' }} />
          </div>

          {/* Viewer outputs — real screenshots */}
          <div className="lp-viewers-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.52fr', gap: 14, alignItems: 'end' }}>
            {/* French desktop */}
            <div style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,.1)', border: '1px solid rgba(0,0,0,.07)' }}>
              <img src="/screens/viewer-fr.png" alt="French viewer" style={{ width: '100%', display: 'block' }} />
              <div style={{ background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,.06)' }}>
                <span style={{ fontSize: 20 }}>🇫🇷</span>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>French viewer</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#aeaeb2' }}>AI structured · desktop</p>
                </div>
              </div>
            </div>

            {/* Japanese desktop */}
            <div style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,.1)', border: '1px solid rgba(0,0,0,.07)' }}>
              <img src="/screens/viewer-jp.png" alt="Japanese viewer" style={{ width: '100%', display: 'block' }} />
              <div style={{ background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,.06)' }}>
                <span style={{ fontSize: 20 }}>🇯🇵</span>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>Japanese viewer</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#aeaeb2' }}>Notes view · desktop</p>
                </div>
              </div>
            </div>

            {/* Russian mobile — phone frame */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ borderRadius: 36, overflow: 'hidden', border: '8px solid #1d1d1f', boxShadow: '0 24px 60px rgba(0,0,0,.22)', width: '100%', maxWidth: 220, margin: '0 auto' }}>
                <img src="/screens/viewer-mobile.png" alt="Russian mobile viewer" style={{ width: '100%', display: 'block' }} />
              </div>
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1d1d1f' }}>🇷🇺 Russian viewer</p>
                <p style={{ margin: 0, fontSize: 10, color: '#aeaeb2', marginTop: 2 }}>Live banner · mobile</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 6  FAQ — objections
      ══════════════════════════════════════════════════ */}
      <section style={{ background: '#fff', color: '#1d1d1f', padding: 'clamp(72px,9vw,120px) clamp(20px,4vw,48px)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#6366F1', marginBottom: 12, textAlign: 'center' }}>FAQ</p>
          <h2 className="lp-section-h2" style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.07, marginBottom: 44, textAlign: 'center' }}>
            Everything you need to know.
          </h2>
          <div>
            {FAQS.map(({ q, a }, i) => (
              <div key={i} className="lp-faq-item" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', margin: 0, lineHeight: 1.4 }}>{q}</p>
                  <span style={{ fontSize: 20, color: '#aeaeb2', flexShrink: 0, transition: 'transform .2s', transform: openFaq === i ? 'rotate(45deg)' : 'none' }}>+</span>
                </div>
                {openFaq === i && (
                  <p style={{ fontSize: 15, color: '#6e6e73', margin: '12px 0 0', lineHeight: 1.65 }}>{a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 7  PRIVACY
      ══════════════════════════════════════════════════ */}
      <section style={{ background: '#05050d', color: '#fff', padding: 'clamp(72px,9vw,120px) clamp(20px,4vw,48px)', borderTop: '1px solid rgba(255,255,255,.05)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', color: '#10B981' }}>
            <IconShield />
          </div>
          <h2 className="lp-section-h2" style={{ fontSize: 'clamp(30px,4.5vw,56px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.07, marginBottom: 16 }}>
            Your words are yours.
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.9vw,18px)', color: 'rgba(255,255,255,.45)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 48px' }}>
            No audio is ever recorded or stored. Speech is streamed for real-time transcription only — never written to disk, never retained after the session ends.
          </p>
          <div className="lp-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,.05)', maxWidth: 760, margin: '0 auto' }}>
            {[
              { Icon: IconNoRec, title: 'Zero recording',  desc: 'Audio is never written to disk or any storage system.' },
              { Icon: IconClock,  title: 'Real-time only', desc: 'Deleted immediately after transcription. Not even temporarily stored.' },
              { Icon: IconShield, title: 'GDPR compliant', desc: 'No audio data persists. Right to erasure via workspace deletion.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} style={{ padding: '28px 22px', textAlign: 'center', background: 'rgba(255,255,255,.03)' }}>
                <div style={{ color: '#10B981', display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Icon /></div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 5px' }}>{title}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 8  PRICING
      ══════════════════════════════════════════════════ */}
      <section style={{ background: '#fff', color: '#1d1d1f', padding: 'clamp(72px,9vw,120px) clamp(20px,4vw,48px)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#6366F1', marginBottom: 12, textAlign: 'center' }}>PRICING</p>
          <h2 className="lp-section-h2" style={{ fontSize: 'clamp(30px,4.5vw,56px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.07, marginBottom: 12, textAlign: 'center' }}>
            Start free.<br /><span style={{ color: '#aeaeb2' }}>Scale when you need to.</span>
          </h2>
          <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.6, maxWidth: 400, margin: '0 auto 48px', textAlign: 'center' }}>No credit card required. Upgrade when you need unlimited sessions, all languages, or team features.</p>

          <div className="lp-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, alignItems: 'start' }}>
            {[
              { plan: 'Free', price: '€0', period: 'forever', desc: 'Try ISOL with no commitment.', featured: false,
                features: ['3 sessions lifetime', '1 language', 'Live caption banner', 'No AI features'],
                cta: 'Start free', ctaAction: goCTA },
              { plan: 'Pro', price: '€19', period: '/month', desc: 'For professionals who use ISOL daily.', featured: true,
                features: ['30 sessions per month', '47 languages', 'AI notes & formatting', 'Session archive & search', '5 shareable links'],
                cta: 'Start Pro →', ctaAction: goCTA },
              { plan: 'Studio', price: '€49', period: '/month', desc: 'No caps. No interruptions. Just work.', featured: false,
                features: ['Unlimited sessions', '47 languages', 'All AI features', 'Priority processing', 'Unlimited shareable links'],
                cta: 'Start Studio →', ctaAction: goCTA },
            ].map(({ plan, price, period, desc, featured, features, cta, ctaAction }) => (
              <div key={plan} className={`lp-plan${featured ? ' featured' : ''}`}>
                {featured && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: '#6366F1', background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.2)', borderRadius: 999, padding: '3px 10px', alignSelf: 'flex-start', marginBottom: 16 }}>MOST POPULAR</div>}
                <p style={{ fontSize: 13, fontWeight: 700, color: featured ? '#6366F1' : '#aeaeb2', letterSpacing: '.04em', margin: '0 0 5px' }}>{plan.toUpperCase()}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 5 }}>
                  <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', color: '#1d1d1f' }}>{price}</span>
                  {period && <span style={{ fontSize: 13, color: '#aeaeb2' }}>{period}</span>}
                </div>
                <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 22px', lineHeight: 1.5 }}>{desc}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#3a3a3c' }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill={featured ? '#6366F1' : '#e5e5ea'}/><polyline points="4 7 6 9 10 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={ctaAction} style={{ width: '100%', padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: 'none', marginTop: 'auto', background: featured ? '#6366F1' : '#f5f5f7', color: featured ? '#fff' : '#1d1d1f', transition: 'background .15s' }}
                  onMouseEnter={e => { (e.currentTarget.style.background = featured ? '#4f46e5' : '#e5e5ea') }}
                  onMouseLeave={e => { (e.currentTarget.style.background = featured ? '#6366F1' : '#f5f5f7') }}
                >{cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 9  FINAL CTA
      ══════════════════════════════════════════════════ */}
      <section style={{ background: '#000', color: '#fff', textAlign: 'center', padding: 'clamp(88px,12vw,160px) clamp(20px,4vw,48px)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.13) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <h2 className="lp-section-h2" style={{ fontSize: 'clamp(38px,7vw,96px)', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1.0, marginBottom: 22 }}>
            Start now.<br />
            <span style={{ color: 'rgba(255,255,255,.25)' }}>It takes 30 seconds.</span>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.4)', marginBottom: 40, maxWidth: 360, margin: '0 auto 40px', lineHeight: 1.6 }}>
            No app, no hardware, no credit card. Open ISOL, share the link, start speaking.
          </p>
          <button onClick={goCTA} className="lp-cta" style={{ fontSize: 17, height: 56, padding: '0 40px' }}>
            Start free — no credit card
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#f5f5f7', borderTop: '1px solid rgba(0,0,0,.09)', padding: '22px clamp(20px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="logo-mark" style={{ width: 18, height: 18 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 9 }}>i</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#aeaeb2' }}>ISOL Studio © 2026</span>
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

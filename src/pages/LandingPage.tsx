import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/auth'

/* ─── CSS ────────────────────────────────────────────────────────────────── */
const CSS = `
@keyframes cur  { 0%,100%{opacity:1} 49%{opacity:1} 50%{opacity:0} }
@keyframes fadU { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadD { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-10px)} }
@keyframes pulse{ 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.75)} }
@keyframes scanL{ from{transform:translateX(0)} to{transform:translateX(-50%)} }

.lp-cta {
  display:inline-flex;align-items:center;
  background:#fff;color:#000;border:none;
  border-radius:980px;font-size:16px;font-weight:700;
  padding:0 30px;height:52px;cursor:pointer;
  letter-spacing:-.01em;
  transition:background .15s,transform .1s;
}
.lp-cta:hover{background:#e8e8ed;transform:scale(1.02);}
.lp-cta.inv{background:#000;color:#fff;}
.lp-cta.inv:hover{background:#1d1d1f;}

.lp-ghost{
  background:none;border:none;cursor:pointer;
  color:rgba(255,255,255,.55);font-size:15px;font-weight:500;
  letter-spacing:-.01em;font-family:inherit;
  transition:color .15s;padding:0;
}
.lp-ghost:hover{color:#fff;}

.lp-lang-active { opacity:1!important; background:rgba(255,255,255,.15)!important; }
`

/* ─── Demo banner data ───────────────────────────────────────────────────── */
const DEMO = [
  {
    lang: 'Italian', flag: '🇮🇹',
    prev: 'Il personaggio di Marty Supreme trascura le relazioni',
    curr: 'per cui Matthew ha vinto l\'Oscar.',
  },
  {
    lang: 'French', flag: '🇫🇷',
    prev: 'ainsi je pouvais faire mes affaires. J\'étais comme une éponge',
    curr: 'j\'étais dos au mur. Je me suis dit, tu sais…',
  },
  {
    lang: 'Japanese', flag: '🇯🇵',
    prev: '前に出ることができたのに、わかるでしょ？',
    curr: '前に出ることができたのに、知ってるでしょ？',
  },
  {
    lang: 'Russian', flag: '🇷🇺',
    prev: 'И как, я в тот момент были те,',
    curr: 'кто-то, о ком я думал. Не ска…',
  },
]

/* ─── Animated banner ────────────────────────────────────────────────────── */
function LiveBannerDemo() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % DEMO.length)
        setVisible(true)
      }, 450)
    }, 4200)
    return () => clearInterval(t)
  }, [])

  const d = DEMO[idx]

  return (
    <div style={{ width: '100%' }}>
      {/* Banner */}
      <div style={{
        background: 'linear-gradient(100deg, #05091a 0%, #161050 28%, #3b2a8a 52%, #1e6fa0 76%, #0ea5e9 100%)',
        borderRadius: 20, padding: '22px 32px 26px',
        boxShadow: '0 32px 80px rgba(0,0,0,.55)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Shimmer overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(ellipse at 60% 0%,rgba(255,255,255,.07) 0%,transparent 60%)',
        }} />

        <p style={{
          fontSize: 16, lineHeight: 1.5,
          color: 'rgba(255,255,255,.4)',
          margin: '0 0 6px',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          animation: visible ? 'fadU .35s ease both' : 'fadD .3s ease both',
        }}>
          {d.prev}
        </p>
        <p style={{
          fontSize: 22, fontWeight: 700, lineHeight: 1.45,
          color: '#fff', margin: 0,
          textShadow: '0 0 24px rgba(100,160,255,.35)',
          animation: visible ? 'fadU .35s ease .05s both' : 'fadD .3s ease both',
        }}>
          {d.curr}
          <span style={{ display: 'inline-block', width: 3, height: '1em', background: '#fff', marginLeft: 3, verticalAlign: 'text-bottom', animation: 'cur 1s step-end infinite' }} />
        </p>
      </div>

      {/* Language pills */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        {DEMO.map((d2, i) => (
          <button
            key={d2.lang}
            onClick={() => { setVisible(false); setTimeout(() => { setIdx(i); setVisible(true) }, 150) }}
            style={{
              background: i === idx ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.06)',
              border: `1px solid ${i === idx ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.1)'}`,
              borderRadius: 999, padding: '5px 13px',
              fontSize: 12, fontWeight: 600,
              color: i === idx ? '#fff' : 'rgba(255,255,255,.45)',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all .2s',
            }}
          >
            {d2.flag} {d2.lang}
          </button>
        ))}
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

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(20px,4vw,48px)', height: 54,
        background: 'rgba(0,0,0,.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
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
          § 1  STATEMENT
      ══════════════════════════════════════════════════ */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        textAlign: 'center',
        padding: 'clamp(100px,12vw,160px) clamp(20px,4vw,48px) clamp(80px,8vw,120px)',
        background: '#000',
        position: 'relative',
      }}>
        {/* Subtle radial */}
        <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 900 }}>
          <h1 style={{
            fontSize: 'clamp(52px,9vw,120px)',
            fontWeight: 700,
            lineHeight: 0.97,
            letterSpacing: '-0.05em',
            margin: '0 0 32px',
          }}>
            Every word.<br />
            Every language.<br />
            <span style={{ color: 'rgba(255,255,255,.28)' }}>Live.</span>
          </h1>

          <p style={{ fontSize: 'clamp(16px,2vw,20px)', color: 'rgba(255,255,255,.5)', lineHeight: 1.65, maxWidth: 500, margin: '0 auto 44px', fontWeight: 400 }}>
            ISOL captures any live audio and streams it as a real-time, AI-structured document — translated into every language your audience needs.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <button onClick={goCTA} className="lp-cta">
              Start a session →
            </button>
            <button onClick={() => navigate('/login')} className="lp-ghost">
              Sign in ›
            </button>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', opacity: .35, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, letterSpacing: '.1em', fontWeight: 600 }}>SCROLL</span>
          <div style={{ width: 1, height: 32, background: 'linear-gradient(to bottom,rgba(255,255,255,.6),transparent)' }} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 2  LIVE BANNER — the product, animated
      ══════════════════════════════════════════════════ */}
      <section style={{
        background: '#05050d',
        padding: 'clamp(80px,10vw,130px) clamp(20px,4vw,48px)',
        borderTop: '1px solid rgba(255,255,255,.05)',
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: 'rgba(255,255,255,.35)', textAlign: 'center', marginBottom: 14 }}>
            WHAT YOUR AUDIENCE SEES
          </p>
          <h2 style={{ fontSize: 'clamp(32px,5vw,64px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.07, marginBottom: 52, textAlign: 'center' }}>
            The live banner.<br />
            <span style={{ color: 'rgba(255,255,255,.35)' }}>In their language.</span>
          </h2>

          <LiveBannerDemo />

          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.38)', lineHeight: 1.7, maxWidth: 540, margin: '40px auto 0', textAlign: 'center' }}>
            Each viewer selects their language from a link you share. The banner updates as you speak — under 2 seconds latency.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 3  TRANSCRIPT + ANNOTATIONS
      ══════════════════════════════════════════════════ */}
      <section style={{ background: '#fff', color: '#1d1d1f', padding: 'clamp(80px,10vw,130px) clamp(20px,4vw,48px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          <div style={{ marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#6366F1', marginBottom: 14 }}>AI STRUCTURE + COMMENTS</p>
            <h2 style={{ fontSize: 'clamp(32px,5vw,64px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.07, maxWidth: 700 }}>
              Every word becomes<br />a structured document.
            </h2>
          </div>

          {/* Full-width screenshot — French viewer with annotations visible */}
          <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.13)', border: '1px solid rgba(0,0,0,.08)', marginBottom: 24 }}>
            <img
              src="/screens/viewer-fr.png"
              alt="AI-structured transcript in French with margin annotations"
              style={{ width: '100%', display: 'block', objectFit: 'cover', objectPosition: 'top', maxHeight: 600 }}
            />
          </div>

          {/* Caption pointing to features */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 1, background: '#f5f5f7', borderRadius: 16, overflow: 'hidden' }}>
            {[
              { label: 'AI-generated title', desc: 'Speech is automatically grouped into titled, structured sections.' },
              { label: 'Margin annotations', desc: 'Viewers annotate directly in the document — handwritten-style, pinned to a line.' },
              { label: 'Live in any language', desc: 'The same session, structured and delivered in the viewer\'s chosen language.' },
            ].map(({ label, desc }) => (
              <div key={label} style={{ padding: '24px 22px', background: '#fff' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#6366F1', letterSpacing: '.05em', margin: '0 0 8px' }}>{label.toUpperCase()}</p>
                <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 4  ONE SOURCE → EVERY LANGUAGE
      ══════════════════════════════════════════════════ */}
      <section style={{ background: '#f5f5f7', color: '#1d1d1f', padding: 'clamp(80px,10vw,130px) clamp(20px,4vw,48px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: '#0ea5e9', marginBottom: 14 }}>SAME SESSION · EVERY VIEWER</p>
          <h2 style={{ fontSize: 'clamp(32px,5vw,64px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.07, marginBottom: 16, maxWidth: 720 }}>
            One room.<br />Every language, simultaneously.
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.8vw,18px)', color: '#6e6e73', lineHeight: 1.65, maxWidth: 560, marginBottom: 52 }}>
            Play any screen audio — a meeting, a YouTube video, a lecture. Each viewer joins with a link and reads in their own language. All at the same time.
          </p>

          {/* Source video — full width */}
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,.1)', marginBottom: 12, position: 'relative', border: '1px solid rgba(0,0,0,.07)' }}>
            <img
              src="/screens/source-yt.png"
              alt="Source: any screen audio"
              style={{ width: '100%', display: 'block', height: 340, objectFit: 'cover', objectPosition: 'center 15%' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.75) 0%,transparent 55%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 22, left: 24, right: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', margin: '0 0 4px' }}>ANY SCREEN AUDIO</p>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3 }}>
                  Timothée Chalamet & Matthew McConaughey
                  <span style={{ fontWeight: 400, fontSize: 14, display: 'block', opacity: .65, marginTop: 2 }}>Variety & CNN Town Hall · captured live with ISOL</span>
                </p>
              </div>
              <div style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 999, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '.06em' }}>LIVE</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0', marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,.1)' }} />
            <span style={{ padding: '6px 16px', fontSize: 12, fontWeight: 700, color: '#aeaeb2', letterSpacing: '.06em' }}>ISOL TRANSLATES LIVE TO</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,.1)' }} />
          </div>

          {/* 3 viewer outputs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
            {[
              { src: '/screens/host-it.png',   flag: '🇮🇹', lang: 'Italian',  sub: 'AI Notes' },
              { src: '/screens/viewer-fr.png',  flag: '🇫🇷', lang: 'French',   sub: 'AI Structured' },
              { src: '/screens/viewer-jp.png',  flag: '🇯🇵', lang: 'Japanese', sub: 'Notes view' },
            ].map(({ src, flag, lang, sub }) => (
              <div key={lang} style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,.08)', border: '1px solid rgba(0,0,0,.07)', position: 'relative' }}>
                <img src={src} alt={`${lang} viewer`} style={{ width: '100%', display: 'block', height: 220, objectFit: 'cover', objectPosition: 'top' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.65) 0%,transparent 55%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: 14, left: 14 }}>
                  <span style={{ fontSize: 20 }}>{flag}</span>
                  <p style={{ margin: '3px 0 0', fontSize: 14, fontWeight: 700, color: '#fff' }}>{lang}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,.55)', fontWeight: 500 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 5  PRIVACY — zero audio stored
      ══════════════════════════════════════════════════ */}
      <section style={{ background: '#000', color: '#fff', padding: 'clamp(80px,10vw,130px) clamp(20px,4vw,48px)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>

          <div style={{ fontSize: 48, marginBottom: 28 }}>🔒</div>

          <h2 style={{ fontSize: 'clamp(32px,5vw,64px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.07, marginBottom: 20 }}>
            Your words are yours.
          </h2>

          <p style={{ fontSize: 'clamp(16px,2vw,20px)', color: 'rgba(255,255,255,.5)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 44px' }}>
            No audio is ever recorded or stored. Speech is streamed for real-time transcription only — never written to disk, never retained after the session ends.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 1, borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,.06)', maxWidth: 680, margin: '0 auto' }}>
            {[
              { icon: '⊘', title: 'Zero recording', desc: 'Audio is never written to disk.' },
              { icon: '⌛', title: 'Real-time only', desc: 'Deleted immediately after transcription.' },
              { icon: '🔐', title: 'No retention', desc: 'No audio data persists after the session.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ padding: '28px 22px', textAlign: 'center', background: 'rgba(255,255,255,.03)' }}>
                <span style={{ fontSize: 28, display: 'block', marginBottom: 10 }}>{icon}</span>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 5px' }}>{title}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.38)', lineHeight: 1.55, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          § 6  CTA
      ══════════════════════════════════════════════════ */}
      <section style={{ background: '#fff', color: '#1d1d1f', textAlign: 'center', padding: 'clamp(88px,12vw,160px) clamp(20px,4vw,48px)' }}>
        <h2 style={{ fontSize: 'clamp(38px,6.5vw,88px)', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1.0, marginBottom: 28 }}>
          Start now.<br />
          <span style={{ color: '#aeaeb2' }}>It takes 30 seconds.</span>
        </h2>
        <p style={{ fontSize: 17, color: '#6e6e73', marginBottom: 44, maxWidth: 400, margin: '0 auto 44px', lineHeight: 1.6 }}>
          No app, no hardware, no credit card. Open ISOL, share the link, start speaking.
        </p>
        <button onClick={goCTA} className="lp-cta inv" style={{ fontSize: 17, height: 56, padding: '0 36px' }}>
          Start a session →
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#f5f5f7', borderTop: '1px solid rgba(0,0,0,.09)', padding: '20px clamp(20px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="logo-mark" style={{ width: 18, height: 18 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 9 }}>i</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#aeaeb2' }}>ISOL Studio</span>
        </div>
        <div style={{ display: 'flex', gap: 22 }}>
          {['Privacy', 'Terms', 'Contact'].map(l => (
            <a key={l} href="#" style={{ fontSize: 12, color: '#aeaeb2', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}

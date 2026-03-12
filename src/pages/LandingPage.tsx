import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/auth'
import HeroQuotes from '../components/HeroQuotes'

const LP_CSS = `
@keyframes lp-float  { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
@keyframes lp-fadein { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes lp-pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.85)} }
.lp-card-hover { transition:transform .2s ease,box-shadow .2s ease; }
.lp-card-hover:hover { transform:translateY(-4px); box-shadow:0 24px 60px rgba(0,0,0,.18) !important; }
.lp-btn-hero {
  display:inline-flex; align-items:center; gap:8px;
  background:#6366F1; color:#fff; border:none;
  border-radius:999px; font-size:15px; font-weight:700;
  padding:0 32px; height:52px; cursor:pointer;
  box-shadow:0 8px 32px rgba(99,102,241,.45);
  transition:opacity .15s,transform .1s,box-shadow .15s;
  letter-spacing:-.01em;
}
.lp-btn-hero:hover { opacity:.9; transform:translateY(-2px); box-shadow:0 12px 40px rgba(99,102,241,.6); }
`

const LANG_CARDS = [
  { flag: '🇫🇷', lang: 'French',   src: '/screens/viewer-fr.png', quote: 'j\'étais dos au mur. Je me suis dit…' },
  { flag: '🇯🇵', lang: 'Japanese', src: '/screens/viewer-jp.png', quote: '前に出ることができたのに、知ってるでしょ？' },
  { flag: '🇰🇷', lang: 'Russian',  src: '/screens/mobile-ru.png', quote: 'кто-то, о ком я думал. Не ска…', mobile: true },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const session = getSession()
  const goCTA = () => (session ? navigate(`/${session.workspaceSlug}`) : navigate('/login'))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-ui)', overflowX: 'hidden' }}>
      <style>{LP_CSS}</style>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'rgba(7,7,14,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(20px,4vw,48px)', height: 58,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginRight: 36 }}>
          <div className="logo-mark" style={{ width: 26, height: 26 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>i</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: '#fff' }}>ISOL</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/login')}
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, fontSize: 13, fontWeight: 600, padding: '0 18px', height: 36, cursor: 'pointer', transition: 'background .15s' }}
          >
            Sign in
          </button>
          <button onClick={goCTA} className="lp-btn-hero" style={{ height: 36, fontSize: 13, padding: '0 22px' }}>
            Start free
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(165deg, #05050c 0%, #0d0c1e 60%, #0a0e1a 100%)',
        padding: 'clamp(56px,8vw,100px) clamp(20px,4vw,56px) clamp(64px,9vw,112px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Ambient glows */}
        <div style={{ position: 'absolute', top: -120, left: '40%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.13) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(14,165,233,.08) 0%,transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 'clamp(48px,6vw,80px)', alignItems: 'center' }}>

          {/* Left — copy */}
          <div style={{ animation: 'lp-fadein .6s ease-out both' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.28)', borderRadius: 999, padding: '5px 13px', marginBottom: 28 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', animation: 'lp-pulse 2s infinite', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.8)', letterSpacing: '.06em' }}>LIVE · Real-time translation</span>
            </div>

            <h1 style={{ fontSize: 'clamp(38px,5.5vw,66px)', fontWeight: 800, lineHeight: 1.07, letterSpacing: '-0.04em', marginBottom: 22, color: '#fff' }}>
              Speak once.<br />
              <span style={{ background: 'linear-gradient(90deg,#818cf8,#38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Understood everywhere.
              </span>
            </h1>

            <p style={{ fontSize: 'clamp(15px,1.8vw,18px)', color: 'rgba(255,255,255,.55)', lineHeight: 1.75, maxWidth: 420, marginBottom: 38 }}>
              ISOL turns any live audio into real-time captions and translation. One host, unlimited viewers — each reading in their own language.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
              <button onClick={goCTA} className="lp-btn-hero">
                Start a session →
              </button>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.35)' }}>No app, no install</span>
            </div>

            <HeroQuotes fontSize={13} />
          </div>

          {/* Right — product screenshot */}
          <div style={{ position: 'relative', animation: 'lp-fadein .7s ease-out .1s both' }}>
            {/* Main screenshot — browser mockup */}
            <div className="lp-card-hover" style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.08)', background: '#1a1a2e' }}>
              {/* Browser chrome */}
              <div style={{ background: '#12121f', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                {['#EF4444','#F59E0B','#22C55E'].map(c => (
                  <span key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: .45, flexShrink: 0 }} />
                ))}
                <span style={{ flex: 1, marginLeft: 8, background: 'rgba(255,255,255,.05)', borderRadius: 5, padding: '3px 10px', fontSize: 10, color: 'rgba(255,255,255,.3)', textAlign: 'center' }}>
                  isolstudio.live
                </span>
              </div>
              <img
                src="/screens/host-it.png"
                alt="ISOL Studio — live session in Italian"
                style={{ width: '100%', display: 'block', height: 380, objectFit: 'cover', objectPosition: 'top' }}
              />
            </div>

            {/* Floating viewer cards */}
            <div style={{
              position: 'absolute', bottom: -20, right: -16,
              background: 'rgba(12,12,24,0.92)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
              padding: '10px 14px',
              animation: 'lp-float 4s ease-in-out infinite',
              boxShadow: '0 16px 40px rgba(0,0,0,.5)',
              minWidth: 180,
            }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', margin: '0 0 6px', fontWeight: 700, letterSpacing: '.08em' }}>🇫🇷 VIEWER — FRENCH</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.82)', margin: 0, lineHeight: 1.45, fontStyle: 'italic' }}>"j'étais dos au mur…"</p>
            </div>

            <div style={{
              position: 'absolute', top: 40, right: -24,
              background: 'rgba(12,12,24,0.92)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
              padding: '10px 14px',
              animation: 'lp-float 5.5s ease-in-out .8s infinite',
              boxShadow: '0 16px 40px rgba(0,0,0,.5)',
              minWidth: 200,
            }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', margin: '0 0 6px', fontWeight: 700, letterSpacing: '.08em' }}>🇯🇵 VIEWER — JAPANESE</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.82)', margin: 0, lineHeight: 1.45 }}>前に出ることができたのに</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ONE SESSION, EVERY LANGUAGE ──────────────────────────── */}
      <section style={{ padding: 'clamp(64px,9vw,110px) clamp(20px,4vw,48px)', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: 'var(--accent)', marginBottom: 12 }}>MULTILINGUAL · SIMULTANEOUS</p>
            <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 16 }}>
              One session.<br />Every viewer in their language.
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-dim)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
              Viewers join with a link and pick their language. Italian, French, Japanese, Russian — all live, simultaneously.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
            {LANG_CARDS.map(({ flag, lang, src, quote, mobile }) => (
              <div
                key={lang}
                className="lp-card-hover"
                style={{ background: 'var(--canvas)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.07)' }}
              >
                {/* Screenshot preview — top strip (banner area) */}
                <div style={{ overflow: 'hidden', height: mobile ? 200 : 180, position: 'relative', background: '#0d0c1a' }}>
                  <img
                    src={src}
                    alt={`${lang} viewer`}
                    style={{
                      width: '100%', height: '100%',
                      objectFit: 'cover',
                      objectPosition: mobile ? 'top center' : 'top left',
                    }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,transparent 70%,rgba(0,0,0,.3) 100%)', pointerEvents: 'none' }} />
                </div>

                <div style={{ padding: '16px 18px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{flag}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{lang}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 20, padding: '2px 8px' }}>LIVE</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>
                    "{quote}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKS WITH ANY AUDIO ─────────────────────────────────── */}
      <section style={{ background: 'var(--surface-1)', borderTop: '1px solid var(--divider)', borderBottom: '1px solid var(--divider)', padding: 'clamp(56px,8vw,100px) clamp(20px,4vw,48px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 'clamp(40px,5vw,72px)', alignItems: 'center' }}>

          {/* YouTube source screenshot */}
          <div style={{ position: 'relative' }}>
            <div className="lp-card-hover" style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,.14)', border: '1px solid var(--border)' }}>
              <img
                src="/screens/source-yt.png"
                alt="Any video source"
                style={{ width: '100%', display: 'block', height: 280, objectFit: 'cover', objectPosition: 'center top' }}
              />
            </div>
            {/* Label */}
            <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', borderRadius: 8, padding: '5px 11px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '.05em' }}>🎬 Any audio source</span>
            </div>
          </div>

          {/* Copy */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: 'var(--accent)', marginBottom: 14 }}>UNIVERSAL · ZERO SETUP</p>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 18 }}>
              Works with any live audio.
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.75, marginBottom: 28 }}>
              YouTube videos, online conferences, room microphones, screen audio — if it plays, ISOL can transcribe and translate it. No special hardware. No integrations.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['🖥', 'Screen audio — stream any tab or app'],
                ['🎙', 'Microphone — works on any device'],
                ['📱', 'Phone recording — via any browser'],
              ].map(([icon, text]) => (
                <div key={text as string} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 16, width: 34, height: 34, flexShrink: 0, background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.15)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MOBILE ────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(160deg,#05050c 0%,#0f0c20 100%)', padding: 'clamp(64px,9vw,110px) clamp(20px,4vw,48px)', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 'clamp(40px,5vw,72px)', alignItems: 'center' }}>

          {/* Copy */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: '#38bdf8', marginBottom: 14 }}>MOBILE · NO APP REQUIRED</p>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,44px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 18, color: '#fff' }}>
              Your audience,<br />anywhere.
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,.5)', lineHeight: 1.75, marginBottom: 32 }}>
              Viewers join via a shared link on their phone, tablet or laptop. No download, no account — just open and pick a language.
            </p>
            <button onClick={goCTA} className="lp-btn-hero">
              Try it now →
            </button>
          </div>

          {/* Mobile screenshot in phone frame */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: 220,
              background: '#1c1c2a',
              borderRadius: 40,
              padding: '12px 10px',
              boxShadow: '0 40px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.1)',
              animation: 'lp-float 5s ease-in-out infinite',
            }}>
              {/* Phone notch */}
              <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                <div style={{ width: 60, height: 8, background: '#2a2a3a', borderRadius: 99 }} />
              </div>
              {/* Screen */}
              <div style={{ borderRadius: 28, overflow: 'hidden' }}>
                <img
                  src="/screens/mobile-ru.png"
                  alt="ISOL mobile viewer in Russian"
                  style={{ width: '100%', display: 'block', objectFit: 'cover', objectPosition: 'top' }}
                />
              </div>
              {/* Home bar */}
              <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 48, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 99 }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(56px,8vw,100px) clamp(20px,4vw,48px)', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: 'var(--accent)', marginBottom: 12 }}>HOW IT WORKS</p>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Up in 30 seconds</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20 }}>
            {[
              { n: '01', title: 'Start a session', desc: 'Open ISOL, choose Screen or Mic, pick the source language.', color: '#6366F1' },
              { n: '02', title: 'Share the link', desc: 'Viewers open a link on any device and choose their language.', color: '#0EA5E9' },
              { n: '03', title: 'Everyone follows live', desc: 'Speech is transcribed, translated & AI-structured in real time.', color: '#10B981' },
            ].map(({ n, title, desc, color }) => (
              <div key={n} style={{ background: 'var(--canvas)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 22px' }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color, display: 'block', marginBottom: 14 }}>{n}</span>
                <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.01em' }}>{title}</p>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLOSING CTA ──────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(160deg,#05050c 0%,#0d0c1e 100%)', padding: 'clamp(80px,11vw,140px) clamp(20px,4vw,48px)', textAlign: 'center' }}>
        <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <h2 style={{ fontSize: 'clamp(34px,5.5vw,62px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.08, marginBottom: 20, color: '#fff' }}>
            Speech becomes<br />
            <span style={{ background: 'linear-gradient(90deg,#818cf8,#38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              knowledge.
            </span>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.45)', lineHeight: 1.7, marginBottom: 40, maxWidth: 420, margin: '0 auto 40px' }}>
            Start your first session in seconds. No credit card, no setup.
          </p>
          <button onClick={goCTA} className="lp-btn-hero" style={{ fontSize: 16, height: 56, padding: '0 40px' }}>
            Start your first session →
          </button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{ background: '#05050c', borderTop: '1px solid rgba(255,255,255,.06)', padding: '24px clamp(20px,4vw,48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="logo-mark" style={{ width: 20, height: 20 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 10 }}>i</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.3)' }}>ISOL</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy', 'Terms', 'Contact'].map(l => (
            <a key={l} href="#" style={{ fontSize: 12, color: 'rgba(255,255,255,.28)', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}

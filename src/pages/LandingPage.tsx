import { useNavigate } from 'react-router-dom'
import { getSession } from '../lib/auth'

const CSS = `
@keyframes ap-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.8)} }
@keyframes ap-in    { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
.ap-nav-link { font-size:13px;color:#1d1d1f;text-decoration:none;opacity:.72;transition:opacity .15s; }
.ap-nav-link:hover { opacity:1; }
.ap-cta-pill {
  display:inline-flex;align-items:center;gap:6px;
  background:#0071e3;color:#fff;border:none;
  border-radius:980px;font-size:17px;font-weight:600;
  padding:0 26px;height:52px;cursor:pointer;
  transition:background .15s,transform .1s;
  letter-spacing:-.01em;
}
.ap-cta-pill:hover { background:#0077ed;transform:scale(1.02); }
.ap-cta-pill.sm { font-size:14px;height:42px;padding:0 20px; }
.ap-cta-ghost {
  display:inline-flex;align-items:center;gap:4px;
  background:none;border:none;cursor:pointer;
  color:#0071e3;font-size:17px;font-weight:400;
  letter-spacing:-.01em;
  transition:opacity .15s;
}
.ap-cta-ghost:hover { opacity:.7; }
.ap-screen {
  border-radius:16px;
  box-shadow:0 32px 80px rgba(0,0,0,.11),0 0 0 1px rgba(0,0,0,.06);
  overflow:hidden;display:block;width:100%;
}
.ap-phone {
  background:#1c1c1e;border-radius:44px;
  padding:14px 12px;
  box-shadow:0 40px 80px rgba(0,0,0,.22),0 0 0 1px rgba(255,255,255,.1);
  width:220px;
}
`

export default function LandingPage() {
  const navigate = useNavigate()
  const session = getSession()
  const goCTA = () => (session ? navigate(`/${session.workspaceSlug}`) : navigate('/login'))

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#1d1d1f', fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif', overflowX: 'hidden' }}>
      <style>{CSS}</style>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center',
        padding: '0 40px', height: 52,
        gap: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <div className="logo-mark" style={{ width: 24, height: 24 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 11 }}>i</span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>ISOL</span>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate('/login')} className="ap-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          Sign in
        </button>
        <button onClick={goCTA} className="ap-cta-pill sm">
          Start free
        </button>
      </nav>

      {/* ══════════════════════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════════════════════ */}
      <section style={{ textAlign: 'center', padding: '88px 40px 0', background: '#fff' }}>

        <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', color: '#6366F1', marginBottom: 20 }}>
          Real-time · Multilingual · AI-structured
        </p>

        <h1 style={{
          fontSize: 'clamp(48px,7.5vw,96px)',
          fontWeight: 700, lineHeight: 1.04,
          letterSpacing: '-0.04em',
          marginBottom: 24,
        }}>
          Every word.<br />
          <span style={{ color: '#6366F1' }}>Translated.</span> Live.
        </h1>

        <p style={{
          fontSize: 'clamp(17px,2.2vw,21px)',
          color: '#6e6e73', lineHeight: 1.65,
          maxWidth: 560, margin: '0 auto 40px',
          fontWeight: 400,
        }}>
          ISOL captures any live audio and delivers it as a real-time structured document — in every language your audience needs.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 72 }}>
          <button onClick={goCTA} className="ap-cta-pill">
            Start a session →
          </button>
          <button onClick={() => navigate('/login')} className="ap-cta-ghost">
            Sign in <span style={{ fontSize: 18 }}>›</span>
          </button>
        </div>

        {/* Hero screenshot — full width */}
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px' }}>
          <img
            src="/screens/host-it.png"
            alt="ISOL Studio live session — AI Notes in Italian"
            className="ap-screen"
            style={{ objectFit: 'cover', objectPosition: 'top', height: 'auto', maxHeight: 580 }}
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          2. ANNOTATIONS FEATURE
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: '#f5f5f7', padding: 'clamp(80px,10vw,140px) 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Section label */}
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', color: '#6366F1', marginBottom: 16 }}>
              COMMENTS & HIGHLIGHTS
            </p>
            <h2 style={{ fontSize: 'clamp(36px,5.5vw,72px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 18 }}>
              The full picture,<br />annotated.
            </h2>
            <p style={{ fontSize: 'clamp(16px,2vw,19px)', color: '#6e6e73', lineHeight: 1.65, maxWidth: 500, margin: '0 auto' }}>
              Viewers annotate any line with handwritten-style comments, pinned directly in the margin — tied to the exact moment they were made.
            </p>
          </div>

          {/* Two screenshots side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>

            {/* French viewer with annotations */}
            <div style={{ position: 'relative' }}>
              <img
                src="/screens/viewer-fr.png"
                alt="Viewer in French with margin annotations"
                className="ap-screen"
                style={{ objectFit: 'cover', objectPosition: 'top', height: 520 }}
              />
              <div style={{
                position: 'absolute', bottom: 20, left: 20,
                background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
                borderRadius: 12, padding: '10px 16px',
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#6e6e73', margin: '0 0 2px', letterSpacing: '.04em' }}>🇫🇷 VIEWER — FRENCH</p>
                <p style={{ fontSize: 13, color: '#1d1d1f', margin: 0, fontStyle: 'italic' }}>Live AI structured transcript</p>
              </div>
            </div>

            {/* Japanese viewer */}
            <div style={{ position: 'relative' }}>
              <img
                src="/screens/viewer-jp.png"
                alt="Viewer in Japanese with margin annotations"
                className="ap-screen"
                style={{ objectFit: 'cover', objectPosition: 'top', height: 520 }}
              />
              <div style={{
                position: 'absolute', bottom: 20, left: 20,
                background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
                borderRadius: 12, padding: '10px 16px',
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#6e6e73', margin: '0 0 2px', letterSpacing: '.04em' }}>🇯🇵 VIEWER — JAPANESE</p>
                <p style={{ fontSize: 13, color: '#1d1d1f', margin: 0, fontStyle: 'italic' }}>Same session, own language</p>
              </div>
            </div>
          </div>

          {/* Feature callouts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginTop: 24 }}>
            {[
              { icon: '✍️', title: 'Margin annotations', desc: 'Handwritten-style comments pinned to transcript lines, visible to everyone.' },
              { icon: '✦', title: 'AI structured notes', desc: 'Speech is automatically formatted into titled sections with bullet points.' },
              { icon: '💬', title: 'Line comments', desc: 'Any viewer can comment on any line — visible live alongside the transcript.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ background: '#fff', borderRadius: 16, padding: '22px 20px' }}>
                <span style={{ fontSize: 24, display: 'block', marginBottom: 10 }}>{icon}</span>
                <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px', letterSpacing: '-0.01em' }}>{title}</p>
                <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          3. ONE SOURCE → EVERY LANGUAGE
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: '#fff', padding: 'clamp(80px,10vw,140px) 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', color: '#0ea5e9', marginBottom: 16 }}>
              SIMULTANEOUS · MULTILINGUAL
            </p>
            <h2 style={{ fontSize: 'clamp(36px,5.5vw,72px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 18 }}>
              One session.<br />Every language.
            </h2>
            <p style={{ fontSize: 'clamp(16px,2vw,19px)', color: '#6e6e73', lineHeight: 1.65, maxWidth: 560, margin: '0 auto' }}>
              Each viewer picks their own language. The same session — live, simultaneously — in Italian, French, Japanese, Russian, and more.
            </p>
          </div>

          {/* Source → outputs layout */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Source: YouTube screenshot */}
            <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.1),0 0 0 1px rgba(0,0,0,.06)' }}>
              <img
                src="/screens/source-yt.png"
                alt="Source: Variety & CNN Town Hall"
                style={{ width: '100%', display: 'block', height: 320, objectFit: 'cover', objectPosition: 'center 20%' }}
              />
              {/* Dark overlay + label */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.72) 0%,transparent 55%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: 24, left: 28, right: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', margin: '0 0 4px' }}>ANY SCREEN AUDIO · YOUTUBE · MEETINGS · LECTURES</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                    Timothée Chalamet & Matthew McConaughey<br />
                    <span style={{ fontWeight: 400, fontSize: 14, opacity: .7 }}>Variety & CNN Town Hall · Captured live with ISOL</span>
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 999, padding: '6px 14px' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', flexShrink: 0, animation: 'ap-pulse 2s infinite' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '.05em' }}>LIVE</span>
                </div>
              </div>
            </div>

            {/* Connector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ height: 1, flex: 1, background: 'linear-gradient(to right,transparent,rgba(0,0,0,.1))' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f5f7', borderRadius: 999, padding: '8px 18px', border: '1px solid rgba(0,0,0,.08)' }}>
                <div className="logo-mark" style={{ width: 18, height: 18 }}>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: 8 }}>i</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6e6e73', letterSpacing: '.04em' }}>ISOL · instant translation</span>
              </div>
              <div style={{ height: 1, flex: 1, background: 'linear-gradient(to left,transparent,rgba(0,0,0,.1))' }} />
            </div>

            {/* Output: 3 viewer screenshots */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
              {[
                { src: '/screens/host-it.png',   flag: '🇮🇹', lang: 'Italian',  pos: 'top' },
                { src: '/screens/viewer-fr.png',  flag: '🇫🇷', lang: 'French',   pos: 'top' },
                { src: '/screens/viewer-jp.png',  flag: '🇯🇵', lang: 'Japanese', pos: 'top' },
              ].map(({ src, flag, lang, pos }) => (
                <div key={lang} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,.09),0 0 0 1px rgba(0,0,0,.06)' }}>
                  <img
                    src={src}
                    alt={`${lang} viewer`}
                    style={{ width: '100%', display: 'block', height: 240, objectFit: 'cover', objectPosition: pos }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.6) 0%,transparent 60%)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: 14, left: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{flag}</span>
                    <div>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', margin: 0, fontWeight: 600, letterSpacing: '.05em' }}>VIEWER</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>{lang}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          4. MOBILE
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: '#1d1d1f', padding: 'clamp(80px,10vw,140px) 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 64, alignItems: 'center' }}>

          <div>
            <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', color: '#38bdf8', marginBottom: 16 }}>MOBILE · NO APP</p>
            <h2 style={{ fontSize: 'clamp(34px,5vw,64px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.07, marginBottom: 20, color: '#f5f5f7' }}>
              Follow live.<br />From anywhere.
            </h2>
            <p style={{ fontSize: 'clamp(16px,2vw,19px)', color: 'rgba(245,245,247,.5)', lineHeight: 1.65, marginBottom: 36, maxWidth: 420 }}>
              Viewers join on any device via a shared link. No download, no account — open and pick a language. The transcript follows live.
            </p>
            <button onClick={goCTA} className="ap-cta-pill">
              Try it now →
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="ap-phone">
              <div style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 56, height: 6, background: 'rgba(255,255,255,.12)', borderRadius: 99 }} />
              </div>
              <div style={{ borderRadius: 30, overflow: 'hidden' }}>
                <img src="/screens/mobile-ru.png" alt="Mobile viewer in Russian" style={{ width: '100%', display: 'block' }} />
              </div>
              <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 44, height: 4, background: 'rgba(255,255,255,.12)', borderRadius: 99 }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          5. CTA
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: '#f5f5f7', textAlign: 'center', padding: 'clamp(88px,12vw,160px) 40px' }}>
        <h2 style={{ fontSize: 'clamp(38px,6vw,80px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 20 }}>
          Speech becomes<br />
          <span style={{ color: '#6366F1' }}>knowledge.</span>
        </h2>
        <p style={{ fontSize: 'clamp(16px,2vw,19px)', color: '#6e6e73', lineHeight: 1.65, marginBottom: 40, maxWidth: 460, margin: '0 auto 40px' }}>
          Start your first session in seconds. No credit card. No setup.
        </p>
        <button onClick={goCTA} className="ap-cta-pill" style={{ fontSize: 19, height: 58, padding: '0 36px' }}>
          Start a session →
        </button>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{ background: '#f5f5f7', borderTop: '1px solid rgba(0,0,0,.1)', padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="logo-mark" style={{ width: 20, height: 20 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 10 }}>i</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73' }}>ISOL Studio</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy', 'Terms', 'Contact'].map(l => (
            <a key={l} href="#" style={{ fontSize: 12, color: '#6e6e73', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}

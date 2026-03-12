import { useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  workspaceSlug: string
  onDone: () => void
}

const KEYFRAMES = `
@keyframes ob-pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
@keyframes ob-line-in{ from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
@keyframes ob-fade-up{ from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
@keyframes ob-ring   { 0%{opacity:0.6;transform:scale(1)} 100%{opacity:0;transform:scale(2.1)} }
@keyframes ob-illo   { from{opacity:0} to{opacity:1} }
@keyframes ob-in-r   { from{opacity:0;transform:translateX(26px)} to{opacity:1;transform:translateX(0)} }
@keyframes ob-in-l   { from{opacity:0;transform:translateX(-26px)} to{opacity:1;transform:translateX(0)} }
`

const STEPS = [
  {
    tagNum: '01', tag: 'Welcome',
    headline: 'Speech becomes\na living document',
    sub: 'Real-time transcription, translation & AI formatting — captured as it happens.',
    accent: '#6366F1',
    illoBg: 'linear-gradient(160deg,#1e1b4b 0%,#2e2867 55%,#18164a 100%)',
  },
  {
    tagNum: '02', tag: 'Capture',
    headline: 'Any source,\nany language',
    sub: 'Connect your mic, a phone, or a room device. Select the target language and tap Start.',
    accent: '#0EA5E9',
    illoBg: 'linear-gradient(160deg,#071b2e 0%,#0a3a5a 55%,#061524 100%)',
  },
  {
    tagNum: '03', tag: 'Share',
    headline: 'One link,\ninstant access',
    sub: 'After every session, generate a shareable link. Viewers follow live or browse the full transcript.',
    accent: '#10B981',
    illoBg: 'linear-gradient(160deg,#022318 0%,#04422e 55%,#011a10 100%)',
  },
]

// ── Illustration: animated live transcript ──────────────────────────────────
function TranscriptIllo({ accent }: { accent: string }) {
  const rows = [91, 76, 84, 57, 88, 44]
  return (
    <div style={{ padding: '22px 26px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%', background: '#EF4444', flexShrink: 0,
          animation: 'ob-pulse 1.3s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: '#EF4444' }}>LIVE</span>
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: 11, color: 'rgba(255,255,255,0.4)',
          background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '2px 9px',
        }}>🇮🇹 → 🇬🇧</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((w, i) => (
          <div key={i} style={{
            height: 8, borderRadius: 4, width: `${w}%`,
            background: i === rows.length - 1
              ? 'rgba(255,255,255,0.9)'
              : `rgba(255,255,255,${0.10 + i * 0.07})`,
            animation: `ob-line-in 0.28s ease-out ${i * 0.07}s both`,
          }} />
        ))}
        <div style={{
          height: 8, width: 16, borderRadius: 4, background: accent,
          animation: 'ob-pulse 0.95s ease-in-out infinite',
        }} />
      </div>
    </div>
  )
}

// ── Illustration: mic + language grid ──────────────────────────────────────
function CaptureIllo({ accent }: { accent: string }) {
  const langs = [['🇮🇹','IT'],['🇬🇧','EN'],['🇰🇷','KO'],['🇩🇪','DE'],['🇫🇷','FR'],['🇪🇸','ES']]
  return (
    <div style={{ padding: '18px 26px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute',
            width: 60 + (i + 1) * 28, height: 60 + (i + 1) * 28,
            borderRadius: '50%',
            border: `1.5px solid ${accent}`,
            opacity: 0.3,
            animation: `ob-ring 2.2s ease-out ${i * 0.65}s infinite`,
          }} />
        ))}
        <div style={{
          width: 50, height: 50, borderRadius: '50%',
          background: `${accent}18`, border: `1.5px solid ${accent}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>🎙</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {langs.map(([flag, code], i) => (
          <span key={code} style={{
            fontSize: 12, fontWeight: 600,
            background: `${accent}12`, border: `1px solid ${accent}25`,
            color: 'rgba(255,255,255,0.6)', borderRadius: 20, padding: '4px 11px',
            animation: `ob-fade-up 0.28s ease-out ${i * 0.055}s both`,
          }}>{flag} {code}</span>
        ))}
      </div>
    </div>
  )
}

// ── Illustration: share link + live viewers ────────────────────────────────
function ShareIllo({ accent }: { accent: string }) {
  const avatarColors = ['#6366F1', '#0EA5E9', '#10B981']
  return (
    <div style={{ padding: '22px 26px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>
      {/* Link bar */}
      <div style={{
        background: `${accent}0e`, border: `1px solid ${accent}26`,
        borderRadius: 10, padding: '9px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
        animation: 'ob-fade-up 0.28s ease-out both',
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>🔗</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', flex: 1, fontFamily: 'monospace', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          isol.studio/s/<span style={{ color: accent }}>k9mx7p</span>
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', flexShrink: 0, fontWeight: 600 }}>⎘</span>
      </div>
      {/* Viewers row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, animation: 'ob-fade-up 0.28s ease-out 0.09s both' }}>
        <div style={{ display: 'flex' }}>
          {avatarColors.map((c, i) => (
            <div key={i} style={{
              width: 26, height: 26, borderRadius: '50%',
              background: c, border: '2px solid #022318',
              marginLeft: i > 0 ? -7 : 0, position: 'relative', zIndex: 3 - i,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#fff',
            }}>{String.fromCharCode(65 + i)}</div>
          ))}
        </div>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>3 viewers</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, animation: 'ob-pulse 1.5s infinite' }} />
          <span style={{ fontSize: 10, fontWeight: 800, color: accent, letterSpacing: '0.08em' }}>LIVE</span>
        </div>
      </div>
      {/* Comment preview */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 12px',
        border: '1px solid rgba(255,255,255,0.05)',
        animation: 'ob-fade-up 0.28s ease-out 0.18s both',
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.28)', display: 'block', marginBottom: 3 }}>Alex · just now</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.52)', fontStyle: 'italic', lineHeight: 1.4 }}>"Can we revisit the budget point?"</span>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function OnboardingModal({ workspaceSlug, onDone }: Props) {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const go = (delta: number) => {
    setDir(delta)
    setStep(s => s + delta)
  }

  const finish = () => {
    localStorage.setItem(`isol_onboarded_${workspaceSlug}`, '1')
    onDone()
  }

  const illos = [
    <TranscriptIllo accent={STEPS[0].accent} />,
    <CaptureIllo accent={STEPS[1].accent} />,
    <ShareIllo accent={STEPS[2].accent} />,
  ]

  return createPortal(
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 20000,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
        <div style={{
          width: '100%', maxWidth: 500,
          background: 'var(--canvas)',
          border: '1px solid var(--border)',
          borderRadius: 22,
          boxShadow: '0 40px 100px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03)',
          overflow: 'hidden',
        }}>

          {/* ── Illustration zone ── */}
          <div
            key={`illo-${step}`}
            style={{
              background: current.illoBg,
              minHeight: 190,
              position: 'relative', overflow: 'hidden',
              animation: 'ob-illo 0.3s ease-out both',
            }}
          >
            {/* subtle dot-grid */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.035) 1px,transparent 1px)',
              backgroundSize: '22px 22px',
            }} />
            {illos[step]}
          </div>

          {/* ── Content zone ── */}
          <div
            key={`body-${step}`}
            style={{
              padding: '24px 28px 26px',
              animation: `${dir >= 0 ? 'ob-in-r' : 'ob-in-l'} 0.26s cubic-bezier(0.22,1,0.36,1) both`,
            }}
          >
            {/* Step badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
              color: current.accent,
              background: `${current.accent}18`,
              border: `1px solid ${current.accent}30`,
              borderRadius: 20, padding: '3px 10px',
              marginBottom: 14,
              userSelect: 'none',
            }}>
              {current.tagNum}&thinsp;/&thinsp;{STEPS.length}&ensp;·&ensp;{current.tag.toUpperCase()}
            </span>

            {/* Headline */}
            <h2 style={{
              fontSize: 25, fontWeight: 800, letterSpacing: '-0.03em',
              color: 'var(--text)', margin: '0 0 9px', lineHeight: 1.2,
              whiteSpace: 'pre-line',
            }}>
              {current.headline}
            </h2>

            {/* Subtext */}
            <p style={{
              fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.7,
              margin: '0 0 22px',
            }}>
              {current.sub}
            </p>

            {/* Progress bar */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 20 }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{
                  height: 3, borderRadius: 2,
                  flex: i === step ? 2.5 : 1,
                  background: i <= step ? current.accent : 'var(--surface-3)',
                  opacity: i === step ? 1 : i < step ? 0.5 : 0.18,
                  transition: 'flex 0.35s ease, background 0.25s, opacity 0.25s',
                }} />
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {step === 0 ? (
                <button
                  onClick={finish}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontSize: 12, color: 'var(--text-muted)',
                    textDecoration: 'underline', textUnderlineOffset: 3,
                  }}
                >
                  Skip tour
                </button>
              ) : (
                <button
                  onClick={() => go(-1)}
                  className="btn-icon"
                  style={{ fontSize: 13, padding: '8px 14px' }}
                >
                  ← Back
                </button>
              )}

              <div style={{ flex: 1 }} />

              <button
                onClick={isLast ? finish : () => go(1)}
                style={{
                  background: current.accent,
                  color: '#fff', border: 'none',
                  borderRadius: 10, fontSize: 13, fontWeight: 700,
                  padding: '9px 22px', cursor: 'pointer',
                  boxShadow: `0 4px 22px ${current.accent}44`,
                  transition: 'opacity 0.15s, transform 0.1s, box-shadow 0.15s',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = '0.88'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = `0 7px 28px ${current.accent}55`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = `0 4px 22px ${current.accent}44`
                }}
              >
                {isLast ? 'Get started ✦' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

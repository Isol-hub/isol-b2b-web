interface Props {
  current: string
  previous: string
  isActive: boolean
}

export default function PipCaption({ current, previous, isActive }: Props) {
  const isEmpty = !current && !previous

  return (
    <div style={{
      height: '100vh',
      background: '#07090F',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      boxSizing: 'border-box',
      overflow: 'hidden',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
    }}>

      {/* Top accent bar — active = indigo→cyan gradient, idle = barely visible */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2, flexShrink: 0,
        background: isActive
          ? 'linear-gradient(90deg, #6366F1 0%, #22D3EE 55%, transparent 100%)'
          : 'rgba(255,255,255,0.05)',
        transition: 'background 1.2s ease',
      }} />

      {/* ISOL watermark */}
      <span style={{
        position: 'absolute', top: 9, left: 13,
        fontSize: 8, fontWeight: 800, letterSpacing: '0.24em',
        color: 'rgba(255,255,255,0.11)',
        userSelect: 'none',
      }}>
        ISOL
      </span>

      {/* Live indicator — only when active */}
      <div style={{
        position: 'absolute', top: 8, right: 13,
        display: 'flex', alignItems: 'center', gap: 5,
        opacity: isActive ? 1 : 0,
        transition: 'opacity 0.6s ease',
      }}>
        <span style={{
          fontSize: 8, fontWeight: 700, letterSpacing: '0.16em',
          color: 'rgba(34,197,94,0.65)', userSelect: 'none',
        }}>LIVE</span>
        <div style={{
          width: 5, height: 5, borderRadius: '50%',
          background: '#22C55E',
          boxShadow: '0 0 5px rgba(34,197,94,0.80)',
          animation: 'pipLiveDot 2s ease-in-out infinite',
        }} />
      </div>

      {/* Ambient glow — follows the active text area */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '75%',
        background: 'radial-gradient(ellipse at 50% 100%, rgba(99,102,241,0.09) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Content — bottom-aligned, like TV subtitles */}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '0 18px 16px',
        display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        {isEmpty ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingBottom: 2 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              animation: 'pipWait 2.5s ease-in-out infinite',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: 11, fontWeight: 500, letterSpacing: '0.06em',
              color: 'rgba(255,255,255,0.22)', userSelect: 'none',
            }}>
              Waiting for speech…
            </span>
          </div>
        ) : (
          <>
            {previous && (
              <p style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.45,
                color: 'rgba(255,255,255,0.32)',
                fontWeight: 400,
                letterSpacing: '-0.01em',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
              }}>
                {previous}
              </p>
            )}
            <p
              key={current}
              style={{
                margin: 0,
                fontSize: 22,
                lineHeight: 1.28,
                color: '#ffffff',
                fontWeight: 700,
                letterSpacing: '-0.028em',
                textShadow: '0 1px 16px rgba(99,102,241,0.55), 0 2px 6px rgba(0,0,0,0.70)',
                animation: 'pipReveal 0.14s ease-out',
              }}
            >
              {current || previous}
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes pipReveal {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pipLiveDot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }
        @keyframes pipWait {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.5); }
        }
      `}</style>
    </div>
  )
}

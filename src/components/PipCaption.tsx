interface Props {
  current: string
  previous: string
  isActive: boolean
}

const DOT_COLORS = {
  active:       '#22C55E',
  reconnecting: '#F59E0B',
  idle:         'rgba(255,255,255,0.18)',
}

export default function PipCaption({ current, previous, isActive }: Props) {
  const dotColor = isActive ? DOT_COLORS.active : DOT_COLORS.idle
  const isEmpty = !current && !previous

  return (
    <div style={{
      height: '100vh',
      background: '#06090F',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      overflow: 'hidden',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
    }}>

      {/* Top accent bar */}
      <div style={{
        height: 2,
        flexShrink: 0,
        background: 'linear-gradient(90deg, #6366F1 0%, #1AD2FF 55%, transparent 100%)',
      }} />

      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        top: '20%', left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', height: '70%',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(26,210,255,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '16px 22px 30px',
        gap: 10,
        position: 'relative',
        zIndex: 1,
      }}>
        {isEmpty ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32,
              borderRadius: '50%',
              border: '1.5px solid rgba(26,210,255,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'rgba(26,210,255,0.35)',
                animation: 'pipPulse 2.4s ease-in-out infinite',
              }} />
            </div>
            <p style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.20)',
              userSelect: 'none',
            }}>
              Listening
            </p>
          </div>
        ) : (
          <>
            {previous && (
              <p style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.55,
                color: 'rgba(255,255,255,0.42)',
                fontWeight: 400,
                letterSpacing: '-0.005em',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {previous}
              </p>
            )}
            <p
              key={current}
              style={{
                margin: 0,
                fontSize: 23,
                lineHeight: 1.3,
                color: '#ffffff',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                textShadow: '0 0 24px rgba(26,210,255,0.40), 0 2px 8px rgba(0,0,0,0.50)',
                animation: 'pipReveal 0.18s ease-out',
              }}
            >
              {current || previous}
            </p>
          </>
        )}
      </div>

      {/* Bottom gradient fade */}
      <div style={{
        position: 'absolute',
        bottom: 22, left: 0, right: 0,
        height: 40,
        background: 'linear-gradient(to bottom, transparent, rgba(6,9,15,0.70))',
        pointerEvents: 'none',
        zIndex: 2,
      }} />

      {/* Footer bar */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 22,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        zIndex: 3,
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.22em',
          color: 'rgba(255,255,255,0.15)',
          userSelect: 'none',
        }}>
          ISOL
        </span>
        <div style={{
          width: 6, height: 6,
          borderRadius: '50%',
          background: dotColor,
          boxShadow: isActive ? `0 0 7px ${DOT_COLORS.active}` : 'none',
          transition: 'background 0.4s, box-shadow 0.4s',
          animation: isActive ? 'pipDot 2s ease-in-out infinite' : 'none',
        }} />
      </div>

      <style>{`
        @keyframes pipReveal {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pipDot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
        @keyframes pipPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.4); opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

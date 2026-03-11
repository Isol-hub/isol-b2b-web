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
      background: '#080C14',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      overflow: 'hidden',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
    }}>

      {/* Top accent line */}
      <div style={{
        height: 2,
        flexShrink: 0,
        background: 'linear-gradient(90deg, #6366F1 0%, #1AD2FF 60%, transparent 100%)',
      }} />

      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: isEmpty ? 'center' : 'flex-end',
        padding: '10px 18px 28px',
        gap: 4,
      }}>
        {isEmpty ? (
          <p style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.18)',
            textAlign: 'center',
            userSelect: 'none',
          }}>
            Listening
          </p>
        ) : (
          <>
            {previous && (
              <p style={{
                margin: 0,
                fontSize: 12,
                lineHeight: 1.4,
                color: 'rgba(255,255,255,0.28)',
                fontWeight: 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {previous}
              </p>
            )}
            <p
              key={current}
              style={{
                margin: 0,
                fontSize: 20,
                lineHeight: 1.35,
                color: 'rgba(255,255,255,0.95)',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                animation: 'pipReveal 0.2s ease-out',
              }}
            >
              {current}
            </p>
          </>
        )}
      </div>

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
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.2em',
          color: 'rgba(255,255,255,0.15)',
          userSelect: 'none',
        }}>
          ISOL
        </span>
        <div style={{
          width: 6, height: 6,
          borderRadius: '50%',
          background: dotColor,
          boxShadow: isActive ? `0 0 6px ${DOT_COLORS.active}` : 'none',
          transition: 'background 0.4s, box-shadow 0.4s',
          animation: isActive ? 'pipDot 2s ease-in-out infinite' : 'none',
        }} />
      </div>

      <style>{`
        @keyframes pipReveal {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pipDot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

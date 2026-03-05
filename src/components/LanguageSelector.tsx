import { LANGUAGES } from '../lib/languages'

interface Props {
  value: string
  onChange: (code: string) => void
  disabled?: boolean
}

export default function LanguageSelector({ value, onChange, disabled }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
        Translate to
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 12,
          color: 'var(--text)',
          fontSize: 14,
          padding: '11px 14px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          appearance: 'none',
          backdropFilter: 'blur(8px)',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(238,242,255,0.4)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: 36,
          transition: 'border-color 0.2s',
        }}
      >
        {LANGUAGES.map(l => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
    </div>
  )
}

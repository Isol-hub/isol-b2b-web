import { LANGUAGES } from '../lib/languages'

interface Props {
  value: string
  onChange: (code: string) => void
  disabled?: boolean
}

export default function LanguageSelector({ value, onChange, disabled }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 600 }}>
        Translate to
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
          background: 'var(--surface)',
          border: `1px solid ${disabled ? 'var(--border)' : 'rgba(255,255,255,0.10)'}`,
          borderRadius: 'var(--radius)',
          color: disabled ? 'var(--text-dim)' : 'var(--text)',
          fontSize: 14,
          padding: '9px 12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(248,250,252,0.35)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          paddingRight: 32,
          transition: 'border-color 0.2s, opacity 0.2s',
          opacity: disabled ? 0.6 : 1,
          width: '100%',
        }}
      >
        {LANGUAGES.map(l => (
          <option key={l.code} value={l.code} style={{ background: '#0F1020' }}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { getSession, getToken, clearSession } from '../lib/auth'
import LanguageSelector from '../components/LanguageSelector'
import ConfirmModal from '../components/ConfirmModal'
import PricingModal from '../components/PricingModal'

interface WorkspaceData {
  slug: string
  display_name: string | null
  default_lang: string
  plan: string
  plan_expires_at: number | null
}

interface UsageRow {
  month: string
  endpoint: string
  count: number
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--canvas)',
      border: '1px solid var(--divider)',
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--divider)',
        background: 'var(--surface-1)',
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
          {title}
        </p>
      </div>
      <div style={{ padding: '20px 20px' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
      <label style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 130, flexShrink: 0 }}>
        {label}
      </label>
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  )
}

const PLAN_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  free:   { color: 'var(--text-muted)', bg: 'rgba(0,0,0,0.06)', border: 'rgba(0,0,0,0.12)' },
  pro:    { color: '#16a34a', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.20)' },
  studio: { color: 'var(--accent)', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.20)' },
  team:   { color: '#d97706', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.20)' },
}

const PLAN_UNLOCKS: Record<string, { icon: string; label: string }[]> = {
  free: [
    { icon: '∞', label: 'Unlimited sessions' },
    { icon: '🌐', label: '40+ languages' },
    { icon: '✦', label: 'AI notes & documents' },
    { icon: '🔗', label: 'Share links' },
    { icon: '⚡', label: 'Priority processing' },
  ],
  pro: [
    { icon: '∞', label: 'Unlimited sessions' },
    { icon: '∞', label: 'No time limits' },
    { icon: '⚡', label: 'Priority processing' },
    { icon: '🔗', label: 'Unlimited share links' },
  ],
  studio: [
    { icon: '🔑', label: 'API access' },
    { icon: '👥', label: 'Up to 5 seats' },
    { icon: '📊', label: 'Team analytics' },
  ],
}

const ENDPOINT_LABELS: Record<string, string> = {
  translate: 'Translate',
  format: 'Format',
  notes: 'Notes',
  define: 'Define',
  title: 'Auto-title',
}

export default function SettingsPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>()
  const navigate = useNavigate()
  const [auth] = useState(() => getSession())

  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [usage, setUsage] = useState<UsageRow[]>([])
  const [loading, setLoading] = useState(true)

  const [displayName, setDisplayName] = useState('')
  const [defaultLang, setDefaultLang] = useState('it')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [confirmDeleteWorkspace, setConfirmDeleteWorkspace] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [searchParams] = useSearchParams()
  const billingSuccess = searchParams.get('billing') === 'success'

  useEffect(() => {
    const token = getToken()
    if (!token || !workspaceSlug) { setLoading(false); return }
    fetch(`/api/workspace?workspace_slug=${workspaceSlug}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((d: { workspace: WorkspaceData; usage: UsageRow[] } | null) => {
        if (d) {
          setWorkspace(d.workspace)
          setUsage(d.usage)
          setDisplayName(d.workspace.display_name ?? '')
          setDefaultLang(d.workspace.default_lang ?? 'it')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceSlug])

  const handleSave = async () => {
    const token = getToken()
    if (!token || !workspaceSlug) return
    setSaving(true)
    try {
      const res = await fetch('/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ display_name: displayName || null, default_lang: defaultLang }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        setWorkspace(prev => prev ? { ...prev, display_name: displayName || null, default_lang: defaultLang } : prev)
      }
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  const handleManageBilling = async () => {
    const token = getToken()
    if (!token) return
    setBillingLoading(true)
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const { url } = await res.json() as { url: string }
        window.location.href = url
      }
    } catch { /* silent */ }
    finally { setBillingLoading(false) }
  }

  const handleLogout = () => {
    clearSession()
    navigate('/')
  }

  const handleDeleteWorkspace = async () => {
    const token = getToken()
    if (!token || !workspaceSlug) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/workspace?workspace_slug=${workspaceSlug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        clearSession()
        navigate('/')
      }
    } catch { /* silent */ }
    finally { setDeleting(false); setConfirmDeleteWorkspace(false) }
  }

  // Group usage by month
  const usageByMonth = usage.reduce<Record<string, Record<string, number>>>((acc, row) => {
    if (!acc[row.month]) acc[row.month] = {}
    acc[row.month][row.endpoint] = row.count
    return acc
  }, {})

  const currentPlan = (workspace?.plan ?? 'free') as 'free' | 'pro' | 'studio' | 'team'
  const planColors = PLAN_COLORS[currentPlan] ?? PLAN_COLORS.free
  const isPaid = currentPlan !== 'free'

  const renewalDate = workspace?.plan_expires_at
    ? new Date(workspace.plan_expires_at * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  if (!auth) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header className="header-glass" style={{
        height: 'var(--header-h)', display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 10, flexShrink: 0,
      }}>
        <Link to={`/${workspaceSlug}`} className="nav-back">
          <span className="nav-back-arrow">←</span>
          <div className="logo-mark" style={{ width: 22, height: 22 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 11 }}>i</span>
          </div>
          Studio
        </Link>
        <span style={{ color: 'var(--divider)', fontSize: 18, lineHeight: 1 }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Settings</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{auth.email}</span>
      </header>

      {/* Body */}
      <div style={{ flex: 1, maxWidth: 640, width: '100%', margin: '0 auto', padding: '32px 24px 80px' }}>

        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)', margin: '0 0 28px' }}>
          Settings
        </h1>

        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading…</p>
        ) : (
          <>
            {/* Profile */}
            <Section title="Profile">
              <Field label="Email">
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{auth.email}</span>
              </Field>
              <Field label="Workspace ID">
                <span style={{ fontSize: 13, color: 'var(--text-dim)', fontFamily: 'monospace' }}>{workspaceSlug}</span>
              </Field>
              <Field label="Display name">
                <input
                  className="input-field"
                  placeholder="e.g. Acme Corp"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  style={{ fontSize: 13, width: '100%', maxWidth: 280 }}
                />
              </Field>
            </Section>

            {/* Preferences */}
            <Section title="Preferences">
              <Field label="Default language">
                <div style={{ maxWidth: 240 }}>
                  <LanguageSelector value={defaultLang} onChange={setDefaultLang} />
                </div>
              </Field>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 0', lineHeight: 1.5 }}>
                Pre-selected translation target when starting a new session.
              </p>
            </Section>

            {/* Save button */}
            <div style={{ marginBottom: 24 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
                style={{ width: 'auto', padding: '8px 24px', fontSize: 13 }}
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
              </button>
            </div>

            {/* Billing */}
            <div style={{ marginBottom: 24 }}>
              {/* Section label */}
              <p style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--text-muted)',
                margin: '0 0 10px',
              }}>
                Billing & Plan
              </p>

              {billingSuccess && (
                <div style={{
                  marginBottom: 12, padding: '10px 16px',
                  background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)',
                  borderRadius: 10, fontSize: 13, color: '#16a34a', fontWeight: 600,
                }}>
                  ✓ Plan activated! Your workspace has been upgraded.
                </div>
              )}

              {/* Free plan — upsell card */}
              {!isPaid && (
                <div style={{
                  position: 'relative',
                  borderRadius: 16,
                  border: '1px solid rgba(99,102,241,0.30)',
                  background: 'linear-gradient(145deg, rgba(99,102,241,0.10) 0%, rgba(139,92,246,0.06) 60%, rgba(0,0,0,0.02) 100%)',
                  overflow: 'hidden',
                  padding: '28px 28px 24px',
                }}>
                  {/* Glow orb top-right */}
                  <div style={{
                    position: 'absolute', top: -60, right: -60,
                    width: 200, height: 200,
                    background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',
                    pointerEvents: 'none',
                  }} />

                  {/* Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      background: 'rgba(99,102,241,0.14)',
                      color: 'var(--accent)',
                      border: '1px solid rgba(99,102,241,0.25)',
                      padding: '3px 10px', borderRadius: 999,
                    }}>
                      Free plan
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>3 sessions remaining (lifetime)</span>
                  </div>

                  {/* Headline */}
                  <h3 style={{
                    fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em',
                    color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.2,
                  }}>
                    Unlock the full ISOL experience
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
                    Professional interpreters use ISOL every day — remove every limit and work without boundaries.
                  </p>

                  {/* Feature chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                    {PLAN_UNLOCKS.free.map(f => (
                      <span key={f.label} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: 12, fontWeight: 600,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        color: 'var(--text-dim)',
                        padding: '5px 12px', borderRadius: 999,
                      }}>
                        <span style={{ fontSize: 13 }}>{f.icon}</span>
                        {f.label}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => setShowPricing(true)}
                    style={{
                      width: '100%',
                      padding: '13px 0',
                      borderRadius: 12,
                      border: 'none',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 700,
                      letterSpacing: '-0.01em',
                      cursor: 'pointer',
                      boxShadow: '0 4px 24px rgba(99,102,241,0.40)',
                      transition: 'box-shadow 0.2s, transform 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 32px rgba(99,102,241,0.55)'
                      ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(99,102,241,0.40)'
                      ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
                    }}
                  >
                    Start your subscription →
                  </button>

                  {/* Trust */}
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
                    From $15/mo · Cancel anytime · 14-day money-back guarantee
                  </p>
                </div>
              )}

              {/* Paid plan — status card */}
              {isPaid && (
                <div style={{
                  borderRadius: 16,
                  border: `1px solid ${planColors.border}`,
                  background: planColors.bg,
                  padding: '24px 24px 20px',
                }}>
                  {/* Plan header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <span style={{
                        fontSize: 10, fontWeight: 800, letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        color: planColors.color,
                        background: planColors.bg,
                        border: `1px solid ${planColors.border}`,
                        padding: '3px 10px', borderRadius: 999,
                      }}>
                        {currentPlan}
                      </span>
                      <p style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)', margin: '10px 0 2px' }}>
                        {{
                          pro: 'Pro plan',
                          studio: 'Studio plan',
                          team: 'Team plan',
                        }[currentPlan] ?? currentPlan}
                      </p>
                      {renewalDate && (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                          Renews {renewalDate}
                        </p>
                      )}
                    </div>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: planColors.bg,
                      border: `1px solid ${planColors.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22,
                    }}>
                      {currentPlan === 'pro' ? '⚡' : currentPlan === 'studio' ? '✦' : '👥'}
                    </div>
                  </div>

                  {/* What's included chips */}
                  {PLAN_UNLOCKS[currentPlan] && PLAN_UNLOCKS[currentPlan].length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                        Not yet unlocked
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {PLAN_UNLOCKS[currentPlan].map(f => (
                          <span key={f.label} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            fontSize: 12, fontWeight: 500,
                            color: 'var(--text-muted)',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            padding: '4px 10px', borderRadius: 999,
                          }}>
                            {f.icon} {f.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI usage */}
                  {Object.entries(usageByMonth).length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        AI usage
                      </p>
                      {Object.entries(usageByMonth).map(([month, endpoints]) => (
                        <div key={month} style={{ marginBottom: 8 }}>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{month}</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {Object.entries(endpoints).map(([ep, count]) => (
                              <div key={ep} style={{
                                background: 'var(--surface-1)', border: '1px solid var(--divider)',
                                borderRadius: 6, padding: '4px 10px', fontSize: 12,
                              }}>
                                <span style={{ color: 'var(--text-muted)' }}>{ENDPOINT_LABELS[ep] ?? ep}: </span>
                                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{count.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      onClick={handleManageBilling}
                      disabled={billingLoading}
                      className="btn-primary"
                      style={{ width: 'auto', padding: '8px 20px', fontSize: 13, opacity: billingLoading ? 0.6 : 1 }}
                    >
                      {billingLoading ? 'Opening…' : 'Manage billing →'}
                    </button>
                    {currentPlan !== 'team' && (
                      <button
                        onClick={() => setShowPricing(true)}
                        style={{
                          padding: '8px 20px', fontSize: 13, fontWeight: 600,
                          borderRadius: 8, border: `1px solid ${planColors.border}`,
                          background: 'transparent', color: planColors.color,
                          cursor: 'pointer',
                        }}
                      >
                        Upgrade plan
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Support */}
            <Section title="Support">
              <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 20, lineHeight: 1.6 }}>
                Need help? Reach out and we'll get back to you as fast as possible.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Telegram */}
                <a
                  href="https://t.me/isolsupport"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px',
                    background: 'var(--surface-1)',
                    border: '1px solid var(--divider)',
                    borderRadius: 10,
                    textDecoration: 'none',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: 'rgba(0,136,204,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.93 6.77l-1.67 7.87c-.12.56-.45.7-.91.43l-2.52-1.86-1.22 1.17c-.13.13-.25.24-.51.24l.18-2.57 4.66-4.21c.2-.18-.04-.28-.32-.1L7.57 14.37l-2.47-.77c-.54-.17-.55-.54.11-.8l9.65-3.72c.45-.16.84.11.07.79z" fill="#0088CC"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>Chat on Telegram</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>@isolsupport · Fastest response</p>
                  </div>
                  <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>→</span>
                </a>

                {/* Email */}
                <a
                  href="mailto:support@isol.live"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px',
                    background: 'var(--surface-1)',
                    border: '1px solid var(--divider)',
                    borderRadius: 10,
                    textDecoration: 'none',
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: 'rgba(99,102,241,0.10)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="22,6 12,13 2,6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>Email support</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>support@isol.live · 24–48h response</p>
                  </div>
                  <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>→</span>
                </a>
              </div>
            </Section>

            {/* Legal */}
            <Section title="Legal">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  { label: 'Terms of Service', sub: 'Last updated March 2026', href: '/legal/terms' },
                  { label: 'Privacy Policy', sub: 'How we handle your data', href: '/legal/privacy' },
                  { label: 'Cookie Policy', sub: 'Minimal, no tracking', href: '/legal/cookies' },
                ].map(item => (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: '1px solid var(--divider)',
                      textDecoration: 'none',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 2px' }}>{item.label}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{item.sub}</p>
                    </div>
                    <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>→</span>
                  </a>
                ))}
                <div style={{ paddingTop: 14 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                    ISOL is operated by ISOL SRL · VAT IT00000000000 · support@isol.live
                  </p>
                </div>
              </div>
            </Section>

            {/* Account */}
            <Section title="Account">
              <Field label="Signed in as">
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{auth.email}</span>
              </Field>
              <div style={{ paddingTop: 8 }}>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '8px 20px', fontSize: 13, fontWeight: 600,
                    borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  Sign out
                </button>
              </div>
            </Section>

            {/* Danger Zone */}
            <Section title="Danger Zone">
              <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
                Permanently delete this workspace and all its sessions, glossary, and data.
                This action cannot be undone.
              </p>
              <button
                className="btn-stop"
                style={{ fontSize: 13 }}
                onClick={() => setConfirmDeleteWorkspace(true)}
              >
                Delete workspace
              </button>
            </Section>
          </>
        )}
      </div>

      {showPricing && (
        <PricingModal
          currentPlan={currentPlan}
          workspaceSlug={workspaceSlug ?? ''}
          onClose={() => setShowPricing(false)}
        />
      )}

      <ConfirmModal
        isOpen={confirmDeleteWorkspace}
        title="Delete workspace"
        message={`Delete workspace "${workspaceSlug}" and all its data permanently? This cannot be undone.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete workspace'}
        dangerous
        onConfirm={handleDeleteWorkspace}
        onCancel={() => setConfirmDeleteWorkspace(false)}
      />
    </div>
  )
}

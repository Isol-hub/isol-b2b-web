import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { getSession, getToken, clearSession } from '../lib/auth'
import LanguageSelector from '../components/LanguageSelector'
import ConfirmModal from '../components/ConfirmModal'
import PricingModal from '../components/PricingModal'
import { LANGUAGES } from '../lib/languages'

interface WorkspaceData {
  slug: string
  owner_email: string
  display_name: string | null
  default_lang: string
  plan: string
  plan_expires_at: number | null
  api_key: string | null
}

interface TeamMember {
  member_email: string
  role: string
  status: string
  invited_at: number
  joined_at: number | null
}

interface WorkspaceStats {
  sessions_total: number
  minutes_total: number
  top_lang: string | null
}

interface UsageRow {
  month: string
  endpoint: string
  count: number
}

interface NotifPrefs {
  session_summary: boolean
  product_updates: boolean
  billing: boolean
}

// ─── primitives ─────────────────────────────────────────────────────────────

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
        margin: '0 0 8px 2px',
      }}>
        {label}
      </p>
      <div style={{
        background: 'var(--canvas)',
        border: '1px solid var(--divider)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  )
}

function Row({
  label, hint, children, last = false, danger = false,
}: {
  label?: string; hint?: string; children: React.ReactNode; last?: boolean; danger?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 20px',
      borderBottom: last ? 'none' : '1px solid var(--divider)',
    }}>
      {(label || hint) && (
        <div style={{ flex: 1, minWidth: 0 }}>
          {label && <p style={{ fontSize: 13, fontWeight: 500, color: danger ? '#ef4444' : 'var(--text)', margin: 0 }}>{label}</p>}
          {hint && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1.5 }}>{hint}</p>}
        </div>
      )}
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        width: 42, height: 24, borderRadius: 999,
        background: value ? 'var(--accent)' : 'rgba(128,128,128,0.22)',
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: value ? 21 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        transition: 'left 0.18s',
      }} />
    </div>
  )
}

// ─── team helpers ────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#16a34a','#0891b2','#d97706']

function avatarColor(email: string): string {
  let h = 0
  for (const c of email) h = (h * 31 + c.charCodeAt(0)) & 0xFFFFFF
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function initials(email: string): string {
  const local = email.split('@')[0]
  const parts = local.split(/[._-]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

function maskApiKey(key: string): string {
  const prefix = key.slice(0, 12) // 'isol_live_xx'
  return prefix + '••••••••••••••••'
}

// ─── plan config ─────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  free:   { color: 'var(--text-muted)', bg: 'rgba(0,0,0,0.05)', border: 'rgba(0,0,0,0.10)' },
  pro:    { color: '#16a34a',           bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.20)'  },
  studio: { color: 'var(--accent)',     bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.20)' },
  team:   { color: '#d97706',           bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.20)' },
}

const PLAN_NEXT_FEATURES: Record<string, string[]> = {
  free:   ['Unlimited sessions', '40+ languages', 'AI notes & docs', 'Share links', 'Priority processing'],
  pro:    ['Unlimited sessions & duration', 'Priority processing', 'Unlimited share links'],
  studio: ['API access', 'Up to 5 seats', 'Team management'],
}

const ENDPOINT_LABELS: Record<string, string> = {
  translate: 'Translate', format: 'Format', notes: 'Notes', define: 'Define', title: 'Auto-title',
}

function formatMinutes(min: number): string {
  if (min < 1) return '—'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const NOTIF_KEY = (slug: string) => `isol:notif:${slug}`

function loadNotifPrefs(slug: string): NotifPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_KEY(slug))
    if (raw) return JSON.parse(raw) as NotifPrefs
  } catch { /* ignore */ }
  return { session_summary: true, product_updates: true, billing: true }
}

function saveNotifPrefs(slug: string, prefs: NotifPrefs) {
  localStorage.setItem(NOTIF_KEY(slug), JSON.stringify(prefs))
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>()
  const navigate = useNavigate()
  const [auth] = useState(() => getSession())

  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [stats, setStats] = useState<WorkspaceStats>({ sessions_total: 0, minutes_total: 0, top_lang: null })
  const [usage, setUsage] = useState<UsageRow[]>([])
  const [loading, setLoading] = useState(true)

  const [displayName, setDisplayName] = useState('')
  const [defaultLang, setDefaultLang] = useState('it')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [billingLoading, setBillingLoading] = useState(false)
  const [showPricing, setShowPricing] = useState(false)

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSent, setInviteSent] = useState<string | null>(null)
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [apiKeyLoading, setApiKeyLoading] = useState(false)
  const [apiKeyCopied, setApiKeyCopied] = useState(false)

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({ session_summary: true, product_updates: true, billing: true })
  const [confirmDelete, setConfirmDelete] = useState(false)
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
      .then((d: { workspace: WorkspaceData; stats: WorkspaceStats; usage: UsageRow[] } | null) => {
        if (d) {
          setWorkspace(d.workspace)
          setStats(d.stats ?? { sessions_total: 0, minutes_total: 0, top_lang: null })
          setUsage(d.usage)
          setDisplayName(d.workspace.display_name ?? '')
          setDefaultLang(d.workspace.default_lang ?? 'it')
          setApiKey(d.workspace.api_key ?? null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceSlug])

  useEffect(() => {
    if (workspaceSlug) setNotifPrefs(loadNotifPrefs(workspaceSlug))
  }, [workspaceSlug])

  useEffect(() => {
    if (!workspace || workspace.plan !== 'team') return
    const token = getToken()
    if (!token) return
    fetch('/api/team/members', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((d: { members: TeamMember[] } | null) => { if (d) setTeamMembers(d.members) })
      .catch(() => {})
  }, [workspace])

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
        setTimeout(() => setSaved(false), 2500)
        setWorkspace(prev => prev ? { ...prev, display_name: displayName || null, default_lang: defaultLang } : prev)
      }
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    const token = getToken()
    if (!token) return
    setInviteLoading(true)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      if (res.ok) {
        const email = inviteEmail.trim().toLowerCase()
        setTeamMembers(prev => [...prev.filter(m => m.member_email !== email), {
          member_email: email, role: 'member', status: 'pending',
          invited_at: Date.now(), joined_at: null,
        }])
        setInviteSent(email)
        setInviteEmail('')
        setTimeout(() => setInviteSent(null), 3500)
      }
    } catch { /* silent */ }
    finally { setInviteLoading(false) }
  }

  const handleRemoveMember = async (memberEmail: string) => {
    const token = getToken()
    if (!token) return
    setRemovingMember(memberEmail)
    try {
      const res = await fetch('/api/team/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ member_email: memberEmail }),
      })
      if (res.ok) setTeamMembers(prev => prev.filter(m => m.member_email !== memberEmail))
    } catch { /* silent */ }
    finally { setRemovingMember(null) }
  }

  const handleApiKey = async (action: 'generate' | 'revoke') => {
    const token = getToken()
    if (!token) return
    setApiKeyLoading(true)
    try {
      const res = await fetch('/api/workspace/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const { api_key } = await res.json() as { api_key: string | null }
        setApiKey(api_key)
      }
    } catch { /* silent */ }
    finally { setApiKeyLoading(false) }
  }

  const handleCopyApiKey = () => {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey).then(() => {
      setApiKeyCopied(true)
      setTimeout(() => setApiKeyCopied(false), 2000)
    })
  }

  const handleNotifChange = (key: keyof NotifPrefs, value: boolean) => {
    const next = { ...notifPrefs, [key]: value }
    setNotifPrefs(next)
    if (workspaceSlug) saveNotifPrefs(workspaceSlug, next)
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

  const handleDeleteWorkspace = async () => {
    const token = getToken()
    if (!token || !workspaceSlug) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/workspace?workspace_slug=${workspaceSlug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) { clearSession(); navigate('/') }
    } catch { /* silent */ }
    finally { setDeleting(false); setConfirmDelete(false) }
  }

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
  const topLangMeta = stats.top_lang ? LANGUAGES.find(l => l.code === stats.top_lang) : null

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
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 12 }}>{auth.email}</span>
        <button
          onClick={() => { clearSession(); navigate('/') }}
          style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
            background: 'transparent', border: '1px solid var(--divider)',
            borderRadius: 7, padding: '5px 12px', cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </header>

      {/* Body */}
      <div style={{ flex: 1, maxWidth: 640, width: '100%', margin: '0 auto', padding: '32px 24px 80px' }}>

        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 40, textAlign: 'center' }}>Loading…</p>
        ) : (
          <>
            {/* ── Stats ─────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
              {/* Sessions */}
              <div style={{
                background: 'var(--canvas)', border: '1px solid var(--divider)',
                borderRadius: 12, padding: '18px 20px',
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Sessions
                </p>
                <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', margin: '0 0 6px', lineHeight: 1 }}>
                  {stats.sessions_total}
                  {!isPaid && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}> / 3</span>}
                </p>
                {!isPaid && (
                  <div style={{ height: 4, background: 'rgba(0,0,0,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min((stats.sessions_total / 3) * 100, 100)}%`,
                      background: stats.sessions_total >= 3 ? '#ef4444' : 'var(--accent)',
                      borderRadius: 999, transition: 'width 0.4s',
                    }} />
                  </div>
                )}
              </div>

              {/* Time */}
              <div style={{
                background: 'var(--canvas)', border: '1px solid var(--divider)',
                borderRadius: 12, padding: '18px 20px',
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Interpreted
                </p>
                <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', margin: 0, lineHeight: 1 }}>
                  {formatMinutes(stats.minutes_total)}
                </p>
              </div>

              {/* Top language */}
              <div style={{
                background: 'var(--canvas)', border: '1px solid var(--divider)',
                borderRadius: 12, padding: '18px 20px',
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Top language
                </p>
                {topLangMeta ? (
                  <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>
                    {topLangMeta.flag} {topLangMeta.label}
                  </p>
                ) : (
                  <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-muted)', margin: 0, lineHeight: 1 }}>—</p>
                )}
              </div>
            </div>

            {/* ── Workspace ────────────────────────────────────── */}
            <Block label="Workspace">
              <Row label="Display name" hint="Shown in shared session links">
                <input
                  className="input-field"
                  placeholder="e.g. Acme Interpreting"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  style={{ fontSize: 13, width: 220, textAlign: 'right' }}
                />
              </Row>
              <Row label="Workspace ID" hint="Used in your workspace URL">
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{workspaceSlug}</span>
              </Row>
              <Row label="Default language" hint="Pre-selected when starting a session" last>
                <div style={{ width: 180 }}>
                  <LanguageSelector value={defaultLang} onChange={setDefaultLang} />
                </div>
              </Row>
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary"
                  style={{ padding: '7px 20px', fontSize: 13, width: 'auto', opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
                </button>
              </div>
            </Block>

            {/* ── Billing ──────────────────────────────────────── */}
            <div style={{ marginBottom: 28 }}>
              <p style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--text-muted)',
                margin: '0 0 8px 2px',
              }}>
                Billing & Plan
              </p>

              {billingSuccess && (
                <div style={{
                  marginBottom: 10, padding: '10px 16px',
                  background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)',
                  borderRadius: 10, fontSize: 13, color: '#16a34a', fontWeight: 600,
                }}>
                  ✓ Plan activated — welcome to {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}!
                </div>
              )}

              {/* Free upsell card */}
              {!isPaid && (
                <div style={{
                  position: 'relative', borderRadius: 14,
                  border: '1px solid rgba(99,102,241,0.28)',
                  background: 'linear-gradient(145deg, rgba(99,102,241,0.09) 0%, rgba(139,92,246,0.05) 55%, transparent 100%)',
                  overflow: 'hidden', padding: '28px 28px 24px',
                }}>
                  <div style={{
                    position: 'absolute', top: -60, right: -60, width: 200, height: 200,
                    background: 'radial-gradient(circle, rgba(139,92,246,0.16) 0%, transparent 70%)',
                    pointerEvents: 'none',
                  }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase',
                      background: 'rgba(99,102,241,0.12)', color: 'var(--accent)',
                      border: '1px solid rgba(99,102,241,0.22)', padding: '3px 10px', borderRadius: 999,
                    }}>Free</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {3 - Math.min(stats.sessions_total, 3)} of 3 sessions remaining
                    </span>
                  </div>
                  <h3 style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.2 }}>
                    Unlock the full ISOL experience
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.55 }}>
                    Professional interpreters run ISOL every day — remove every limit and work without interruption.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 22 }}>
                    {PLAN_NEXT_FEATURES.free.map(f => (
                      <span key={f} style={{
                        fontSize: 12, fontWeight: 500,
                        background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.10)',
                        color: 'var(--text-dim)', padding: '5px 12px', borderRadius: 999,
                      }}>
                        {f}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowPricing(true)}
                    style={{
                      width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em',
                      cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.38)',
                      transition: 'opacity 0.15s, transform 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.92'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    Start your subscription →
                  </button>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 10, marginBottom: 0 }}>
                    From $15/mo · Cancel anytime · 14-day money-back guarantee
                  </p>
                </div>
              )}

              {/* Paid plan card */}
              {isPaid && (
                <div style={{
                  borderRadius: 14, border: `1px solid ${planColors.border}`,
                  background: planColors.bg, padding: '22px 24px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <span style={{
                        fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase',
                        color: planColors.color, background: planColors.bg,
                        border: `1px solid ${planColors.border}`, padding: '3px 10px', borderRadius: 999,
                      }}>
                        {currentPlan}
                      </span>
                      <p style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)', margin: '10px 0 3px' }}>
                        {{ pro: 'Pro plan', studio: 'Studio plan', team: 'Team plan' }[currentPlan] ?? currentPlan}
                      </p>
                      {renewalDate && (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Renews {renewalDate}</p>
                      )}
                    </div>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                      background: planColors.bg, border: `1px solid ${planColors.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    }}>
                      {{ pro: '⚡', studio: '✦', team: '👥' }[currentPlan] ?? '●'}
                    </div>
                  </div>

                  {/* AI usage */}
                  {Object.entries(usageByMonth).length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                        AI usage this month
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {Object.entries(Object.values(usageByMonth)[0] ?? {}).map(([ep, count]) => (
                          <span key={ep} style={{
                            fontSize: 12, background: 'var(--canvas)',
                            border: '1px solid var(--divider)', borderRadius: 6, padding: '4px 10px',
                          }}>
                            <span style={{ color: 'var(--text-muted)' }}>{ENDPOINT_LABELS[ep] ?? ep} </span>
                            <span style={{ color: 'var(--text)', fontWeight: 700 }}>{count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next tier teaser */}
                  {PLAN_NEXT_FEATURES[currentPlan] && currentPlan !== 'team' && (
                    <div style={{ marginBottom: 18 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                        Unlock next tier
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {PLAN_NEXT_FEATURES[currentPlan].map(f => (
                          <span key={f} style={{
                            fontSize: 12, fontWeight: 500,
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            color: 'var(--text-muted)', padding: '4px 10px', borderRadius: 999,
                          }}>{f}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={handleManageBilling}
                      disabled={billingLoading}
                      className="btn-primary"
                      style={{ width: 'auto', padding: '8px 18px', fontSize: 13, opacity: billingLoading ? 0.6 : 1 }}
                    >
                      {billingLoading ? 'Opening…' : 'Manage billing →'}
                    </button>
                    {currentPlan !== 'team' && (
                      <button
                        onClick={() => setShowPricing(true)}
                        style={{
                          padding: '8px 18px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                          border: `1px solid ${planColors.border}`, background: 'transparent',
                          color: planColors.color, cursor: 'pointer',
                        }}
                      >
                        Upgrade
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Team (team plan only) ────────────────────────── */}
            {currentPlan === 'team' && (() => {
              const activeCount = 1 + teamMembers.filter(m => m.status === 'active').length
              const totalCount = 1 + teamMembers.length
              const isOwner = auth?.email === workspace?.owner_email

              return (
                <>
                  {/* Members block */}
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <p style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0,
                      }}>
                        Team
                      </p>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                        {activeCount} / 5 active
                      </span>
                    </div>
                    <div style={{
                      background: 'var(--canvas)', border: '1px solid var(--divider)',
                      borderRadius: 12, overflow: 'hidden',
                    }}>

                      {/* Owner row */}
                      {workspace && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '13px 16px',
                          borderBottom: teamMembers.length > 0 ? '1px solid var(--divider)' : 'none',
                        }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                            background: avatarColor(workspace.owner_email ?? ''),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.02em',
                          }}>
                            {initials(workspace.owner_email ?? '')}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {workspace.owner_email}
                            </p>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                            color: '#d97706', background: 'rgba(245,158,11,0.10)',
                            border: '1px solid rgba(245,158,11,0.22)', padding: '3px 9px', borderRadius: 999,
                          }}>
                            Owner
                          </span>
                        </div>
                      )}

                      {/* Member rows */}
                      {teamMembers.map((m, i) => (
                        <div key={m.member_email} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '13px 16px',
                          borderBottom: i < teamMembers.length - 1 ? '1px solid var(--divider)' : 'none',
                          opacity: removingMember === m.member_email ? 0.4 : 1,
                          transition: 'opacity 0.2s',
                        }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                            background: avatarColor(m.member_email),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.02em',
                            opacity: m.status === 'pending' ? 0.55 : 1,
                          }}>
                            {initials(m.member_email)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.member_email}
                            </p>
                            {m.status === 'pending' && (
                              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '1px 0 0' }}>
                                Invite pending
                              </p>
                            )}
                          </div>
                          {m.status === 'active' ? (
                            <span style={{
                              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                              color: 'var(--text-muted)', background: 'rgba(128,128,128,0.08)',
                              border: '1px solid var(--divider)', padding: '3px 9px', borderRadius: 999,
                            }}>
                              Member
                            </span>
                          ) : (
                            <span style={{
                              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                              color: '#d97706', background: 'rgba(245,158,11,0.08)',
                              border: '1px solid rgba(245,158,11,0.18)', padding: '3px 9px', borderRadius: 999,
                            }}>
                              Pending
                            </span>
                          )}
                          {isOwner && (
                            <button
                              onClick={() => handleRemoveMember(m.member_email)}
                              disabled={removingMember === m.member_email}
                              style={{
                                width: 28, height: 28, borderRadius: 7, border: '1px solid var(--divider)',
                                background: 'transparent', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--text-muted)', fontSize: 16, flexShrink: 0,
                                transition: 'background 0.15s, color 0.15s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--divider)' }}
                              title="Remove member"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Invite input */}
                      {isOwner && totalCount < 5 && (
                        <div style={{
                          display: 'flex', gap: 8, padding: '12px 16px',
                          borderTop: teamMembers.length > 0 || workspace ? '1px solid var(--divider)' : 'none',
                          background: 'rgba(99,102,241,0.02)',
                        }}>
                          <input
                            type="email"
                            placeholder="colleague@company.com"
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleInvite() }}
                            className="input-field"
                            style={{ flex: 1, fontSize: 13 }}
                          />
                          <button
                            onClick={handleInvite}
                            disabled={inviteLoading || !inviteEmail.trim()}
                            className="btn-primary"
                            style={{
                              width: 'auto', padding: '0 16px', fontSize: 13, flexShrink: 0,
                              opacity: (!inviteEmail.trim() || inviteLoading) ? 0.5 : 1,
                            }}
                          >
                            {inviteLoading ? '…' : 'Send invite'}
                          </button>
                        </div>
                      )}

                      {/* Invite sent confirmation */}
                      {inviteSent && (
                        <div style={{
                          padding: '10px 16px',
                          background: 'rgba(34,197,94,0.06)',
                          borderTop: '1px solid rgba(34,197,94,0.15)',
                          fontSize: 12, color: '#16a34a', fontWeight: 500,
                        }}>
                          ✓ Invite sent to {inviteSent}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* API Key block */}
                  <div style={{ marginBottom: 28 }}>
                    <p style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: 'var(--text-muted)',
                      margin: '0 0 8px 2px',
                    }}>
                      API Access
                    </p>
                    <div style={{
                      background: 'var(--canvas)', border: '1px solid var(--divider)',
                      borderRadius: 12, padding: '18px 20px',
                    }}>
                      {apiKey ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <code style={{
                              flex: 1, fontSize: 12, fontFamily: 'monospace',
                              color: 'var(--text)', background: 'rgba(0,0,0,0.04)',
                              border: '1px solid var(--divider)', borderRadius: 7,
                              padding: '8px 12px', letterSpacing: '0.02em',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {maskApiKey(apiKey)}
                            </code>
                            <button
                              onClick={handleCopyApiKey}
                              style={{
                                flexShrink: 0, padding: '7px 14px', borderRadius: 7,
                                border: '1px solid var(--divider)', background: 'transparent',
                                fontSize: 12, fontWeight: 600,
                                color: apiKeyCopied ? '#16a34a' : 'var(--text-muted)',
                                cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                              }}
                            >
                              {apiKeyCopied ? '✓ Copied' : 'Copy key'}
                            </button>
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
                            Use this key in the <code style={{ fontSize: 11 }}>Authorization: Bearer</code> header to call the ISOL REST API.
                          </p>
                          <button
                            onClick={() => handleApiKey('revoke')}
                            disabled={apiKeyLoading}
                            style={{
                              fontSize: 12, fontWeight: 600, padding: '6px 14px',
                              borderRadius: 7, border: '1px solid rgba(239,68,68,0.30)',
                              background: 'rgba(239,68,68,0.06)', color: '#ef4444',
                              cursor: 'pointer', opacity: apiKeyLoading ? 0.5 : 1,
                            }}
                          >
                            Revoke key
                          </button>
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: '0 0 3px' }}>No API key</p>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Generate a key to access the ISOL REST API from your own integrations</p>
                          </div>
                          <button
                            onClick={() => handleApiKey('generate')}
                            disabled={apiKeyLoading}
                            className="btn-primary"
                            style={{ width: 'auto', padding: '8px 16px', fontSize: 13, opacity: apiKeyLoading ? 0.5 : 1, flexShrink: 0, marginLeft: 16 }}
                          >
                            {apiKeyLoading ? '…' : 'Generate key'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )
            })()}

            {/* ── Notifications ────────────────────────────────── */}
            <Block label="Notifications">
              <Row
                label="Session summary"
                hint="Receive a summary email after each session ends"
              >
                <Toggle value={notifPrefs.session_summary} onChange={v => handleNotifChange('session_summary', v)} />
              </Row>
              <Row
                label="Product updates"
                hint="New features and improvements to ISOL"
              >
                <Toggle value={notifPrefs.product_updates} onChange={v => handleNotifChange('product_updates', v)} />
              </Row>
              <Row
                label="Billing & receipts"
                hint="Renewal confirmations and payment receipts"
                last
              >
                <Toggle value={notifPrefs.billing} onChange={v => handleNotifChange('billing', v)} />
              </Row>
            </Block>

            {/* ── Support ──────────────────────────────────────── */}
            <Block label="Support">
              <a
                href="https://t.me/isolsupport"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid var(--divider)', textDecoration: 'none' }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(0,136,204,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.93 6.77l-1.67 7.87c-.12.56-.45.7-.91.43l-2.52-1.86-1.22 1.17c-.13.13-.25.24-.51.24l.18-2.57 4.66-4.21c.2-.18-.04-.28-.32-.1L7.57 14.37l-2.47-.77c-.54-.17-.55-.54.11-.8l9.65-3.72c.45-.16.84.11.07.79z" fill="#0088CC" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 1px' }}>Chat on Telegram</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>@isolsupport · Fastest response</p>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>→</span>
              </a>
              <a
                href="mailto:support@isol.live"
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', textDecoration: 'none' }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(99,102,241,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="22,6 12,13 2,6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 1px' }}>Email support</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>support@isol.live · 24–48h response</p>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>→</span>
              </a>
            </Block>

            {/* ── Data & Export ────────────────────────────────── */}
            <Block label="Data & Export">
              <Row
                label="Export all data"
                hint="Download all sessions and transcripts as JSON"
                last
              >
                <button
                  disabled
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '6px 14px',
                    borderRadius: 7, border: '1px solid var(--divider)',
                    background: 'transparent', color: 'var(--text-muted)', cursor: 'not-allowed',
                  }}
                >
                  Coming soon
                </button>
              </Row>
            </Block>

            {/* ── Legal ────────────────────────────────────────── */}
            <Block label="Legal">
              {[
                { label: 'Terms of Service', href: '/legal/terms' },
                { label: 'Privacy Policy', href: '/legal/privacy' },
              ].map((item, i, arr) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '13px 20px',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--divider)' : 'none',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{item.label}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>→</span>
                </a>
              ))}
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--divider)' }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                  ISOL · support@isol.live
                </p>
              </div>
            </Block>

            {/* ── Danger Zone ──────────────────────────────────── */}
            <Block label="Danger Zone">
              <Row
                label="Delete workspace"
                hint="Permanently removes all sessions, glossary entries, and data. Cannot be undone."
                danger
                last
              >
                <button
                  className="btn-stop"
                  style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </button>
              </Row>
            </Block>
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
        isOpen={confirmDelete}
        title="Delete workspace"
        message={`Delete "${workspaceSlug}" and all its data permanently? This cannot be undone.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete workspace'}
        dangerous
        onConfirm={handleDeleteWorkspace}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

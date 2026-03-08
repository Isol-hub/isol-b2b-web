import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { getSession, getToken, clearSession } from '../lib/auth'
import LanguageSelector from '../components/LanguageSelector'
import ConfirmModal from '../components/ConfirmModal'

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
      <label style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 120, flexShrink: 0 }}>
        {label}
      </label>
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  )
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

  const handleUpgrade = async () => {
    const token = getToken()
    if (!token) return
    setBillingLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
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
              <Field label="Workspace">
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
              <div style={{ maxWidth: 240 }}>
                <LanguageSelector value={defaultLang} onChange={setDefaultLang} />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 0', lineHeight: 1.5 }}>
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
            <Section title="Billing">
              <Field label="Plan">
                <span style={{
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: workspace?.plan === 'pro' ? 'var(--live)' : 'var(--accent)',
                  background: workspace?.plan === 'pro' ? 'rgba(34,197,94,0.08)' : 'rgba(99,102,241,0.08)',
                  border: `1px solid ${workspace?.plan === 'pro' ? 'rgba(34,197,94,0.20)' : 'rgba(99,102,241,0.20)'}`,
                  padding: '2px 8px', borderRadius: 5,
                }}>
                  {workspace?.plan ?? 'free'}
                </span>
              </Field>

              {Object.entries(usageByMonth).length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI usage</p>
                  {Object.entries(usageByMonth).map(([month, endpoints]) => (
                    <div key={month} style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{month}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {Object.entries(endpoints).map(([ep, count]) => (
                          <div key={ep} style={{
                            background: 'var(--surface-1)',
                            border: '1px solid var(--divider)',
                            borderRadius: 6, padding: '4px 10px',
                            fontSize: 12,
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

              {billingSuccess && (
                <div style={{
                  marginTop: 12, padding: '10px 14px',
                  background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)',
                  borderRadius: 8, fontSize: 13, color: 'var(--live)', fontWeight: 600,
                }}>
                  ✓ Pro plan activated! Welcome aboard.
                </div>
              )}

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--divider)' }}>
                {workspace?.plan === 'pro' ? (
                  <button
                    onClick={handleManageBilling}
                    disabled={billingLoading}
                    className="btn-primary"
                    style={{ width: 'auto', padding: '8px 20px', fontSize: 13, opacity: billingLoading ? 0.6 : 1 }}
                  >
                    {billingLoading ? 'Opening…' : 'Manage billing →'}
                  </button>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
                      Upgrade to Pro for unlimited AI features, no daily limits.
                    </p>
                    <button
                      onClick={handleUpgrade}
                      disabled={billingLoading}
                      className="btn-primary"
                      style={{ width: 'auto', padding: '8px 20px', fontSize: 13, opacity: billingLoading ? 0.6 : 1 }}
                    >
                      {billingLoading ? 'Redirecting…' : 'Upgrade to Pro →'}
                    </button>
                  </>
                )}
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

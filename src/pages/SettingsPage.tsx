import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { getSession, getToken, clearSession } from '../lib/auth'
import { sentryFetch } from '../lib/sentryFetch'
import LanguageSelector from '../components/LanguageSelector'
import ConfirmModal from '../components/ConfirmModal'
import PricingModal from '../components/PricingModal'
import { LANGUAGES } from '../lib/languages'
import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

interface WorkspaceData {
  slug: string
  display_name: string | null
  default_lang: string
  plan: string
  plan_expires_at: number | null
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

// ─── plan config ─────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  free:   { color: 'var(--text-muted)', bg: 'rgba(0,0,0,0.05)', border: 'rgba(0,0,0,0.10)' },
  pro:    { color: '#16a34a',           bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.20)'  },
  studio: { color: 'var(--accent)',     bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.20)' },
  team:   { color: '#0f766e',           bg: 'rgba(13,148,136,0.08)', border: 'rgba(13,148,136,0.22)' },
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

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({ session_summary: true, product_updates: true, billing: true })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [exportingJson, setExportingJson] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingDocx, setExportingDocx] = useState(false)

  async function fetchExportData() {
    const token = getToken()
    const res = await sentryFetch(`/api/workspace/export?workspace_slug=${workspaceSlug}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Export failed')
    return res.json() as Promise<{ workspace: Record<string, unknown>; sessions: Array<Record<string, unknown>> }>
  }

  async function handleExportJson() {
    setExportingJson(true)
    try {
      const data = await fetchExportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${workspaceSlug}-export.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportingJson(false)
    }
  }

  async function handleExportPdf() {
    setExportingPdf(true)
    try {
      const data = await fetchExportData()
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const pageH = doc.internal.pageSize.getHeight()
      const margin = 20
      const lineH = 7
      let y = margin

      function addLine(text: string, size = 11, bold = false) {
        doc.setFontSize(size)
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        const lines = doc.splitTextToSize(text, 170)
        for (const line of lines) {
          if (y + lineH > pageH - margin) { doc.addPage(); y = margin }
          doc.text(line, margin, y)
          y += lineH
        }
      }

      addLine(`ISOL Export — ${workspaceSlug}`, 16, true)
      y += 4

      for (const session of data.sessions as Array<{
        title?: string; started_at?: number; target_lang?: string;
        ai_formatted_text?: string; lines?: Array<{ text: string }>
      }>) {
        if (y + 20 > pageH - margin) { doc.addPage(); y = margin }
        const date = session.started_at ? new Date(session.started_at).toLocaleString() : ''
        addLine(`${session.title ?? 'Untitled'} · ${date}`, 13, true)
        if (session.target_lang) addLine(`Language: ${session.target_lang}`, 9)
        y += 2
        const body = session.ai_formatted_text
          ?? (session.lines ?? []).map(l => l.text).join(' ')
        if (body) addLine(body, 10)
        y += 6
      }

      doc.save(`${workspaceSlug}-export.pdf`)
    } finally {
      setExportingPdf(false)
    }
  }

  async function handleExportDocx() {
    setExportingDocx(true)
    try {
      const data = await fetchExportData()

      const children: Paragraph[] = [
        new Paragraph({ text: `ISOL Export — ${workspaceSlug}`, heading: HeadingLevel.TITLE }),
        new Paragraph({ text: '' }),
      ]

      for (const session of data.sessions as Array<{
        title?: string; started_at?: number; target_lang?: string;
        ai_formatted_text?: string; lines?: Array<{ text: string }>
      }>) {
        const date = session.started_at ? new Date(session.started_at).toLocaleString() : ''
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: `${session.title ?? 'Untitled'} · ${date}`, bold: true })],
        }))
        if (session.target_lang) {
          children.push(new Paragraph({ children: [new TextRun({ text: `Language: ${session.target_lang}`, italics: true })] }))
        }
        const body = session.ai_formatted_text
          ?? (session.lines ?? []).map((l: { text: string }) => l.text).join(' ')
        if (body) children.push(new Paragraph({ text: body }))
        children.push(new Paragraph({ text: '' }))
      }

      const docFile = new Document({ sections: [{ children }] })
      const blob = await Packer.toBlob(docFile)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${workspaceSlug}-export.docx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportingDocx(false)
    }
  }

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
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceSlug])

  useEffect(() => {
    if (workspaceSlug) setNotifPrefs(loadNotifPrefs(workspaceSlug))
  }, [workspaceSlug])

  const handleSave = async () => {
    const token = getToken()
    if (!token || !workspaceSlug) return
    setSaving(true)
    try {
      const res = await sentryFetch('/api/workspace', {
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
      const res = await sentryFetch('/api/billing/portal', {
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
      const res = await sentryFetch(`/api/workspace?workspace_slug=${workspaceSlug}`, {
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
                    Professionals run ISOL every day — remove every limit and work without interruption.
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
                      {{ pro: '⚡', studio: '✦', team: '⬡' }[currentPlan] ?? '●'}
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
              <Row label="Export JSON" hint="All sessions, transcripts and highlights as JSON">
                <button
                  onClick={handleExportJson}
                  disabled={exportingJson}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '6px 14px',
                    borderRadius: 7, border: '1px solid var(--divider)',
                    background: 'transparent', color: 'var(--text)', cursor: exportingJson ? 'default' : 'pointer',
                    opacity: exportingJson ? 0.5 : 1,
                  }}
                >
                  {exportingJson ? 'Exporting…' : 'Export JSON'}
                </button>
              </Row>
              <Row label="Export PDF" hint="One page per session with AI-formatted text">
                <button
                  onClick={handleExportPdf}
                  disabled={exportingPdf}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '6px 14px',
                    borderRadius: 7, border: '1px solid var(--divider)',
                    background: 'transparent', color: 'var(--text)', cursor: exportingPdf ? 'default' : 'pointer',
                    opacity: exportingPdf ? 0.5 : 1,
                  }}
                >
                  {exportingPdf ? 'Exporting…' : 'Export PDF'}
                </button>
              </Row>
              <Row label="Export Word" hint="One section per session, formatted document" last>
                <button
                  onClick={handleExportDocx}
                  disabled={exportingDocx}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '6px 14px',
                    borderRadius: 7, border: '1px solid var(--divider)',
                    background: 'transparent', color: 'var(--text)', cursor: exportingDocx ? 'default' : 'pointer',
                    opacity: exportingDocx ? 0.5 : 1,
                  }}
                >
                  {exportingDocx ? 'Exporting…' : 'Export Word'}
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

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getSession, getToken } from '../lib/auth'
import { LANGUAGES } from '../lib/languages'

interface SessionMeta {
  id: number
  started_at: number
  ended_at: number
  target_lang: string
  line_count: number
  title?: string
  share_token?: string
}

interface SessionDetail {
  session: Record<string, unknown>
  lines: Array<{ line_index: number; text: string }>
}

type SortKey = 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc'

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function SessionsPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>()
  const navigate = useNavigate()
  const auth = getSession()

  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('date_desc')

  // Detail modal
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editingTitle, setEditingTitle] = useState('')
  const [titleSaved, setTitleSaved] = useState(false)

  // Row actions
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [shareCopied, setShareCopied] = useState<number | null>(null)
  const [shareLoading, setShareLoading] = useState<number | null>(null)

  useEffect(() => {
    if (!auth) { navigate('/login', { replace: true }); return }
    const token = getToken()
    if (!token || !workspaceSlug) return
    setLoading(true)
    fetch(`/api/sessions?workspace_slug=${workspaceSlug}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((d: { sessions: SessionMeta[] } | null) => { if (d) setSessions(d.sessions) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workspaceSlug, auth, navigate])

  useEffect(() => {
    if (detail) setEditingTitle((detail.session.title as string) ?? '')
  }, [detail])

  const openDetail = useCallback(async (id: number) => {
    const token = getToken()
    if (!token) return
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await fetch(`/api/sessions/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setDetail(await res.json() as SessionDetail)
    } catch { /* silent */ }
    finally { setDetailLoading(false) }
  }, [])

  const patchTitle = useCallback(async (id: number, title: string) => {
    const token = getToken()
    if (!token) return
    const trimmed = title.trim()
    try {
      await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: trimmed || null }),
      })
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: trimmed || undefined } : s))
      setTitleSaved(true)
      setTimeout(() => setTitleSaved(false), 1800)
    } catch { /* silent */ }
  }, [])

  const handleShare = useCallback(async (s: SessionMeta) => {
    const token = getToken()
    if (!token) return
    if (s.share_token) {
      navigator.clipboard.writeText(`${window.location.origin}/share/${s.share_token}`)
      setShareCopied(s.id)
      setTimeout(() => setShareCopied(null), 2400)
      return
    }
    setShareLoading(s.id)
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: s.id }),
      })
      if (res.ok) {
        const { token: shareToken } = await res.json() as { token: string }
        setSessions(prev => prev.map(x => x.id === s.id ? { ...x, share_token: shareToken } : x))
        navigator.clipboard.writeText(`${window.location.origin}/share/${shareToken}`)
        setShareCopied(s.id)
        setTimeout(() => setShareCopied(null), 2400)
      }
    } catch { /* silent */ }
    finally { setShareLoading(null) }
  }, [])

  const handleDelete = useCallback(async (id: number) => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id))
        if (detail && (detail.session.id as number) === id) setDetail(null)
      }
    } catch { /* silent */ }
    finally { setDeletingId(null) }
  }, [detail])

  const filtered = sessions
    .filter(s => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (s.title ?? '').toLowerCase().includes(q) || fmtDate(s.started_at).toLowerCase().includes(q)
    })
    .sort((a, b) => {
      switch (sort) {
        case 'date_desc': return b.started_at - a.started_at
        case 'date_asc': return a.started_at - b.started_at
        case 'title_asc': return (a.title ?? fmtDate(a.started_at)).localeCompare(b.title ?? fmtDate(b.started_at))
        case 'title_desc': return (b.title ?? fmtDate(b.started_at)).localeCompare(a.title ?? fmtDate(a.started_at))
        default: return 0
      }
    })

  if (!auth) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header className="header-glass" style={{
        height: 'var(--header-h)', display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 10, flexShrink: 0,
      }}>
        <Link to={`/${workspaceSlug}`} style={{
          color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div className="logo-mark" style={{ width: 22, height: 22 }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 11 }}>i</span>
          </div>
          Studio
        </Link>
        <span style={{ color: 'var(--divider)', fontSize: 18, lineHeight: 1 }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Sessions</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{auth.email}</span>
      </header>

      {/* Body */}
      <div style={{ flex: 1, maxWidth: 860, width: '100%', margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>
              All sessions
            </h1>
            {!loading && sessions.length > 0 && (
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {filtered.length !== sessions.length
                  ? `${filtered.length} / ${sessions.length}`
                  : sessions.length}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <input
              className="input-field"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: 13, width: 170, padding: '6px 12px' }}
            />
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              style={{
                background: 'var(--surface-1)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 12,
                padding: '0 10px', height: 34, cursor: 'pointer',
              }}
            >
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="title_asc">Title A→Z</option>
              <option value="title_desc">Title Z→A</option>
            </select>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 12 }}>
              {sessions.length === 0 ? 'No sessions yet.' : 'No results.'}
            </p>
            {sessions.length === 0 && (
              <Link to={`/${workspaceSlug}`} style={{ color: 'var(--accent)', fontSize: 13 }}>
                ← Start your first session
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(s => {
              const lang = LANGUAGES.find(l => l.code === s.target_lang)
              const isConfirm = deletingId === s.id

              return (
                <div
                  key={s.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '11px 16px',
                    background: 'var(--canvas)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border)',
                    transition: 'box-shadow 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 1px 8px rgba(0,0,0,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                >
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 14, fontWeight: 600, color: 'var(--text)',
                      margin: 0, marginBottom: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {s.title ?? `Session — ${fmtDate(s.started_at)}`}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                      {fmtDate(s.started_at)}
                      {' · '}{fmtDuration(s.ended_at - s.started_at)}
                      {' · '}{lang ? `${lang.flag} ${lang.label}` : s.target_lang}
                      {' · '}{s.line_count} lines
                      {s.share_token && (
                        <span style={{ marginLeft: 5, color: 'var(--accent)' }}>· 🔗</span>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  {isConfirm ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Delete?</span>
                      <button
                        onClick={() => handleDelete(s.id)}
                        style={{
                          background: 'var(--red)', color: '#fff', border: 'none',
                          borderRadius: 6, fontSize: 12, padding: '4px 12px',
                          cursor: 'pointer', fontWeight: 600,
                        }}
                      >Yes</button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="btn-icon"
                        style={{ fontSize: 12 }}
                      >Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => openDetail(s.id)}
                        className="btn-icon"
                        style={{ fontSize: 12 }}
                      >Open</button>
                      <button
                        onClick={() => handleShare(s)}
                        className="btn-icon"
                        disabled={shareLoading === s.id}
                        style={{
                          fontSize: 12,
                          color: shareCopied === s.id ? 'var(--live)' : undefined,
                        }}
                      >
                        {shareCopied === s.id ? '✓ Copied' : shareLoading === s.id ? '…' : '↗ Share'}
                      </button>
                      <button
                        onClick={() => setDeletingId(s.id)}
                        className="btn-icon"
                        style={{ fontSize: 12, color: 'var(--red)' }}
                      >Delete</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {(detail || detailLoading) && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setDetail(null) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          <div style={{
            width: '100%', maxWidth: 700,
            background: 'var(--canvas)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex', flexDirection: 'column',
            maxHeight: '85vh', overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '18px 24px', borderBottom: '1px solid var(--divider)', flexShrink: 0,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {detail ? (
                  <>
                    <input
                      value={editingTitle}
                      onChange={e => setEditingTitle(e.target.value)}
                      onFocus={e => (e.target.style.borderBottomColor = 'var(--border-accent)')}
                      onBlur={e => {
                        e.target.style.borderBottomColor = 'transparent'
                        patchTitle(detail.session.id as number, editingTitle)
                      }}
                      onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      placeholder="Add a title…"
                      style={{
                        background: 'transparent', border: 'none',
                        borderBottom: '1px solid transparent',
                        outline: 'none', fontSize: 16, fontWeight: 600,
                        color: 'var(--text)', width: '100%',
                        padding: '0 0 2px', transition: 'border-color 0.15s',
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                        {fmtDate(detail.session.started_at as number)} · {detail.lines.length} lines
                      </p>
                      {titleSaved && (
                        <span style={{ fontSize: 11, color: 'var(--live)', fontWeight: 600 }}>✓ Saved</span>
                      )}
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Loading…</p>
                )}
              </div>
              <button onClick={() => setDetail(null)} className="btn-icon" style={{ fontSize: 16 }}>✕</button>
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                  Loading…
                </div>
              ) : detail ? (
                detail.session.ai_formatted_text ? (
                  <>
                    <p style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
                      textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16,
                    }}>AI structured</p>
                    <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.78, whiteSpace: 'pre-wrap' }}>
                      {detail.session.ai_formatted_text as string}
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
                      textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16,
                    }}>Transcript</p>
                    {detail.lines.map(l => (
                      <p key={l.line_index} style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.78, marginBottom: 12 }}>
                        {l.text}
                      </p>
                    ))}
                  </>
                )
              ) : null}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

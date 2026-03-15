import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getSession, getToken } from '../lib/auth'
import { sentryFetch } from '../lib/sentryFetch'
import { LANGUAGES } from '../lib/languages'
import SessionDetailModal from '../components/SessionDetailModal'

interface SessionMeta {
  id: number
  started_at: number
  ended_at: number
  target_lang: string
  line_count: number
  title?: string
  share_token?: string
  share_expires_at?: number | null
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

function fmtExpiry(ts: number | null | undefined): string {
  if (!ts) return 'No expiry'
  return `Expires ${new Date(ts * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
}

export default function SessionsPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>()
  const navigate = useNavigate()
  const [auth] = useState(() => getSession())

  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('date_desc')

  // Detail modal
  const [viewingSessionId, setViewingSessionId] = useState<number | null>(null)

  // FTS search
  const [ftsResults, setFtsResults] = useState<Array<{ session_id: number; snippet: string }> | null>(null)
  const [ftsLoading, setFtsLoading] = useState(false)
  const ftsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!auth) { navigate('/login', { replace: true }); return }
    const token = getToken()
    if (!token || !workspaceSlug) { setLoading(false); return }
    setLoading(true)
    setLoadError(false)
    fetch(`/api/sessions?workspace_slug=${workspaceSlug}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: { sessions: SessionMeta[]; next_cursor: number | null }) => {
        setSessions(d.sessions)
        setNextCursor(d.next_cursor)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [workspaceSlug, auth, navigate])

  // Debounced FTS search
  useEffect(() => {
    if (ftsDebounceRef.current) clearTimeout(ftsDebounceRef.current)
    const q = search.trim()
    if (q.length < 2) { setFtsResults(null); return }
    ftsDebounceRef.current = setTimeout(() => {
      const token = getToken()
      if (!token || !workspaceSlug) return
      setFtsLoading(true)
      fetch(`/api/sessions/search?q=${encodeURIComponent(q)}&workspace_slug=${workspaceSlug}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then((d: { results: Array<{ session_id: number; snippet: string }> } | null) => {
          if (d) setFtsResults(d.results)
        })
        .catch(() => {})
        .finally(() => setFtsLoading(false))
    }, 300)
    return () => { if (ftsDebounceRef.current) clearTimeout(ftsDebounceRef.current) }
  }, [search, workspaceSlug])



  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    const token = getToken()
    if (!token || !workspaceSlug) return
    setLoadingMore(true)
    try {
      const res = await sentryFetch(
        `/api/sessions?workspace_slug=${workspaceSlug}&before_id=${nextCursor}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) {
        const d = await res.json() as { sessions: SessionMeta[]; next_cursor: number | null }
        setSessions(prev => [...prev, ...d.sessions])
        setNextCursor(d.next_cursor)
      }
    } catch { /* silent */ }
    finally { setLoadingMore(false) }
  }, [nextCursor, loadingMore, workspaceSlug])

  const snippetMap = useMemo(
    () => ftsResults ? new Map(ftsResults.map(r => [r.session_id, r.snippet])) : new Map<number, string>(),
    [ftsResults]
  )

  const filtered = useMemo(() => {
    if (ftsResults !== null) {
      // FTS mode: order by FTS result order, merge with sessions for full metadata
      return ftsResults
        .map(r => sessions.find(s => s.id === r.session_id))
        .filter((s): s is SessionMeta => s !== undefined)
    }
    // Client-side filter + sort
    const q = search.trim().toLowerCase()
    const base = q.length === 0
      ? sessions.slice()
      : sessions.filter(s =>
          (s.title ?? '').toLowerCase().includes(q) || fmtDate(s.started_at).toLowerCase().includes(q)
        )
    return base.sort((a, b) => {
      switch (sort) {
        case 'date_desc': return b.started_at - a.started_at
        case 'date_asc': return a.started_at - b.started_at
        case 'title_asc': return (a.title ?? fmtDate(a.started_at)).localeCompare(b.title ?? fmtDate(b.started_at))
        case 'title_desc': return (b.title ?? fmtDate(b.started_at)).localeCompare(a.title ?? fmtDate(a.started_at))
        default: return 0
      }
    })
  }, [sessions, ftsResults, search, sort])

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
            <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
            Loading sessions…
          </div>
        ) : loadError ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 15, color: 'var(--red)', marginBottom: 12 }}>Failed to load sessions.</p>
            <button
              onClick={() => { setLoadError(false); setLoading(true); window.location.reload() }}
              className="btn-icon"
              style={{ fontSize: 13 }}
            >Try again</button>
          </div>
        ) : ftsLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Searching…
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
          <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(s => {
              const lang = LANGUAGES.find(l => l.code === s.target_lang)

              return (
                <div
                  key={s.id}
                  className="session-row"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '11px 16px',
                    background: 'var(--canvas)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border)',
                  }}
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
                        <span style={{ marginLeft: 5, color: 'var(--accent)' }}>
                          · 🔗 {fmtExpiry(s.share_expires_at)}
                        </span>
                      )}
                    </p>
                    {snippetMap.has(s.id) && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0', fontStyle: 'italic' }}>
                        {snippetMap.get(s.id)!
                          .split(/(<b>[^<]*<\/b>)/g)
                          .map((part, idx) => {
                            const m = part.match(/^<b>([^<]*)<\/b>$/)
                            return m ? <b key={idx}>{m[1]}</b> : part
                          })}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setViewingSessionId(s.id)} className="btn-icon" style={{ fontSize: 12 }}>Open</button>
                    <button
                      onClick={() => setViewingSessionId(s.id)}
                      className="btn-icon"
                      style={{ fontSize: 12, color: s.share_token ? 'var(--accent)' : undefined }}
                    >
                      {s.share_token ? '🔗 Shared' : '↗ Share'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Load more */}
          {nextCursor !== null && !ftsResults && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn-icon"
                style={{ fontSize: 13, padding: '8px 20px', opacity: loadingMore ? 0.6 : 1 }}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
          </>
        )}
      </div>

      <SessionDetailModal
        sessionId={viewingSessionId}
        onClose={() => setViewingSessionId(null)}
        onTitleChange={(id, title) => setSessions(prev => prev.map(s => s.id === id ? { ...s, title: title ?? undefined } : s))}
        onDeleted={(id) => setSessions(prev => prev.filter(s => s.id !== id))}
        onShareChange={(id, token) => setSessions(prev => prev.map(s => s.id === id ? { ...s, share_token: token ?? undefined } : s))}
      />
    </div>
  )
}
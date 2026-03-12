import { useState, useEffect } from 'react'
import { getToken, getSession } from '../lib/auth'

interface TeamMember {
  member_email: string
  role: string
  status: string
  invited_at: number
  joined_at: number | null
}

interface Props {
  workspaceSlug: string
  onClose: () => void
}

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
  return key.slice(0, 14) + '••••••••••••••••'
}

export default function TeamModal({ workspaceSlug, onClose }: Props) {
  const session = getSession()
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSent, setInviteSent] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const [apiKeyLoading, setApiKeyLoading] = useState(false)
  const [apiKeyCopied, setApiKeyCopied] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) { setLoading(false); return }
    Promise.all([
      fetch(`/api/workspace?workspace_slug=${workspaceSlug}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null),
      fetch('/api/team/members', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null),
    ]).then(([ws, tm]) => {
      if (ws?.workspace) {
        setOwnerEmail(ws.workspace.owner_email ?? null)
        setApiKey(ws.workspace.api_key ?? null)
      }
      if (tm?.members) setMembers(tm.members)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [workspaceSlug])

  const isOwner = session?.email === ownerEmail
  const activeCount = 1 + members.filter(m => m.status === 'active').length
  const totalCount = 1 + members.length

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    const token = getToken()
    if (!token) return
    setInviteLoading(true)
    setInviteError(null)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (res.ok && data.ok) {
        const email = inviteEmail.trim().toLowerCase()
        setMembers(prev => [...prev.filter(m => m.member_email !== email), {
          member_email: email, role: 'member', status: 'pending',
          invited_at: Date.now(), joined_at: null,
        }])
        setInviteSent(email)
        setInviteEmail('')
        setTimeout(() => setInviteSent(null), 3500)
      } else {
        setInviteError(data.error ?? 'Failed to send invite')
      }
    } catch { setInviteError('Network error') }
    finally { setInviteLoading(false) }
  }

  const handleRemove = async (memberEmail: string) => {
    const token = getToken()
    if (!token) return
    setRemovingMember(memberEmail)
    try {
      const res = await fetch('/api/team/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ member_email: memberEmail }),
      })
      if (res.ok) setMembers(prev => prev.filter(m => m.member_email !== memberEmail))
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

  const handleCopyKey = () => {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey).then(() => {
      setApiKeyCopied(true)
      setTimeout(() => setApiKeyCopied(false), 2000)
    })
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 500,
        background: 'var(--canvas)',
        borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.06)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        maxHeight: 'calc(100vh - 80px)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--divider)',
          flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Team</span>
              {!loading && (
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  background: 'rgba(245,158,11,0.10)', color: '#d97706',
                  border: '1px solid rgba(245,158,11,0.22)',
                  padding: '2px 8px', borderRadius: 999,
                }}>
                  {activeCount} / 5
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Manage members and API access
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(128,128,128,0.10)', border: 'none',
              cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '32px 24px', textAlign: 'center' }}>
              Loading…
            </p>
          ) : (
            <>
              {/* ── Members ── */}
              <div style={{ padding: '20px 24px 0' }}>
                <p style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--text-muted)',
                  margin: '0 0 10px',
                }}>Members</p>

                <div style={{
                  border: '1px solid var(--divider)',
                  borderRadius: 12, overflow: 'hidden',
                }}>
                  {/* Owner */}
                  {ownerEmail && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px',
                      borderBottom: members.length > 0 ? '1px solid var(--divider)' : 'none',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: avatarColor(ownerEmail),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#fff',
                      }}>
                        {initials(ownerEmail)}
                      </div>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ownerEmail}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: '#d97706', background: 'rgba(245,158,11,0.10)',
                        border: '1px solid rgba(245,158,11,0.22)', padding: '3px 9px', borderRadius: 999,
                        flexShrink: 0,
                      }}>Owner</span>
                    </div>
                  )}

                  {/* Members */}
                  {members.map((m, i) => (
                    <div key={m.member_email} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px',
                      borderBottom: i < members.length - 1 ? '1px solid var(--divider)' : 'none',
                      opacity: removingMember === m.member_email ? 0.35 : 1,
                      transition: 'opacity 0.2s',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: avatarColor(m.member_email),
                        opacity: m.status === 'pending' ? 0.5 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#fff',
                      }}>
                        {initials(m.member_email)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.member_email}
                        </p>
                        {m.status === 'pending' && (
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '1px 0 0' }}>Invite pending</p>
                        )}
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        padding: '3px 9px', borderRadius: 999, flexShrink: 0,
                        ...(m.status === 'active'
                          ? { color: 'var(--text-muted)', background: 'rgba(128,128,128,0.08)', border: '1px solid var(--divider)' }
                          : { color: '#d97706', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }
                        ),
                      }}>
                        {m.status === 'active' ? 'Member' : 'Pending'}
                      </span>
                      {isOwner && (
                        <button
                          onClick={() => handleRemove(m.member_email)}
                          disabled={removingMember === m.member_email}
                          style={{
                            width: 26, height: 26, borderRadius: 6, border: '1px solid var(--divider)',
                            background: 'transparent', cursor: 'pointer', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 15, color: 'var(--text-muted)', transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--divider)' }}
                        >×</button>
                      )}
                    </div>
                  ))}

                  {/* Invite input */}
                  {isOwner && totalCount <= 5 && (
                    <div style={{
                      display: 'flex', gap: 8, padding: '12px 16px',
                      borderTop: (members.length > 0 || ownerEmail) ? '1px solid var(--divider)' : 'none',
                      background: 'rgba(99,102,241,0.02)',
                    }}>
                      <input
                        type="email"
                        placeholder="colleague@company.com"
                        value={inviteEmail}
                        onChange={e => { setInviteEmail(e.target.value); setInviteError(null) }}
                        onKeyDown={e => { if (e.key === 'Enter') handleInvite() }}
                        className="input-field"
                        style={{ flex: 1, fontSize: 13 }}
                      />
                      <button
                        onClick={handleInvite}
                        disabled={inviteLoading || !inviteEmail.trim()}
                        className="btn-primary"
                        style={{
                          width: 'auto', padding: '0 16px', fontSize: 13,
                          opacity: (!inviteEmail.trim() || inviteLoading) ? 0.5 : 1,
                          flexShrink: 0,
                        }}
                      >
                        {inviteLoading ? '…' : 'Invite'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Feedback messages */}
                {inviteSent && (
                  <p style={{ fontSize: 12, color: '#16a34a', margin: '8px 0 0', fontWeight: 500 }}>
                    ✓ Invite sent to {inviteSent}
                  </p>
                )}
                {inviteError && (
                  <p style={{ fontSize: 12, color: '#ef4444', margin: '8px 0 0' }}>{inviteError}</p>
                )}
              </div>

              {/* ── API Key ── */}
              {isOwner && (
                <div style={{ padding: '20px 24px 24px' }}>
                  <p style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--text-muted)',
                    margin: '0 0 10px',
                  }}>API Access</p>

                  <div style={{
                    border: '1px solid var(--divider)',
                    borderRadius: 12, padding: '16px 18px',
                  }}>
                    {apiKey ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <code style={{
                            flex: 1, fontSize: 12, fontFamily: 'monospace',
                            color: 'var(--text)', background: 'rgba(0,0,0,0.04)',
                            border: '1px solid var(--divider)', borderRadius: 7,
                            padding: '7px 11px', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {maskApiKey(apiKey)}
                          </code>
                          <button
                            onClick={handleCopyKey}
                            style={{
                              flexShrink: 0, padding: '6px 12px', borderRadius: 7,
                              border: '1px solid var(--divider)', background: 'transparent',
                              fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              color: apiKeyCopied ? '#16a34a' : 'var(--text-muted)',
                              whiteSpace: 'nowrap', transition: 'color 0.2s',
                            }}
                          >
                            {apiKeyCopied ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
                          Pass this key as <code style={{ fontSize: 11 }}>Authorization: Bearer …</code> to call the ISOL REST API.
                        </p>
                        <button
                          onClick={() => handleApiKey('revoke')}
                          disabled={apiKeyLoading}
                          style={{
                            fontSize: 12, fontWeight: 600, padding: '6px 13px',
                            borderRadius: 7, border: '1px solid rgba(239,68,68,0.30)',
                            background: 'rgba(239,68,68,0.06)', color: '#ef4444',
                            cursor: 'pointer', opacity: apiKeyLoading ? 0.5 : 1,
                          }}
                        >
                          Revoke
                        </button>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: '0 0 3px' }}>No API key</p>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Generate a key to integrate with the ISOL REST API</p>
                        </div>
                        <button
                          onClick={() => handleApiKey('generate')}
                          disabled={apiKeyLoading}
                          className="btn-primary"
                          style={{ width: 'auto', padding: '8px 16px', fontSize: 13, flexShrink: 0, opacity: apiKeyLoading ? 0.5 : 1 }}
                        >
                          {apiKeyLoading ? '…' : 'Generate'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

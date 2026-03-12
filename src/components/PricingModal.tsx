import { useState } from 'react'
import { getToken } from '../lib/auth'

interface Props {
  currentPlan: 'free' | 'pro' | 'studio' | 'team'
  workspaceSlug: string
  onClose: () => void
}

const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, studio: 2, team: 3 }

interface PlanDef {
  id: 'pro' | 'studio' | 'team'
  name: string
  tagline: string
  monthlyPrice: number
  annualPrice: number
  bullets: string[]
}

const PLANS: PlanDef[] = [
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For interpreters who work daily',
    monthlyPrice: 19,
    annualPrice: 15,
    bullets: [
      '30 sessions per month',
      'Up to 2 hours per session',
      '40+ target languages',
      'AI notes & document formatting',
      '5 shareable session links',
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'No caps. No interruptions. Just work.',
    monthlyPrice: 49,
    annualPrice: 39,
    bullets: [
      'Unlimited sessions, no time limits',
      '40+ target languages',
      'All AI features included',
      'Priority audio processing',
      'Unlimited shareable links',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'For agencies and interpretation teams',
    monthlyPrice: 129,
    annualPrice: 99,
    bullets: [
      'Everything in Studio',
      'Up to 5 team members',
      'Full REST API access',
      'Team management',
      'Priority support',
    ],
  },
]

export default function PricingModal({ currentPlan, workspaceSlug: _workspaceSlug, onClose }: Props) {
  // Default to annual — shows lower price, switching to monthly feels like paying more
  const [isAnnual, setIsAnnual] = useState(true)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handleCheckout = async (planId: string) => {
    setLoadingPlan(planId)
    try {
      const token = getToken()
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan: planId, annual: isAnnual }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) window.location.href = data.url
    } catch { /* silent */ }
    finally { setLoadingPlan(null) }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: 860,
        background: 'var(--canvas)',
        borderRadius: 24,
        boxShadow: '0 32px 80px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow behind Studio */}
        <div style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: 400, height: 300,
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.14) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16, zIndex: 10,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(128,128,128,0.12)', border: 'none',
            cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{ padding: '36px 36px 0', textAlign: 'center' }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--accent)',
            margin: '0 0 10px',
          }}>
            Upgrade your workspace
          </p>
          <h2 style={{
            fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em',
            color: 'var(--text)', margin: '0 0 8px', lineHeight: 1.1,
          }}>
            Work without limits
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
            Professional interpreters choose ISOL Studio to run sessions without ever thinking about caps.
          </p>

          {/* Annual toggle */}
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'rgba(0,0,0,0.06)', borderRadius: 999, padding: '4px 5px',
            marginBottom: 28, gap: 2,
          }}>
            <button
              onClick={() => setIsAnnual(false)}
              style={{
                padding: '6px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: !isAnnual ? 'var(--canvas)' : 'transparent',
                color: !isAnnual ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: !isAnnual ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              style={{
                padding: '6px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: isAnnual ? 'var(--canvas)' : 'transparent',
                color: isAnnual ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: isAnnual ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              Annual
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.04em',
                background: isAnnual ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.10)',
                color: '#16a34a', borderRadius: 999, padding: '2px 7px',
              }}>
                −2 months
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.08fr 1fr',
          gap: 12,
          padding: '0 28px 28px',
          alignItems: 'start',
        }}>
          {PLANS.map(plan => {
            const isStudio = plan.id === 'studio'
            const isCurrent = currentPlan === plan.id
            const isUpgrade = PLAN_RANK[plan.id] > PLAN_RANK[currentPlan]
            const isLoading = loadingPlan === plan.id
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice

            return (
              <div
                key={plan.id}
                style={{
                  position: 'relative',
                  borderRadius: 18,
                  padding: isStudio ? '28px 24px 24px' : '24px 22px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  ...(isStudio
                    ? {
                        background: 'linear-gradient(150deg, #4f46e5 0%, #7c3aed 100%)',
                        boxShadow: '0 20px 50px rgba(99,102,241,0.40), 0 0 0 1px rgba(255,255,255,0.12)',
                      }
                    : {
                        background: 'var(--surface-1)',
                        border: '1px solid var(--divider)',
                      }),
                }}
              >
                {isStudio && (
                  <div style={{
                    position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                    color: '#fff', fontSize: 9, fontWeight: 800,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    padding: '4px 14px', borderRadius: '0 0 10px 10px',
                    whiteSpace: 'nowrap',
                  }}>
                    Most popular
                  </div>
                )}

                {/* Plan name */}
                <div style={{ marginBottom: 12 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: isStudio ? 'rgba(255,255,255,0.70)' : 'var(--text-muted)',
                  }}>
                    {plan.name}
                  </span>
                </div>

                {/* Price */}
                <div style={{ marginBottom: 2 }}>
                  <span style={{
                    fontSize: 42, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1,
                    color: isStudio ? '#fff' : 'var(--text)',
                  }}>
                    ${price}
                  </span>
                  <span style={{
                    fontSize: 13, fontWeight: 500, marginLeft: 3,
                    color: isStudio ? 'rgba(255,255,255,0.55)' : 'var(--text-muted)',
                  }}>
                    /mo
                  </span>
                </div>

                {isAnnual && (
                  <p style={{
                    fontSize: 11, margin: '3px 0 0',
                    color: isStudio ? 'rgba(255,255,255,0.45)' : 'var(--text-muted)',
                  }}>
                    billed ${plan.annualPrice * 12}/yr
                    {!isStudio && (
                      <span style={{ marginLeft: 6, color: '#16a34a', fontWeight: 600 }}>
                        (save ${(plan.monthlyPrice - plan.annualPrice) * 12})
                      </span>
                    )}
                  </p>
                )}

                {/* Tagline */}
                <p style={{
                  fontSize: 12, margin: '12px 0 16px', lineHeight: 1.5,
                  color: isStudio ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)',
                }}>
                  {plan.tagline}
                </p>

                {/* Divider */}
                <div style={{
                  height: 1, marginBottom: 16,
                  background: isStudio ? 'rgba(255,255,255,0.12)' : 'var(--divider)',
                }} />

                {/* Bullets */}
                <ul style={{ margin: '0 0 22px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                  {plan.bullets.map(bullet => (
                    <li key={bullet} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                      <span style={{
                        fontSize: 12, fontWeight: 800, lineHeight: 1.5, flexShrink: 0,
                        color: isStudio ? 'rgba(255,255,255,0.90)' : '#22c55e',
                      }}>
                        ✓
                      </span>
                      <span style={{
                        fontSize: 12, lineHeight: 1.5,
                        color: isStudio ? 'rgba(255,255,255,0.80)' : 'var(--text-dim)',
                      }}>
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <button disabled style={{
                    width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                    background: isStudio ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
                    color: isStudio ? 'rgba(255,255,255,0.50)' : 'var(--text-muted)',
                    fontSize: 13, fontWeight: 600, cursor: 'not-allowed',
                  }}>
                    Current plan
                  </button>
                ) : isUpgrade ? (
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={isLoading}
                    style={{
                      width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                      fontSize: 14, fontWeight: 700, cursor: isLoading ? 'wait' : 'pointer',
                      transition: 'opacity 0.15s, transform 0.12s',
                      ...(isStudio
                        ? { background: '#fff', color: '#4f46e5', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }
                        : { background: 'rgba(99,102,241,0.10)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.20)' }
                      ),
                      opacity: isLoading ? 0.7 : 1,
                    }}
                    onMouseEnter={e => {
                      if (!isLoading) {
                        e.currentTarget.style.opacity = '0.90'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.opacity = '1'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {isLoading ? 'Redirecting…' : `Start ${plan.name} →`}
                  </button>
                ) : (
                  <button disabled style={{
                    width: '100%', padding: '11px 0', borderRadius: 10,
                    border: '1px solid var(--divider)',
                    background: 'transparent', color: 'var(--text-muted)',
                    fontSize: 13, fontWeight: 600, cursor: 'not-allowed', opacity: 0.5,
                  }}>
                    Downgrade
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Trust bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 20, padding: '0 28px 24px',
          fontSize: 11, color: 'var(--text-muted)',
          borderTop: '1px solid var(--divider)', paddingTop: 16,
        }}>
          <span>🔒 Secure via Stripe</span>
          <span style={{ color: 'var(--divider)' }}>·</span>
          <span>✓ Cancel anytime</span>
          <span style={{ color: 'var(--divider)' }}>·</span>
          <span>↩ 14-day money-back</span>
          <span style={{ color: 'var(--divider)' }}>·</span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: 'var(--text-muted)',
              textDecoration: 'underline', padding: 0,
            }}
          >
            Stay on Free
          </button>
        </div>
      </div>
    </div>
  )
}

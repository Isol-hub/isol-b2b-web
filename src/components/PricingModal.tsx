import { useState } from 'react'
import { getToken } from '../lib/auth'

interface Props {
  currentPlan: 'free' | 'pro' | 'studio' | 'team'
  workspaceSlug: string
  onClose: () => void
}

const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, studio: 2, team: 3 }

interface PlanDef {
  id: 'free' | 'pro' | 'studio' | 'team'
  name: string
  tagline: string
  monthlyPrice: number
  annualPrice: number
  features: {
    sessions: string
    duration: string
    languages: string
    aiDoc: boolean
    aiNotes: boolean
    shareLinks: string
    glossary: boolean
    priorityProcessing: boolean
    apiAccess: boolean
    seats: string
  }
}

const PLANS: PlanDef[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try ISOL with no commitment',
    monthlyPrice: 0,
    annualPrice: 0,
    features: {
      sessions: '3 total (lifetime)',
      duration: '15 min',
      languages: '1 (workspace default)',
      aiDoc: false,
      aiNotes: false,
      shareLinks: '✗',
      glossary: false,
      priorityProcessing: false,
      apiAccess: false,
      seats: '1',
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For individuals who interpret regularly',
    monthlyPrice: 19,
    annualPrice: 15,
    features: {
      sessions: '30 / month',
      duration: '2 hours',
      languages: '40+',
      aiDoc: true,
      aiNotes: true,
      shareLinks: '5 links',
      glossary: true,
      priorityProcessing: false,
      apiAccess: false,
      seats: '1',
    },
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'Unlimited power for serious interpreters',
    monthlyPrice: 49,
    annualPrice: 39,
    features: {
      sessions: 'Unlimited',
      duration: 'Unlimited',
      languages: '40+',
      aiDoc: true,
      aiNotes: true,
      shareLinks: 'Unlimited',
      glossary: true,
      priorityProcessing: true,
      apiAccess: false,
      seats: '1',
    },
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'For agencies and interpretation teams',
    monthlyPrice: 129,
    annualPrice: 99,
    features: {
      sessions: 'Unlimited',
      duration: 'Unlimited',
      languages: '40+',
      aiDoc: true,
      aiNotes: true,
      shareLinks: 'Unlimited',
      glossary: true,
      priorityProcessing: true,
      apiAccess: true,
      seats: '5',
    },
  },
]

type FeatureKey = keyof PlanDef['features']

const FEATURE_LABELS: { key: FeatureKey; label: string }[] = [
  { key: 'sessions', label: 'Sessions per month' },
  { key: 'duration', label: 'Session duration' },
  { key: 'languages', label: 'Languages' },
  { key: 'aiDoc', label: 'AI Enhanced document' },
  { key: 'aiNotes', label: 'AI Notes' },
  { key: 'shareLinks', label: 'Share links' },
  { key: 'glossary', label: 'Glossary' },
  { key: 'priorityProcessing', label: 'Priority processing' },
  { key: 'apiAccess', label: 'API access' },
  { key: 'seats', label: 'Seats' },
]

function renderFeatureValue(value: string | boolean): React.ReactNode {
  if (typeof value === 'boolean') {
    return value
      ? <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span>
      : <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>✗</span>
  }
  if (value === '✗') return <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>✗</span>
  return <span style={{ color: 'var(--text-dim)' }}>{value}</span>
}

export default function PricingModal({ currentPlan, workspaceSlug: _workspaceSlug, onClose }: Props) {
  const [isAnnual, setIsAnnual] = useState(false)
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
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      // silent
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 980,
          background: 'var(--canvas)',
          borderRadius: 20,
          boxShadow: 'var(--shadow-lg)',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'sticky',
            top: 20,
            float: 'right',
            marginRight: 20,
            zIndex: 10,
            background: 'rgba(0,0,0,0.08)',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            cursor: 'pointer',
            fontSize: 18,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{ padding: '40px 40px 0', textAlign: 'center' }}>
          <h2 style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
            margin: '0 0 8px',
          }}>
            Choose your plan
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: '0 0 28px' }}>
            Upgrade anytime. Downgrade or cancel when you need to.
          </p>

          {/* Billing toggle */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(0,0,0,0.06)',
            borderRadius: 999,
            padding: '5px 6px',
            marginBottom: 36,
          }}>
            <button
              onClick={() => setIsAnnual(false)}
              style={{
                padding: '7px 20px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
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
                padding: '7px 20px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                background: isAnnual ? 'var(--canvas)' : 'transparent',
                color: isAnnual ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: isAnnual ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Annual
              {isAnnual && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: 'rgba(34,197,94,0.15)',
                  color: '#16a34a',
                  borderRadius: 999,
                  padding: '1px 7px',
                  letterSpacing: '0.02em',
                }}>
                  Save 2 months
                </span>
              )}
            </button>
            {!isAnnual && (
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                background: 'rgba(34,197,94,0.12)',
                color: '#16a34a',
                borderRadius: 999,
                padding: '3px 10px',
                marginRight: 4,
                letterSpacing: '0.02em',
              }}>
                Save 2 months →
              </span>
            )}
          </div>
        </div>

        {/* Plan cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
          padding: '0 40px 32px',
        }}>
          {PLANS.map(plan => {
            const isStudio = plan.id === 'studio'
            const isCurrent = currentPlan === plan.id
            const isUpgrade = PLAN_RANK[plan.id] > PLAN_RANK[currentPlan]
            const isDowngrade = plan.id === 'free' && currentPlan !== 'free'
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice
            const isLoading = loadingPlan === plan.id

            return (
              <div
                key={plan.id}
                style={{
                  position: 'relative',
                  background: isStudio ? 'rgba(99,102,241,0.04)' : 'var(--surface-1)',
                  border: isStudio ? '2px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '28px 24px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Most popular badge */}
                {isStudio && (
                  <span style={{
                    position: 'absolute',
                    top: -1,
                    right: 20,
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    padding: '3px 10px',
                    borderRadius: '0 0 8px 8px',
                  }}>
                    Most popular
                  </span>
                )}

                {/* Plan name */}
                <div style={{ marginBottom: 4 }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isStudio ? 'var(--accent)' : 'var(--text)',
                    letterSpacing: '0.01em',
                  }}>
                    {plan.name}
                  </span>
                </div>

                {/* Price */}
                <div style={{ marginBottom: 4 }}>
                  <span style={{
                    fontSize: 36,
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    color: 'var(--text)',
                    lineHeight: 1,
                  }}>
                    ${price}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 4 }}>
                    /mo
                  </span>
                </div>

                {isAnnual && plan.monthlyPrice > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                    billed annually (${plan.annualPrice * 12}/yr)
                  </div>
                )}

                {/* Tagline */}
                <p style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  margin: '8px 0 20px',
                  lineHeight: 1.5,
                }}>
                  {plan.tagline}
                </p>

                {/* Feature list */}
                <div style={{ flex: 1, marginBottom: 24 }}>
                  {FEATURE_LABELS.map(({ key, label }) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 0',
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</span>
                      <span style={{ fontSize: 12, textAlign: 'right', flexShrink: 0 }}>
                        {renderFeatureValue(plan.features[key])}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA button */}
                {isCurrent ? (
                  <button
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 0',
                      borderRadius: 999,
                      border: '1px solid var(--border)',
                      background: 'rgba(0,0,0,0.04)',
                      color: 'var(--text-muted)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'not-allowed',
                      opacity: 0.7,
                    }}
                  >
                    Current plan
                  </button>
                ) : isDowngrade ? (
                  <div>
                    <button
                      disabled
                      style={{
                        width: '100%',
                        padding: '10px 0',
                        borderRadius: 999,
                        border: '1px solid var(--border)',
                        background: 'rgba(0,0,0,0.04)',
                        color: 'var(--text-muted)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'not-allowed',
                        opacity: 0.7,
                      }}
                    >
                      Downgrade
                    </button>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>
                      Contact support to downgrade
                    </p>
                  </div>
                ) : isUpgrade ? (
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '10px 0',
                      borderRadius: 999,
                      border: 'none',
                      background: isStudio
                        ? 'var(--accent)'
                        : 'rgba(99,102,241,0.12)',
                      color: isStudio ? '#fff' : 'var(--accent)',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isLoading ? 'wait' : 'pointer',
                      opacity: isLoading ? 0.7 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    {isLoading ? 'Redirecting…' : `Upgrade to ${plan.name}`}
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>

        {/* Trust line */}
        <div style={{
          textAlign: 'center',
          padding: '0 40px 32px',
          fontSize: 12,
          color: 'var(--text-muted)',
        }}>
          Secure payments via Stripe · Cancel anytime · 14-day money-back guarantee
        </div>
      </div>
    </div>
  )
}

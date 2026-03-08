import { useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  workspaceSlug: string
  onDone: () => void
}

const STEPS = [
  {
    icon: '✦',
    title: 'Welcome to ISOL Studio',
    body: 'Your real-time speech-to-document workspace. Capture, translate, and structure spoken content as it happens.',
  },
  {
    icon: '🎙',
    title: 'Choose your audio source',
    body: 'Connect a room device, phone, or your computer mic. Select the language and hit Start Recording.',
  },
  {
    icon: '✦',
    title: 'AI does the work',
    body: 'Lines are transcribed, translated, and formatted live. Switch between Raw, AI Structured, and Notes views at any time.',
  },
  {
    icon: '🔗',
    title: 'Share the transcript',
    body: 'After saving, generate a shareable link. Viewers can follow live or review the full transcript with inline comments.',
  },
]

export default function OnboardingModal({ workspaceSlug, onDone }: Props) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem(`isol_onboarded_${workspaceSlug}`, '1')
      onDone()
    } else {
      setStep(s => s + 1)
    }
  }

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 20000,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--canvas)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        padding: '32px 28px 24px',
        animation: 'fadeIn 0.15s ease-out',
      }}>
        {/* Step icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'rgba(99,102,241,0.10)',
          border: '1px solid rgba(99,102,241,0.20)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, marginBottom: 20,
        }}>
          {current.icon}
        </div>

        {/* Text */}
        <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: '0 0 10px', lineHeight: 1.3 }}>
          {current.title}
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.65, margin: '0 0 28px' }}>
          {current.body}
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: 4, flex: i === step ? 2 : 1,
              borderRadius: 2,
              background: i === step ? 'var(--accent)' : 'var(--surface-3)',
              transition: 'flex 0.3s, background 0.3s',
            }} />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="btn-icon"
              style={{ fontSize: 13, padding: '7px 16px' }}
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 13, fontWeight: 600,
              padding: '7px 20px', cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {isLast ? 'Get started' : 'Next →'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

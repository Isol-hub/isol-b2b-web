import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  dangerous?: boolean
}

export default function ConfirmModal({ isOpen, title, message, confirmLabel = 'Confirm', onConfirm, onCancel, dangerous = false }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCancel(); return }
      if (e.key === 'Enter') { onConfirm(); return }
      // Focus trap: keep Tab within the modal
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )).filter(el => !el.hasAttribute('disabled'))
        if (!focusable.length) { e.preventDefault(); return }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
          e.preventDefault()
          ;(e.shiftKey ? last : first).focus()
        }
      }
    }
    window.addEventListener('keydown', handler)
    // Move focus into modal on open
    setTimeout(() => panelRef.current?.querySelector<HTMLElement>('button')?.focus(), 30)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onCancel, onConfirm])

  if (!isOpen) return null

  return createPortal(
    <div
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 20000,
        background: 'rgba(0,0,0,0.50)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div ref={panelRef} style={{
        width: '100%', maxWidth: 380,
        background: 'var(--canvas)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        padding: '24px',
        animation: 'fadeIn 0.12s ease-out',
      }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>{title}</p>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, margin: '0 0 20px' }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            className="btn-icon"
            style={{ fontSize: 13, padding: '7px 16px' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: dangerous ? 'var(--red)' : 'var(--accent)',
              color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 13, fontWeight: 600,
              padding: '7px 18px', cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

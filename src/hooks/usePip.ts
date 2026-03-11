import { useState, useCallback } from 'react'

export function usePip() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null)

  const open = useCallback(async (width = 480, height = 160): Promise<boolean> => {
    const dPip = (window as any).documentPictureInPicture
    if (!dPip) return false
    try {
      const pip: Window = await dPip.requestWindow({ width, height })

      // Copy all stylesheets so CSS variables and animations transfer
      ;[...document.styleSheets].forEach(sheet => {
        try {
          if (sheet.href) {
            const link = pip.document.createElement('link')
            link.rel = 'stylesheet'
            link.href = sheet.href
            pip.document.head.appendChild(link)
          } else {
            const rules = [...sheet.cssRules].map(r => r.cssText).join('\n')
            const style = pip.document.createElement('style')
            style.textContent = rules
            pip.document.head.appendChild(style)
          }
        } catch { /* skip cross-origin sheets */ }
      })

      pip.document.documentElement.setAttribute('data-theme',
        document.documentElement.getAttribute('data-theme') ?? '')
      pip.document.body.style.cssText = 'margin:0;background:var(--bg);overflow:hidden'

      pip.addEventListener('pagehide', () => setPipWindow(null))
      setPipWindow(pip)
      return true
    } catch {
      return false
    }
  }, [])

  const close = useCallback(() => {
    pipWindow?.close()
    setPipWindow(null)
  }, [pipWindow])

  const isSupported = !!(window as any).documentPictureInPicture

  return { open, close, isOpen: !!pipWindow, pipWindow, isSupported }
}

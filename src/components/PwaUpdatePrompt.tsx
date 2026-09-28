import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui'
import { registerServiceWorker } from '@/lib/register-service-worker'

type ActivateServiceWorkerUpdate = () => Promise<void>

const REMINDER_DELAY_MS = 10 * 60 * 1000

export const PwaUpdatePrompt = () => {
  const [activateUpdate, setActivateUpdate] = useState<ActivateServiceWorkerUpdate | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [updating, setUpdating] = useState(false)
  const reminderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    registerServiceWorker((activate) => setActivateUpdate(() => activate))

    return () => {
      if (reminderTimer.current) clearTimeout(reminderTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!activateUpdate) return

    const resurface = () => {
      if (document.visibilityState !== 'visible') return
      if (reminderTimer.current) clearTimeout(reminderTimer.current)
      setDismissed(false)
    }

    document.addEventListener('visibilitychange', resurface)
    return () => document.removeEventListener('visibilitychange', resurface)
  }, [activateUpdate])

  const deferUpdate = () => {
    setDismissed(true)
    if (reminderTimer.current) clearTimeout(reminderTimer.current)
    reminderTimer.current = setTimeout(() => setDismissed(false), REMINDER_DELAY_MS)
  }

  const applyUpdate = async () => {
    if (!activateUpdate) return
    setUpdating(true)
    try {
      await activateUpdate()
    } catch {
      setUpdating(false)
    }
  }

  if (!activateUpdate || dismissed) return null

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem 1rem',
        padding: '0.75rem 1rem',
        background: 'var(--primary-fixed)',
        color: 'var(--on-primary-fixed-variant)',
      }}
    >
      <div style={{ flex: '1 1 16rem' }}>
        <p style={{ margin: 0, fontWeight: 700 }}>A new version of Vitals is available.</p>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
          Choose when to reload. Reloading may discard unsaved changes.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Button variant="ghost" size="sm" onClick={deferUpdate} disabled={updating}>
          Not now
        </Button>
        <Button size="sm" onClick={() => void applyUpdate()} loading={updating}>
          Update / Reload
        </Button>
      </div>
    </aside>
  )
}

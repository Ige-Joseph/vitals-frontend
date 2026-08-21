import { useState, useCallback, useEffect, useRef } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { getFirebaseMessaging } from '@/lib/firebase'
import { api } from '@/lib/api'
import { toSafeAppPath } from '@/lib/browser-security'
import { useAuthStore } from '@/store/auth.store'

export type PushState =
  | 'idle'
  | 'requesting'
  | 'enabled'
  | 'denied'
  | 'unsupported'
  | 'failed'

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export function usePushNotifications() {
  const { isAuthenticated } = useAuthStore()
  const [pushState, setPushState] = useState<PushState>(() => {
    if (typeof window === 'undefined') return 'idle'
    if (!('Notification' in window)) return 'unsupported'
    if (Notification.permission === 'granted') {
      return sessionStorage.getItem('vitals-push-registered') === '1' ? 'enabled' : 'idle'
    }
    if (Notification.permission === 'denied') return 'denied'
    return 'idle'
  })

  const listenerRef = useRef<(() => void) | null>(null)

  const requestPermissionAndRegister = useCallback(async (): Promise<void> => {
    if (pushState === 'enabled') return
    if (pushState === 'denied') { console.warn('[push] Notifications blocked'); return }
    if (!VAPID_KEY) { console.warn('[push] VAPID key not set'); return }

    const messaging = getFirebaseMessaging()
    if (!messaging) { setPushState('unsupported'); return }

    setPushState('requesting')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setPushState('denied'); return }


      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/firebase-cloud-messaging-push-scope',
      })

      await registration.update()

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      })
            

      if (!token) { setPushState('failed'); return }

      await api.post('/api/v1/push/register', { token })
      setPushState('enabled')
      sessionStorage.setItem('vitals-push-registered', '1')
    } catch (err) {
      if (Notification.permission === 'denied') {
        setPushState('denied')
      } else {
        setPushState('failed')
        console.error('[push] Registration failed:', err)
      }
    }
  }, [pushState])

  useEffect(() => {
    if (!isAuthenticated || listenerRef.current) return
    const messaging = getFirebaseMessaging()
    if (!messaging) return

    listenerRef.current = onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? 'Vitals'
      const body  = payload.notification?.body  ?? 'You have a notification'
      if (Notification.permission === 'granted') {
        const note = new Notification(title, { body, icon: '/icons/icon-192x192.png' })
        note.onclick = () => {
          window.focus()
          const link = (payload as { fcmOptions?: { link?: string } }).fcmOptions?.link
          window.location.assign(toSafeAppPath(link))
          note.close()
        }
      }
    })

    return () => { listenerRef.current?.(); listenerRef.current = null }
  }, [isAuthenticated])

  return { pushState, requestPermissionAndRegister }
}

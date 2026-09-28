import { registerSW } from 'virtual:pwa-register'

type ActivateServiceWorkerUpdate = () => Promise<void>

export const registerServiceWorker = (
  onUpdateAvailable: (activateUpdate: ActivateServiceWorkerUpdate) => void,
): void => {
  if (!import.meta.env.PROD) return

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_serviceWorkerUrl, registration) {
      if (!registration) return

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update()
      })
    },
    onNeedRefresh() {
      onUpdateAvailable(() => updateSW(true))
    },
  })
}

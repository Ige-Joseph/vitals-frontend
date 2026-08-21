export const SESSION_EXPIRED_EVENT = 'vitals:session-expired'

let accessToken: string | null = null

export const getAccessToken = (): string | null => accessToken

export const setAccessToken = (token: string): void => {
  accessToken = token
}

export const clearAccessToken = (): void => {
  accessToken = null
}

export const notifySessionExpired = (): void => {
  clearAccessToken()
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

/**
 * Read the previous refresh-token format once so an existing session can be
 * exchanged for an HttpOnly cookie. All legacy persisted auth data is removed
 * immediately, whether or not migration succeeds.
 */
export const consumeLegacyRefreshToken = (): string | undefined => {
  let refreshToken: string | null = null

  try {
    refreshToken = localStorage.getItem('refreshToken')

    if (!refreshToken) {
      const persisted = localStorage.getItem('vitals-auth')
      if (persisted) {
        const parsed = JSON.parse(persisted) as {
          state?: { refreshToken?: unknown }
        }
        if (typeof parsed.state?.refreshToken === 'string') {
          refreshToken = parsed.state.refreshToken
        }
      }
    }
  } catch {
    refreshToken = null
  } finally {
    try {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('vitals-auth')
    } catch {
      // Storage may be unavailable in privacy-restricted browser contexts.
    }
  }

  return refreshToken && refreshToken !== 'undefined' ? refreshToken : undefined
}


import { useState } from 'react'
import { api, ApiError } from '@/lib/api'

/**
 * Continue with Google.
 *
 * Asks the API for the authorization URL and navigates to it. The URL is not
 * built here, and could not be: it carries a state token the server signs, and
 * the server sets the matching HttpOnly nonce cookie in the same response. A
 * client-constructed URL would have neither, and the callback would refuse it.
 *
 * Nothing Google returns is handled in this component. The browser comes back
 * to /auth/google, which is a route of its own — see GoogleCallbackPage.
 */
export function GoogleButton({
  label = 'Continue with Google',
  onError,
}: {
  label?: string
  onError: (message: string) => void
}) {
  const [starting, setStarting] = useState(false)

  const start = async () => {
    setStarting(true)
    onError('')

    try {
      const { url } = await api.get<{ url: string }>('/api/v1/auth/google')
      window.location.assign(url)
    } catch (err) {
      onError(
        err instanceof ApiError
          ? err.message
          : 'Could not start Google sign-in. Please try again.',
      )
      setStarting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={starting}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--outline-variant)',
        background: 'var(--surface)',
        color: 'var(--on-surface)',
        fontFamily: 'var(--font-headline)',
        fontWeight: 600,
        fontSize: '0.9375rem',
        cursor: starting ? 'wait' : 'pointer',
        opacity: starting ? 0.7 : 1,
      }}
    >
      <GoogleMark />
      {starting ? 'Redirecting…' : label}
    </button>
  )
}

/** Google's four-colour mark, inline so it needs no network request. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}

/** "or" rule, shared by the two auth screens so they stay identical. */
export function AuthDivider() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
        margin: '1.25rem 0',
      }}
    >
      <span style={{ flex: 1, height: 1, background: 'var(--outline-variant)' }} />
      <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>or</span>
      <span style={{ flex: 1, height: 1, background: 'var(--outline-variant)' }} />
    </div>
  )
}

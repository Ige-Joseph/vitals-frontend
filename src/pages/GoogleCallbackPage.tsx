import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { StatusBanner } from '@/components/ui'

/**
 * Where Google sends the browser back.
 *
 * By the time this renders the session already exists: the API set the
 * HttpOnly refresh cookie on the redirect. No token is in the URL and none
 * should ever be — a query string ends up in history, in the Referer header,
 * and in any proxy log along the way.
 *
 * So this page's whole job is to turn that cookie into a live session using
 * the mechanism the app already has. `hydrateUser` is the same call that
 * restores a session on a normal page load; there is no second token path
 * here, and nothing is written to localStorage.
 */

const MESSAGES: Record<string, string> = {
  cancelled: 'Sign-in was cancelled. You can try again whenever you are ready.',
  missing_parameters: 'That sign-in link was incomplete. Please try again.',
  sign_in_failed: 'We could not complete that sign-in. Please try again.',
}

export function GoogleCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { hydrateUser } = useAuthStore()
  const [error, setError] = useState('')
  const handled = useRef(false)

  const status = params.get('status')

  useEffect(() => {
    // StrictMode double-invokes effects in development. Hydrating twice would
    // fire two refresh calls and rotate the token underneath the first.
    if (handled.current) return
    handled.current = true

    if (status === 'email_exists') {
      const email = params.get('email') ?? ''
      navigate(
        `/login?notice=email_exists${email ? `&email=${encodeURIComponent(email)}` : ''}`,
        { replace: true },
      )
      return
    }

    if (status !== 'ok') {
      setError(MESSAGES[params.get('reason') ?? ''] ?? MESSAGES[status ?? ''] ?? MESSAGES.sign_in_failed)
      return
    }

    let cancelled = false

    void (async () => {
      await hydrateUser()
      if (cancelled) return

      // Read the store directly rather than through the hook: this runs inside
      // the effect that just changed it, so the closed-over value is stale.
      if (!useAuthStore.getState().isAuthenticated) {
        setError('Your sign-in did not complete. Please try again.')
        return
      }

      navigate(params.get('profile') === 'incomplete' ? '/complete-profile' : '/dashboard', {
        replace: true,
      })
    })()

    return () => {
      cancelled = true
    }
  }, [status, params, hydrateUser, navigate])

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        background: 'var(--surface)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        {error ? (
          <>
            <StatusBanner type="error" message={error} />
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              style={{
                marginTop: '1.5rem',
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: '0.9375rem',
                cursor: 'pointer',
              }}
            >
              Back to sign in
            </button>
          </>
        ) : (
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>
            Signing you in…
          </p>
        )}
      </div>
    </div>
  )
}

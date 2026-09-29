import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { api, ApiError } from '@/lib/api'
import { Button, Input, StatusBanner } from '@/components/ui'

/**
 * Finish an account that a provider could not finish for us.
 *
 * Only reachable when Google returned an identity without a usable name.
 * Everything Google *did* supply — the verified email above all — is shown
 * rather than asked for again: making somebody retype an address the provider
 * just proved is the thing this flow exists to avoid.
 *
 * The fields here are the ones password signup already requires and no others.
 * Vitals does not collect a date of birth at signup today, so this screen does
 * not ask for one either; a federated user must not face a longer form than a
 * password user, and a shorter one would be a gap.
 *
 * Saving goes through the existing PATCH /users/profile. No endpoint was added
 * for onboarding: it is an ordinary profile edit that happens to be the first.
 */
export function CompleteProfilePage() {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Somebody who already has a name has nothing to complete. Arriving here by
  // typing the URL should not present a form with no purpose.
  if (user?.firstName && user?.lastName) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please add both your first and last name to continue.')
      return
    }

    setSaving(true)

    try {
      await api.patch('/api/v1/users/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })

      if (user) {
        setUser({ ...user, firstName: firstName.trim(), lastName: lastName.trim() })
      }

      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not save that. Please try again.',
      )
      setSaving(false)
    }
  }

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
      <div style={{ width: '100%', maxWidth: 400 }} className="animate-fade-up">
        <h1
          style={{
            fontFamily: 'var(--font-headline)',
            fontWeight: 800,
            fontSize: '1.75rem',
            color: 'var(--on-surface)',
            marginBottom: '0.375rem',
          }}
        >
          One last thing
        </h1>
        <p
          style={{
            color: 'var(--on-surface-variant)',
            fontSize: '0.9375rem',
            marginBottom: '1.5rem',
          }}
        >
          Google did not share your name with us. Tell us what to call you and you are in.
        </p>

        {user?.email && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.75rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-variant)',
              marginBottom: '1.5rem',
            }}
          >
            <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--primary)' }}>
              verified
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                Signed in with Google
              </p>
              <p
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--on-surface)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user.email}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: '1.25rem' }}>
            <StatusBanner type="error" message={error} />
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <Input
            label="First name"
            icon="person"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            required
            autoComplete="given-name"
          />
          <Input
            label="Last name"
            icon="person"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            required
            autoComplete="family-name"
          />

          <Button type="submit" size="lg" loading={saving} style={{ marginTop: '0.5rem', width: '100%' }}>
            Continue to Vitals
          </Button>
        </form>
      </div>
    </div>
  )
}

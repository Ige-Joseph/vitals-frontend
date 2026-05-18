import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Input, StatusBanner } from '@/components/ui'
import { api, ApiError } from '@/lib/api'

const pwRequirements = [
  { test: (p: string) => p.length >= 8, text: 'At least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p), text: 'One uppercase letter' },
  { test: (p: string) => /[0-9]/.test(p), text: 'One number' },
]

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const strength = pwRequirements.filter(r => r.test(password)).length
  const strengthColor = ['var(--error)', 'var(--tertiary)', 'var(--tertiary)', '#16a34a'][strength]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!token) {
      setError('Invalid or missing reset token.')
      return
    }

    if (strength < 3) {
      setError('Please meet all password requirements.')
      return
    }

    setIsLoading(true)

    try {
      await api.post<null>('/api/v1/auth/reset-password', {
        token,
        password,
      })

      setSuccess('Password reset successful. Redirecting to login...')
      setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 400 }} className="animate-fade-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2rem', justifyContent: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, overflow: 'hidden' }}>
            <img src="/icons/icon-192x192.png" alt="Vitals logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)' }}>Vitals</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--on-surface)', marginBottom: '0.375rem' }}>
          Reset password
        </h1>

        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', marginBottom: '2rem' }}>
          Create a new password for your account.
        </p>

        {!token && (
          <div style={{ marginBottom: '1.25rem' }}>
            <StatusBanner type="error" message="Invalid or missing reset token. Please request a new password reset link." />
          </div>
        )}

        {success && <div style={{ marginBottom: '1.25rem' }}><StatusBanner type="success" message={success} /></div>}
        {error && <div style={{ marginBottom: '1.25rem' }}><StatusBanner type="error" message={error} /></div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="New password"
            type={showPw ? 'text' : 'password'}
            placeholder="Create a strong password"
            icon="lock"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={!token}
            rightElement={
              <button type="button" onClick={() => setShowPw(p => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)', display: 'flex' }}>
                <span className="material-symbols-outlined icon-sm">{showPw ? 'visibility_off' : 'visibility'}</span>
              </button>
            }
          />

          {password.length > 0 && (
            <div>
              <div style={{ height: 3, borderRadius: 99, background: 'var(--surface-container-high)', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div style={{ height: '100%', width: `${(strength / 3) * 100}%`, background: strengthColor, borderRadius: 99, transition: 'width 0.3s, background 0.3s' }} />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {pwRequirements.map(r => (
                  <span key={r.text} style={{ fontSize: '0.75rem', color: r.test(password) ? '#16a34a' : 'var(--outline)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <span className="material-symbols-outlined icon-filled" style={{ fontSize: 12 }}>
                      {r.test(password) ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    {r.text}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button type="submit" size="lg" loading={isLoading} disabled={!token} style={{ width: '100%' }}>
            Reset password
          </Button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>
          Remember your password?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
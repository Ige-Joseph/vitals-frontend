import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input, StatusBanner } from '@/components/ui'
import { api, ApiError } from '@/lib/api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)

try {
  await api.post<null>('/api/v1/auth/forgot-password', {
    email: email.trim(),
  })

    setMessage('If an account with that email exists, a password reset link has been sent.')
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
          Forgot password?
        </h1>

        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', marginBottom: '2rem' }}>
          Enter your email and we’ll send you a password reset link.
        </p>

        {message && <div style={{ marginBottom: '1.25rem' }}><StatusBanner type="success" message={message} /></div>}
        {error && <div style={{ marginBottom: '1.25rem' }}><StatusBanner type="error" message={error} /></div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            icon="mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Button type="submit" size="lg" loading={isLoading} style={{ width: '100%' }}>
            Send reset link
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
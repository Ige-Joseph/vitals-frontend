import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, StatusBanner } from '@/components/ui'
import { api, ApiError } from '@/lib/api'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid or missing verification token.')
      return
    }

    api
      .get<null>(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => {
        setStatus('success')
        setMessage('Email verified successfully.')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err instanceof ApiError ? err.message : 'Could not verify email.')
      })
  }, [token])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 400 }} className="animate-fade-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2rem', justifyContent: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, overflow: 'hidden' }}>
            <img src="/icons/icon-192x192.png" alt="Vitals logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)' }}>Vitals</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--on-surface)', marginBottom: '0.75rem', textAlign: 'center' }}>
          Verify email
        </h1>

        <StatusBanner
          type={status === 'success' ? 'success' : status === 'error' ? 'error' : 'info'}
          message={message}
        />

        <div style={{ marginTop: '1.5rem' }}>
          <Link to="/login" style={{ textDecoration: 'none' }}>
            <Button size="lg" style={{ width: '100%' }}>
              Go to sign in
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { Button, Input, StatusBanner } from '@/components/ui'
import { ApiError } from '@/lib/api'

export function LoginPage() {
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--surface)',
      display: 'flex', alignItems: 'stretch',
    }}>
      {/* Left panel — decorative (desktop only) */}
      <div className="auth-hero" style={{
        flex: '0 0 48%', background: 'var(--gradient-primary)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '3rem',
      }}>
        {/* Abstract blobs */}
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', top: '30%', left: '-8%', width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

        {/* Logo */}
        <div style={{ position: 'absolute', top: '2.5rem', left: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined icon-filled" style={{ color: 'white', fontSize: 22 }}>health_and_safety</span>
          </div>
          <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.25rem', color: 'white' }}>Vitals</span>
        </div>

        {/* Hero text */}
        <div style={{ position: 'relative', zIndex: 1, color: 'white' }}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {['💊 Medications', '🤰 Pregnancy', '😊 Mood'].map(t => (
              <span key={t} style={{ padding: '0.375rem 0.875rem', background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', fontWeight: 600, backdropFilter: 'blur(8px)' }}>{t}</span>
            ))}
          </div>
          <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: 'clamp(1.875rem, 3vw, 2.5rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: '1rem' }}>
            Your complete<br />health companion
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', lineHeight: 1.65, maxWidth: 380 }}>
            Medication reminders, pregnancy milestones, mood tracking, and AI-powered health insights — all in one place.
          </p>
        </div>

        {/* Feature chips at bottom */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          {[
            { icon: 'notifications_active', text: 'Smart reminders' },
            { icon: 'psychology', text: 'AI insights' },
            { icon: 'lock', text: 'Private & secure' },
          ].map(f => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', background: 'rgba(255,255,255,0.12)', borderRadius: 'var(--radius-full)', backdropFilter: 'blur(8px)' }}>
              <span className="material-symbols-outlined icon-sm" style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>{f.icon}</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem 1.5rem', background: 'var(--surface)',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }} className="animate-fade-up">
          {/* Mobile logo */}
          <div className="auth-mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2rem', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined icon-filled" style={{ color: 'white', fontSize: 20 }}>health_and_safety</span>
            </div>
            <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)' }}>Vitals</span>
          </div>

          <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--on-surface)', marginBottom: '0.375rem' }}>Welcome back</h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', marginBottom: '2rem' }}>
            Sign in to continue your health journey.
          </p>

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
            <Input
              label="Password"
              type={showPw ? 'text' : 'password'}
              placeholder="Your password"
              icon="lock"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              rightElement={
                <button type="button" onClick={() => setShowPw(p => !p)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)', display: 'flex' }}>
                  <span className="material-symbols-outlined icon-sm">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              }
            />

            <div style={{ textAlign: 'right', marginTop: '-0.25rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>Forgot password?</span>
            </div>

            <Button type="submit" size="lg" loading={isLoading} style={{ marginTop: '0.5rem', width: '100%' }}>
              Sign in
            </Button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Create one</Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-hero { display: none !important; }
          .auth-mobile-logo { display: flex !important; }
        }
        @media (min-width: 769px) {
          .auth-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  )
}

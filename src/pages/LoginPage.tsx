import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { Button, Input, PasswordVisibilityIcon, StatusBanner } from '@/components/ui'
import { ApiError } from '@/lib/api'
import { AuthDivider, GoogleButton } from '@/components/auth/GoogleButton'

const LOGIN_PHOTOS = [
  { src: '/images/contextual/family-home.webp', srcSet: '/images/contextual/family-home-480.webp 320w, /images/contextual/family-home.webp 683w', sizes: '(max-width: 800px) 100vw, 48vw', position: 'center 44%' },
  { src: '/images/contextual/pregnancy-context.webp', srcSet: '/images/contextual/pregnancy-context-480.webp 320w, /images/contextual/pregnancy-context.webp 683w', sizes: '(max-width: 800px) 100vw, 48vw', position: 'center 40%' },
  { src: '/images/contextual/baby-newborn.webp', srcSet: '/images/contextual/baby-newborn-480.webp 480w, /images/contextual/baby-newborn.webp 1024w', sizes: '(max-width: 800px) 100vw, 48vw', position: 'center 46%' },
  { src: '/images/contextual/dashboard-digital-health.webp', srcSet: '/images/contextual/dashboard-digital-health-480.webp 480w, /images/contextual/dashboard-digital-health.webp 1024w', sizes: '(max-width: 800px) 100vw, 48vw', position: 'center 52%' },
]

export function LoginPage() {
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [activePhoto, setActivePhoto] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || activePhoto >= LOGIN_PHOTOS.length - 1) return
    const timer = window.setTimeout(() => {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setActivePhoto(index => index + 1)
      }
    }, 10_000)
    return () => window.clearTimeout(timer)
  }, [activePhoto])
  const notice = params.get('notice') === 'email_exists'
    ? 'You already have a Vitals account with this email address. Sign in with your password to continue.'
    : ''

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
    <div className="auth-page" style={{
      minHeight: '100dvh', background: 'var(--surface)',
      display: 'flex', alignItems: 'stretch',
    }}>
      {/* Left panel — decorative (desktop only) */}
      <div className="auth-hero" style={{
        flex: '0 0 48%', background: 'var(--gradient-primary)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '3rem',
      }}>
        <div className="auth-hero__photos" aria-hidden="true">
          {LOGIN_PHOTOS.map((photo, index) => (
            <img
              key={photo.src}
              src={photo.src}
              srcSet={photo.srcSet}
              sizes={photo.sizes}
              width={index < 2 ? 683 : 1024}
              height={index < 2 ? 1024 : 683}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className={`auth-hero__photo${activePhoto === index ? ' is-active' : ''}`}
              style={{ objectPosition: photo.position }}
              alt=""
            />
          ))}
        </div>
        <div className="auth-hero__photo-wash" aria-hidden="true" />
        {/* Abstract blobs */}
        <div className="auth-hero__decoration" style={{ position: 'absolute', top: '-10%', right: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div className="auth-hero__decoration" style={{ position: 'absolute', top: '30%', left: '-8%', width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div className="auth-hero__decoration" style={{ position: 'absolute', bottom: '20%', right: '10%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

        {/* Logo */}
        <div className="auth-hero__logo" style={{ position: 'absolute', top: '2.5rem', left: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <img
              src="/icons/icon-192x192.png"
              alt="Vitals logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </div>
          <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.25rem', color: 'white' }}>Vitals</span>
        </div>

        {/* Hero text */}
        <div className="auth-hero__copy" style={{ position: 'relative', zIndex: 1, color: 'white' }}>
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
        <div className="auth-hero__features" style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
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
      <div className="auth-form-panel" style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem 1.5rem', background: 'var(--surface)',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }} className="animate-fade-up">
          {/* Mobile logo */}
          <div className="auth-mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2rem', justifyContent: 'center' }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              overflow: 'hidden'
            }}>
              <img
                src="/icons/icon-192x192.png"
                alt="Vitals logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
            <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)' }}>Vitals</span>
          </div>

          <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--on-surface)', marginBottom: '0.375rem' }}>Welcome back</h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', marginBottom: '2rem' }}>
            Sign in to continue your health journey.
          </p>

          {notice && !error && <div style={{ marginBottom: '1.25rem' }}><StatusBanner type="info" message={notice} /></div>}
          {error && <div style={{ marginBottom: '1.25rem' }}><StatusBanner type="error" message={error} /></div>}

          <GoogleButton onError={setError} />
          <AuthDivider />

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
                <button type="button" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw(p => !p)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)', display: 'flex' }}>
                  <PasswordVisibilityIcon visible={showPw} />
                </button>
              }
            />

            <div style={{ textAlign: 'right', marginTop: '-0.25rem' }}>
              <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>Forgot password?</Link>
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
        @media (max-width: 800px) {
          .auth-hero { display: block !important; flex: 0 0 8.5rem !important; height: 8.5rem; padding: 0 !important; }
          .auth-hero__logo, .auth-hero__copy, .auth-hero__features, .auth-hero__decoration { display: none !important; }
          .auth-mobile-logo { display: flex !important; }
        }
        @media (min-width: 801px) {
          .auth-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  )
}

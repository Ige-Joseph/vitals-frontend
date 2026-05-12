import React, { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import { Card, Button, Badge, StatusBanner } from '@/components/ui'
import { usePushNotifications } from '@/hooks/usePushNotifications'

interface Profile { sex?: string; gender?: string; timezone?: string; selectedJourney?: string }
interface Usage { symptomChecks: { used: number; limit: number }; drugDetections: { used: number; limit: number } }

export function ProfilePage() {
  const { user, logout } = useAuthStore()
  const { pushState, requestPermissionAndRegister } = usePushNotifications()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)

  useEffect(() => {
    api.get<{ profile: Profile }>('/api/v1/users/profile').then(r => setProfile(r.profile)).catch(() => {})
    api.get<Usage>('/api/v1/usage').then(setUsage).catch(() => {})
  }, [])

  const PUSH_UI = {
    idle:        { icon: 'notifications', label: 'Enable reminders', color: 'var(--primary)',   bg: 'var(--primary-fixed)', action: true },
    requesting:  { icon: 'hourglass_top', label: 'Requesting…',      color: 'var(--outline)',   bg: 'var(--surface-container)', action: false },
    enabled:     { icon: 'notifications_active', label: 'Reminders on', color: '#16a34a', bg: '#dcfce7', action: false },
    denied:      { icon: 'notifications_off', label: 'Blocked by browser', color: 'var(--error)', bg: 'var(--error-container)', action: false },
    unsupported: { icon: 'notifications_off', label: 'Not supported', color: 'var(--outline)', bg: 'var(--surface-container)', action: false },
    failed:      { icon: 'error', label: 'Failed — tap to retry', color: 'var(--error)', bg: 'var(--error-container)', action: true },
  }
  const pushUI = PUSH_UI[pushState] ?? PUSH_UI.idle

  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div className="animate-fade-up">
        <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--on-surface)' }}>Profile</h1>
      </div>

      {/* User card */}
      <Card style={{ padding: '1.5rem' }} className="animate-fade-up delay-100">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.375rem'
          }}>
            {user?.firstName?.[0]?.toUpperCase() ??
            user?.email?.[0]?.toUpperCase() ??
            'V'}
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1rem', color: 'var(--on-surface)' }}>
              {user?.firstName ??
              user?.email?.split('@')[0] ??
              'User'}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <Badge variant={user?.emailVerified ? 'success' : 'warning'}>
                {user?.emailVerified ? 'Verified' : 'Unverified'}
              </Badge>
              <Badge variant={user?.planType === 'PREMIUM' ? 'primary' : 'neutral'}>
                {user?.planType?.toLowerCase() ?? 'free'}
              </Badge>
            </div>
          </div>
        </div>

        {!user?.emailVerified && (
          <div style={{ padding: '0.75rem', background: 'var(--tertiary-fixed)', borderRadius: 'var(--radius-lg)', display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
            <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--tertiary)' }}>mail</span>
            <p style={{ fontSize: '0.8125rem', color: 'var(--tertiary)', fontWeight: 500 }}>Please verify your email to unlock all features.</p>
          </div>
        )}
      </Card>

      {/* Push notifications */}
      <Card style={{ padding: '1.25rem' }} className="animate-fade-up delay-200">
        <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>Notifications</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem', background: pushUI.bg, borderRadius: 'var(--radius-xl)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined icon-sm icon-filled" style={{ color: pushUI.color }}>{pushUI.icon}</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9rem', color: pushUI.color }}>{pushUI.label}</p>
            <p style={{ fontSize: '0.8125rem', color: pushUI.color, opacity: 0.8, marginTop: '0.125rem' }}>
              {pushState === 'enabled' ? 'Medication and care reminders will be delivered as push notifications.' :
               pushState === 'denied'  ? 'Allow notifications in your browser settings to enable reminders.' :
               'Enable to receive timely medication and care reminders.'}
            </p>
          </div>
          {pushUI.action && (
            <Button variant="secondary" size="sm" onClick={requestPermissionAndRegister}>Enable</Button>
          )}
        </div>

        {pushState === 'denied' && (
          <div style={{ marginTop: '0.75rem' }}>
            <StatusBanner type="info" message="To re-enable: click the lock icon in your browser address bar → Notifications → Allow." />
          </div>
        )}
      </Card>

      {/* Usage */}
      {usage && (
        <Card style={{ padding: '1.25rem' }} className="animate-fade-up delay-300">
          <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>Daily AI usage</p>
          {[
            { label: 'Symptom checks', ...usage.symptomChecks },
            { label: 'Drug detections', ...usage.drugDetections },
          ].map(({ label, used, limit }) => (
            <div key={label} style={{ marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--on-surface)' }}>{label}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: used >= limit ? 'var(--error)' : 'var(--on-surface)' }}>{used} / {limit}</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: 'var(--surface-container-high)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (used / limit) * 100)}%`, background: used >= limit ? 'var(--error)' : 'var(--gradient-primary)', borderRadius: 99, transition: 'width 0.4s' }} />
              </div>
            </div>
          ))}
          <p style={{ fontSize: '0.8125rem', color: 'var(--outline)', marginTop: '0.25rem' }}>Quotas reset daily at midnight.</p>
        </Card>
      )}

      {/* Profile details */}
      {profile && (
        <Card style={{ padding: '1.25rem' }} className="animate-fade-up delay-400">
          <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>Health profile</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {[
              { label: 'Timezone', value: profile.timezone ?? '—' },
              { label: 'Journey', value: profile.selectedJourney ?? '—' },
              { label: 'Sex', value: profile.sex ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid var(--outline-variant)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{label}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)', textTransform: 'capitalize' }}>{value.toLowerCase()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sign out */}
      <div className="animate-fade-up delay-500">
        <Button variant="danger" onClick={logout} style={{ width: '100%' }} icon="logout">Sign out</Button>
      </div>
    </div>
  )
}

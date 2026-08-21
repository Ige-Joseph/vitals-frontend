import { Badge, Button, Card, StatusBanner } from '@/components/ui'
import type { PushState } from '@/hooks/usePushNotifications'
import type { User } from '@/store/auth.store'
import { CollapsibleCard, SectionHeader } from './ProfileControls'
import type { CalendarSyncSummary, Usage } from './profile.types'
import { remainingProfileFields } from './profile.utils'

const PUSH_PRESENTATION: Record<PushState, {
  icon: string
  label: string
  color: string
  background: string
  canEnable: boolean
}> = {
  idle: { icon: 'notifications', label: 'Enable reminders', color: 'var(--primary)', background: 'var(--primary-fixed)', canEnable: true },
  requesting: { icon: 'hourglass_top', label: 'Requesting…', color: 'var(--outline)', background: 'var(--surface-container)', canEnable: false },
  enabled: { icon: 'notifications_active', label: 'Reminders on', color: '#16a34a', background: '#dcfce7', canEnable: false },
  denied: { icon: 'notifications_off', label: 'Blocked by browser', color: 'var(--error)', background: 'var(--error-container)', canEnable: false },
  unsupported: { icon: 'notifications_off', label: 'Not supported', color: 'var(--outline)', background: 'var(--surface-container)', canEnable: false },
  failed: { icon: 'error', label: 'Failed — tap to retry', color: 'var(--error)', background: 'var(--error-container)', canEnable: true },
}

export function UserSummaryCard({
  user,
  sendingVerification,
  verificationCooldown,
  onResendVerification,
}: {
  user: User | null
  sendingVerification: boolean
  verificationCooldown: boolean
  onResendVerification: () => void
}) {
  return (
    <Card style={{ padding: '1.5rem' }} className="animate-fade-up delay-100">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.375rem' }}>
          {user?.firstName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'V'}
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1rem', color: 'var(--on-surface)' }}>
            {user?.firstName ?? user?.email?.split('@')[0] ?? 'User'}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>{user?.email}</p>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            <Badge variant={user?.emailVerified ? 'success' : 'warning'}>{user?.emailVerified ? 'Verified' : 'Unverified'}</Badge>
            <Badge variant={user?.planType === 'PREMIUM' ? 'primary' : 'neutral'}>{user?.planType?.toLowerCase() ?? 'free'}</Badge>
          </div>
        </div>
      </div>

      {!user?.emailVerified ? (
        <div style={{ padding: '0.875rem', background: 'var(--tertiary-fixed)', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
            <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--tertiary)' }}>mail</span>
            <p style={{ fontSize: '0.8125rem', color: 'var(--tertiary)', fontWeight: 500, lineHeight: 1.5 }}>
              Please verify your email to unlock all features.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onResendVerification}
            disabled={sendingVerification || verificationCooldown}
            style={{ alignSelf: 'flex-start' }}
            icon={sendingVerification ? 'hourglass_top' : 'send'}
          >
            {sendingVerification ? 'Sending…' : verificationCooldown ? 'Email sent' : 'Send verification email'}
          </Button>
        </div>
      ) : null}
    </Card>
  )
}

export function CompletionCard({ completion }: { completion: number }) {
  const color = completion === 100
    ? '#16a34a'
    : completion >= 60
      ? 'var(--primary)'
      : 'var(--tertiary)'
  const remaining = remainingProfileFields(completion)

  return (
    <Card style={{ padding: '1.25rem' }} className="animate-fade-up delay-150">
      <SectionHeader label="Profile completion" />
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 86, height: 86, flexShrink: 0 }}>
          <svg width="86" height="86" viewBox="0 0 86 86" role="img" aria-label={`Profile ${completion}% complete`}>
            <circle cx="43" cy="43" r="34" fill="none" stroke="var(--surface-container-high)" strokeWidth="10" />
            <circle
              cx="43"
              cy="43"
              r="34"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - completion / 100)}`}
              transform="rotate(-90 43 43)"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.1rem', color }}>
            {completion}%
          </div>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6, flex: 1 }}>
          {completion === 100
            ? 'Your health profile is complete.'
            : `${remaining} field${remaining === 1 ? '' : 's'} remaining — a complete profile helps Vitals give better insights.`}
        </p>
      </div>
    </Card>
  )
}

export function NotificationSettings({
  open,
  pushState,
  onToggle,
  onEnable,
}: {
  open: boolean
  pushState: PushState
  onToggle: () => void
  onEnable: () => void
}) {
  const presentation = PUSH_PRESENTATION[pushState]
  const description = pushState === 'enabled'
    ? 'Medication and care reminders will be delivered as push notifications.'
    : pushState === 'denied'
      ? 'Allow notifications in your browser settings to enable reminders.'
      : 'Enable to receive timely medication and care reminders.'

  return (
    <CollapsibleCard title="Notifications" open={open} onToggle={onToggle} className="animate-fade-up delay-200">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem', background: presentation.background, borderRadius: 'var(--radius-xl)' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-symbols-outlined icon-sm icon-filled" style={{ color: presentation.color }}>{presentation.icon}</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9rem', color: presentation.color }}>{presentation.label}</p>
          <p style={{ fontSize: '0.8125rem', color: presentation.color, opacity: 0.8, marginTop: '0.125rem' }}>{description}</p>
        </div>
        {presentation.canEnable ? <Button variant="secondary" size="sm" onClick={onEnable}>Enable</Button> : null}
      </div>
      {pushState === 'denied' ? (
        <div style={{ marginTop: '0.75rem' }}>
          <StatusBanner type="info" message="To re-enable: click the lock icon in your browser address bar → Notifications → Allow." />
        </div>
      ) : null}
    </CollapsibleCard>
  )
}

export function CalendarSettings({
  open,
  summary,
  connecting,
  retrying,
  onToggle,
  onConnect,
  onRetry,
}: {
  open: boolean
  summary: CalendarSyncSummary | null
  connecting: boolean
  retrying: boolean
  onToggle: () => void
  onConnect: () => void
  onRetry: () => void
}) {
  const connected = summary?.connected ?? false
  const failedSyncs = summary?.failedSyncs ?? 0
  const accent = connected ? '#166534' : 'var(--primary)'

  return (
    <CollapsibleCard title="Google Calendar" open={open} onToggle={onToggle} className="animate-fade-up delay-250">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: connected ? '#dcfce7' : 'var(--primary-fixed)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined icon-sm icon-filled" style={{ color: connected ? '#16a34a' : 'var(--primary)' }}>
                {connected ? 'check_circle' : 'event'}
              </span>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9rem', color: accent }}>
                {connected ? 'Google Calendar connected' : 'Sync care reminders'}
              </p>
              <p style={{ fontSize: '0.8125rem', color: accent, opacity: 0.85, marginTop: '0.25rem', lineHeight: 1.5 }}>
                {connected
                  ? 'Your care reminders can now sync with Google Calendar.'
                  : 'Connect Google Calendar so medication and pregnancy reminders can sync automatically.'}
              </p>
              {summary?.accountEmail ? <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: accent, opacity: 0.85, wordBreak: 'break-word' }}>Connected as {summary.accountEmail}</p> : null}
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={onConnect} disabled={connecting} icon={connecting ? 'hourglass_top' : connected ? 'sync' : 'link'} style={{ width: '100%', justifyContent: 'center' }}>
            {connecting ? 'Connecting…' : connected ? 'Reconnect' : 'Connect'}
          </Button>
        </div>

        {failedSyncs > 0 ? (
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-xl)', background: 'var(--error-container)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--error)' }}>Some calendar events failed to sync</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--error)', marginTop: '0.25rem' }}>Failed syncs: {failedSyncs}</p>
            </div>
            <Button size="sm" variant="secondary" disabled={retrying} onClick={onRetry}>
              {retrying ? 'Retrying…' : 'Retry failed syncs'}
            </Button>
          </div>
        ) : null}
      </div>
    </CollapsibleCard>
  )
}

export function UsageSettings({
  usage,
  open,
  onToggle,
}: {
  usage: Usage | null
  open: boolean
  onToggle: () => void
}) {
  if (!usage) return null

  const entries = [
    { label: 'Symptom checks', ...usage.symptomChecks },
    { label: 'Drug detections', ...usage.drugDetections },
  ]

  return (
    <CollapsibleCard title="Daily AI usage" open={open} onToggle={onToggle} className="animate-fade-up delay-300">
      {entries.map(({ label, used, limit }) => {
        const percent = limit > 0 ? Math.min(100, used / limit * 100) : 0
        return (
          <div key={label} style={{ marginBottom: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--on-surface)' }}>{label}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: used >= limit ? 'var(--error)' : 'var(--on-surface)' }}>{used} / {limit}</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'var(--surface-container-high)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${percent}%`, background: used >= limit ? 'var(--error)' : 'var(--gradient-primary)', borderRadius: 99, transition: 'width 0.4s' }} />
            </div>
          </div>
        )
      })}
      <p style={{ fontSize: '0.8125rem', color: 'var(--outline)', marginTop: '0.25rem' }}>Quotas reset daily at midnight.</p>
    </CollapsibleCard>
  )
}


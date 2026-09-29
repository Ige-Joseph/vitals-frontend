import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card } from '@/components/ui'

export function PremiumBadge() {
  return (
    <Badge variant="warning">
      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 14 }}>
        lock
      </span>
      Premium
    </Badge>
  )
}

export function UpgradePrompt({
  title,
  description,
  actionLabel = 'Explore Premium',
  showBadge = true,
}: {
  title: string
  description: string
  actionLabel?: string
  showBadge?: boolean
}) {
  return (
    <Card
      style={{
        padding: '1rem',
        border: '1px solid var(--outline-variant)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '0.625rem',
      }}
    >
      {showBadge ? <PremiumBadge /> : null}
      <div>
        <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, color: 'var(--on-surface)' }}>
          {title}
        </p>
        <p style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)', lineHeight: 1.5, marginTop: '0.25rem' }}>
          {description}
        </p>
      </div>
      <Link to="/billing" style={{ textDecoration: 'none' }}>
        <Button variant="primary" size="sm">{actionLabel}</Button>
      </Link>
    </Card>
  )
}

export function DailyQuotaStatus({
  label,
  used,
  limit,
  tier,
  loading,
  reachedOverride = false,
  limitMessage,
}: {
  label: string
  used?: number
  limit?: number
  tier: 'FREE' | 'PREMIUM' | null
  loading: boolean
  reachedOverride?: boolean
  limitMessage?: string
}) {
  const hasUsage = used !== undefined && limit !== undefined
  if (loading && !reachedOverride) return null
  if (!hasUsage && !reachedOverride) return null

  const reached = reachedOverride || (used !== undefined && limit !== undefined && used >= limit)

  return (
    <div
      aria-live="polite"
      style={{
        padding: '0.75rem 0.875rem',
        borderRadius: 'var(--radius-lg)',
        background: reached ? 'var(--tertiary-fixed)' : 'var(--surface-container-low)',
      }}
    >
      {hasUsage ? (
        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--on-surface)' }}>
          {label}: {used} of {limit} used today
        </p>
      ) : null}
      {reached ? (
        <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: '0.2rem' }}>
          {limitMessage ?? (tier === 'PREMIUM'
            ? 'You have used today’s allowance. It resets at midnight.'
            : 'You have reached today’s limit. It resets at midnight.')}
        </p>
      ) : null}
      {reached && tier === 'FREE' ? (
        <Link to="/billing" style={{ display: 'inline-block', marginTop: '0.4rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem' }}>
          Upgrade for a higher daily limit
        </Link>
      ) : null}
    </div>
  )
}

export function LockedFeature({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <h3 style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, color: 'var(--on-surface)' }}>{title}</h3>
        <PremiumBadge />
      </div>
      {children ? <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', lineHeight: 1.55 }}>{children}</p> : null}
      <UpgradePrompt title="Included with Premium" description={description} showBadge={false} />
    </div>
  )
}

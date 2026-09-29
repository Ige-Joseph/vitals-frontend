import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { Badge, Button, Input, Skeleton, StatusBanner } from '@/components/ui'

interface Entitlement {
  effective: { tier: 'FREE' | 'PREMIUM'; source: 'subscription' | 'grant' | 'default' }
  subscription: { status: string; currentPeriodEnd: string | null } | null
  activeGrant: { expiresAt: string | null; grantedAt: string; reason: string } | null
  history: Array<{
    id: string; status: string; reason: string; grantedAt: string; expiresAt: string | null
    revokedAt: string | null; revokedReason: string | null
    grantedBy: { email: string } | null; revokedBy: { email: string } | null
  }>
  planTypeProjection: string
}

const date = (value: string | null) => value ? new Date(value).toLocaleDateString() : 'No expiry'
const sourceLabel = { subscription: 'Paid subscription', grant: 'Admin grant', default: 'Free' }

export function EntitlementSheet({
  userId, email, onClose, onChanged,
}: {
  userId: string
  email: string
  onClose: () => void
  onChanged: (tier: string) => void
}) {
  const [data, setData] = useState<Entitlement | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const load = useCallback(async (): Promise<Entitlement | null> => {
    setLoading(true)
    try {
      const entitlement = await api.get<Entitlement>(`/api/v1/billing/users/${userId}/entitlement`)
      setData(entitlement)
      setError('')
      return entitlement
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this account entitlement.')
      return null
    } finally { setLoading(false) }
  }, [userId])

  useEffect(() => { void load() }, [load])

  const apply = async (tier: 'FREE' | 'PREMIUM') => {
    if (!reason.trim()) { setError('A reason is required and will be recorded.'); return }
    setBusy(true)
    setError('')
    try {
      await api.patch(`/api/v1/billing/users/${userId}/plan`, {
        tier,
        basis: reason.trim(),
        ...(tier === 'PREMIUM' && expiresAt ? { expiresAt: new Date(`${expiresAt}T23:59:59`).toISOString() } : {}),
      })
      setReason('')
      setExpiresAt('')
      const updated = await load()
      onChanged(updated?.planTypeProjection ?? updated?.effective.tier ?? tier)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The change could not be applied.')
    } finally { setBusy(false) }
  }

  const hasGrant = Boolean(data?.activeGrant)

  return (
    <div role="presentation" onClick={e => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(24,28,32,0.6)', display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(4px)' }}>
      <section role="dialog" aria-modal="true" aria-labelledby="entitlement-title" onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0', width: '100%', maxWidth: 680, maxHeight: '92dvh', overflowY: 'auto', margin: '0 auto', padding: '1.5rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div><h2 id="entitlement-title" style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, color: 'var(--on-surface)' }}>Entitlement</h2><p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8rem' }}>{email}</p></div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </header>
        {error && <div style={{ marginBottom: '1rem' }}><StatusBanner type="error" message={error} /></div>}
        {loading ? <Skeleton height={140} /> : data ? <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-xl)', background: 'var(--surface-container-low)' }}>
            <Badge variant={data.effective.tier === 'PREMIUM' ? 'primary' : 'neutral'}>{data.effective.tier}</Badge>
            <p>{sourceLabel[data.effective.source]}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
              {data.subscription ? `Subscription ${data.subscription.status.toLowerCase()}${data.subscription.currentPeriodEnd ? `, paid to ${date(data.subscription.currentPeriodEnd)}` : ''}. ` : 'No paid subscription. '}
              {data.activeGrant ? `Admin grant since ${date(data.activeGrant.grantedAt)}, ${date(data.activeGrant.expiresAt)}.` : 'No active grant.'}
            </p>
            {data.subscription && data.activeGrant && <p style={{ fontSize: '0.75rem' }}>Revoking a grant does not affect the paid subscription.</p>}
          </div>
          <Input label="Reason (recorded against your account)" value={reason} onChange={e => setReason(e.target.value)} placeholder={hasGrant ? 'Why it is being revoked' : 'Why it is being granted'} />
          {!hasGrant && <Input label="Expires (optional)" type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />}
          <Button variant={hasGrant ? 'danger' : 'primary'} loading={busy} onClick={() => void apply(hasGrant ? 'FREE' : 'PREMIUM')}>
            {hasGrant ? 'Revoke grant' : 'Grant Premium'}
          </Button>
          <h3>Grant history</h3>
          {data.history.length === 0 ? <p>No grants recorded.</p> : data.history.map(item => <div key={item.id} style={{ padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)' }}>
            <Badge variant={item.status === 'ACTIVE' ? 'success' : 'neutral'}>{item.status}</Badge>
            <p>{date(item.grantedAt)}{item.grantedBy ? ` · ${item.grantedBy.email}` : ''}</p>
            <p>{item.reason}</p>
            {item.expiresAt && <p>Expires {date(item.expiresAt)}</p>}
            {item.revokedAt && <p>Revoked {date(item.revokedAt)}{item.revokedBy ? ` by ${item.revokedBy.email}` : ''}{item.revokedReason ? ` — ${item.revokedReason}` : ''}</p>}
          </div>)}
        </div> : null}
      </section>
    </div>
  )
}

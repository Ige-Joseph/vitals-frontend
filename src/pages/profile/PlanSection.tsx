import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { Button, Skeleton, StatusBanner } from '@/components/ui'
import { CollapsibleCard, InfoRow } from './ProfileControls'
import { formatDate } from './profile.utils'

/**
 * The billing tier — what this account pays for, not a course of care.
 *
 * Copy here is deliberately neutral about *where* a subscription is bought.
 * Google Play's anti-steering rules restrict an app listed there from
 * directing users to an outside purchase, so this section says what Premium
 * includes and offers to continue — it does not advertise the web, name a
 * browser, or explain that buying elsewhere is cheaper. The destination is
 * still the same URL; only the wording changes.
 */

interface TierPrice {
  id: string
  label: string
  amountMinor: number
  currency: string
  interval: 'month' | 'year'
  intervalCount: number
  provisional: boolean
  perMonthMinor: number
  savingPercent: number
  savingMinorPerYear: number
}

interface TierDescription {
  tier: 'FREE' | 'PREMIUM'
  name: string
  summary: string
  includes: string[]
  /** Sellable periods, cheapest first. */
  prices: TierPrice[]
}

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100)

const per = (price: TierPrice) =>
  price.intervalCount === 1 ? price.interval : `${price.intervalCount} ${price.interval}s`

/**
 * Every period on offer, with the saving worked out. Rendered from the list so
 * a new billing period shows up here without this component changing.
 */
function PriceOptions({ prices }: { prices: TierPrice[] }) {
  if (prices.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {prices.map(price => (
        <div
          key={price.id}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--outline-variant)',
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--on-surface)' }}>
              {money(price.amountMinor, price.currency)}
              <span style={{ fontWeight: 500, color: 'var(--on-surface-variant)' }}> / {per(price)}</span>
            </span>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
              {price.label}
              {price.perMonthMinor !== price.amountMinor &&
                ` · ${money(price.perMonthMinor, price.currency)} a month`}
            </span>
          </span>

          {price.savingPercent > 0 && (
            <span style={{
              flexShrink: 0, padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-full)',
              background: 'var(--tertiary-fixed)', color: 'var(--tertiary)',
              fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap',
            }}>
              Save {price.savingPercent}%
            </span>
          )}
        </div>
      ))}

      {prices.some(p => p.provisional) && (
        <p style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)' }}>
          Provisional pricing.
        </p>
      )}
    </div>
  )
}

interface PlanResponse {
  tier: 'FREE' | 'PREMIUM'
  description: TierDescription
  entitlements: { managedPersonLimit: number; connectionLimit: number }
  tiers: TierDescription[]
  checkoutUrl: string
  checkoutAvailable: boolean
  subscription: Subscription | null
  /**
   * A checkout started and not yet finished.
   *
   * Says a checkout was started and when — not that a payment succeeded. The
   * backend cannot tell those apart: someone who paid and someone who closed
   * the tab at the provider leave behind the same row, because what separates
   * them is a webhook that has arrived for neither. The copy below says only
   * that much.
   */
  pendingCheckout: {
    subscriptionId: string
    priceId: string
    startedAt: string
  } | null
}

interface Subscription {
  id: string
  status: string
  /** Null until the provider has told us when the paid period ends. */
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

/** What cancelling answers with. `accessUntil` is what the subscriber keeps. */
interface CancelResult {
  cancelled: boolean
  confirmedByProvider: boolean
  accessUntil: string | null
}

/**
 * Whether this subscription can still be stopped.
 *
 * Already-cancelled is not an error state and not a failure — it is simply
 * nothing left to do, and the backend rejects a second attempt.
 */
/**
 * How this section treats a checkout it has found unfinished.
 *
 * Same three states and the same cadence as the billing page: the wait is the
 * same wait, and two rhythms for it would only read as a bug.
 */
type Settling = 'waiting' | 'confirmed' | 'slow'

const SETTLE_ATTEMPTS = 15
const SETTLE_INTERVAL_MS = 2000

const isStoppable = (subscription: Subscription | null): boolean =>
  Boolean(
    subscription &&
      !subscription.cancelAtPeriodEnd &&
      subscription.status !== 'CANCELED' &&
      subscription.status !== 'EXPIRED',
  )

function IncludeList({ items }: { items: string[] }) {
  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0, padding: 0, listStyle: 'none' }}>
      {items.map(item => (
        <li key={item} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <span
            className="material-symbols-outlined"
            aria-hidden
            style={{ fontSize: 18, color: 'var(--primary)', flexShrink: 0, marginTop: 1 }}
          >
            check
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function PlanSection({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  const [plan, setPlan] = useState<PlanResponse | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [settling, setSettling] = useState<Settling | null>(null)
  /**
   * Latched, not read live: the poll below is keyed on it, and a value that
   * flipped back the moment the checkout resolved would restart the very
   * effect that resolved it.
   */
  const [pendingSeen, setPendingSeen] = useState(false)

  const load = useCallback(async () => {
    try {
      const fresh = await api.get<PlanResponse>('/api/v1/billing/plan')
      setPlan(fresh)
      if (fresh.pendingCheckout) setPendingSeen(true)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your plan')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /**
   * Wait for an unfinished checkout to resolve.
   *
   * Someone can pay and land back here rather than on the billing page, and
   * until now this section had nothing to say to them. Entitlement arrives on
   * a webhook, so the only honest thing to do is look again for a while.
   *
   * There is no equivalent of the billing page's "just got back from paying"
   * state, because the provider always returns a payer to /billing — anyone
   * seeing this arrived under their own steam. A failed poll is not treated as
   * a failed payment.
   */
  useEffect(() => {
    if (!pendingSeen) return

    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout>

    setSettling(current => current ?? 'waiting')

    const tick = async () => {
      if (cancelled) return
      attempts += 1

      try {
        const fresh = await api.get<PlanResponse>('/api/v1/billing/plan')
        if (cancelled) return
        setPlan(fresh)

        if (fresh.tier === 'PREMIUM') {
          setSettling('confirmed')
          return
        }
      } catch {
        // Ignored on purpose. See above.
      }

      if (cancelled) return
      if (attempts >= SETTLE_ATTEMPTS) {
        setSettling('slow')
        return
      }
      timer = setTimeout(tick, SETTLE_INTERVAL_MS)
    }

    timer = setTimeout(tick, 1200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [pendingSeen])

  const upgrade = () => {
    if (!plan) return
    window.open(plan.checkoutUrl, '_blank', 'noopener,noreferrer')
  }

  /**
   * Stop the subscription renewing.
   *
   * The confirmation says what actually happens rather than asking "are you
   * sure": this ends the next charge and nothing else. The period already paid
   * for is kept, and no health record is touched either way — which is the
   * part someone hesitating over this button is most likely to be worried
   * about.
   */
  const cancelSubscription = async () => {
    const subscription = plan?.subscription
    if (!subscription) return

    const until = subscription.currentPeriodEnd
      ? formatDate(subscription.currentPeriodEnd)
      : undefined

    const confirmed = window.confirm(
      `Stop your ${plan.description.name} subscription renewing?\n\n` +
        (until
          ? `You keep ${plan.description.name} until ${until}, and it won't renew after that. `
          : `You keep ${plan.description.name} for the rest of the period you've paid for, and it won't renew after that. `) +
        `Nothing you've recorded is removed, and you can subscribe again later.`,
    )
    if (!confirmed) return

    setCancelling(true)
    setError('')
    setSuccess('')

    try {
      const result = await api.post<CancelResult>(
        `/api/v1/billing/subscriptions/${subscription.id}/cancel`,
      )

      const keptUntil = result.accessUntil ? formatDate(result.accessUntil) : undefined
      setSuccess(
        keptUntil
          ? `Your subscription won't renew. You keep ${plan.description.name} until ${keptUntil}.`
          : `Your subscription won't renew. You keep ${plan.description.name} for the rest of the period you've paid for.`,
      )

      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not cancel your subscription')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <CollapsibleCard title="Plan" open={open} onToggle={onToggle}>
      {error ? <StatusBanner type="error" message={error} /> : null}
      {success ? <StatusBanner type="success" message={success} /> : null}

      {settling === 'confirmed' ? (
        <StatusBanner
          type="success"
          message="Payment received. Premium is active on your account."
        />
      ) : settling === 'waiting' ? (
        <StatusBanner
          type="info"
          message="You have a subscription you started and haven’t finished. Checking whether it went through."
        />
      ) : settling === 'slow' ? (
        <StatusBanner
          type="info"
          message="That subscription hasn’t come through. If you completed payment it will switch on by itself — otherwise you can start again."
        />
      ) : null}

      {!plan ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <Skeleton height={20} width="45%" />
          <Skeleton height={56} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span
              style={{
                padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-full)',
                background: plan.tier === 'PREMIUM' ? 'var(--tertiary-fixed)' : 'var(--primary-fixed)',
                color: plan.tier === 'PREMIUM' ? 'var(--tertiary)' : 'var(--primary)',
                fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.03em',
                textTransform: 'uppercase',
              }}
            >
              {plan.description.name}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
              {plan.description.summary}
            </span>
          </div>

          <IncludeList items={plan.description.includes} />

          <div>
            <InfoRow
              label="People you can manage"
              value={String(plan.entitlements.managedPersonLimit)}
            />
            <InfoRow
              label="People you can connect with"
              value={String(plan.entitlements.connectionLimit)}
            />
            {/* Only once the provider has told us when the period ends —
                a renewal date we do not have is left unsaid rather than
                guessed at. */}
            {plan.subscription?.currentPeriodEnd && (
              <InfoRow
                label={plan.subscription.cancelAtPeriodEnd ? 'Access until' : 'Renews on'}
                value={formatDate(plan.subscription.currentPeriodEnd)}
              />
            )}
          </div>

          {plan.tier === 'FREE' && (
            <>
              {plan.tiers
                .filter(t => t.tier !== plan.tier)
                .map(t => (
                  <div
                    key={t.tier}
                    style={{
                      padding: '0.875rem 1rem', borderRadius: 'var(--radius-lg)',
                      background: 'var(--surface-container-low)',
                      display: 'flex', flexDirection: 'column', gap: '0.625rem',
                    }}
                  >
                    <div>
                      <p style={{
                        fontFamily: 'var(--font-headline)', fontWeight: 700,
                        fontSize: '0.9rem', color: 'var(--on-surface)',
                      }}>
                        {t.name}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
                        {t.summary}
                      </p>
                    </div>
                    <IncludeList items={t.includes} />
                    <PriceOptions prices={t.prices} />
                  </div>
                ))}

              {/* Nothing can be started while no provider is configured, so
                  there is no button to offer. Said plainly rather than left as
                  a control that fails when pressed. */}
              {plan.checkoutAvailable ? (
                <Button variant="primary" onClick={upgrade} style={{ width: '100%' }}>
                  Get Premium
                </Button>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', textAlign: 'center' }}>
                  Subscriptions aren&rsquo;t open yet.
                </p>
              )}
            </>
          )}

          {plan.tier === 'PREMIUM' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <Button variant="secondary" onClick={upgrade} style={{ width: '100%' }}>
                Manage subscription
              </Button>

              {isStoppable(plan.subscription) ? (
                <Button
                  variant="danger"
                  onClick={cancelSubscription}
                  loading={cancelling}
                  disabled={cancelling}
                  style={{ width: '100%' }}
                >
                  Cancel subscription
                </Button>
              ) : plan.subscription?.cancelAtPeriodEnd ? (
                // Already stopped. Said once, here, rather than left to be
                // inferred from the absence of a button.
                <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', textAlign: 'center' }}>
                  This subscription won&rsquo;t renew.
                </p>
              ) : null}
            </div>
          )}
        </div>
      )}
    </CollapsibleCard>
  )
}

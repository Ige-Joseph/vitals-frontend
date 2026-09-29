import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, StatusBanner } from '@/components/ui'
import { api, ApiError } from '@/lib/api'

/**
 * Where a subscription would be bought.
 *
 * Standalone rather than inside the app shell, because the upgrade button
 * opens it in a browser tab: purchase happens on the web, outside any in-app
 * payment flow. It works signed out too — someone arriving from a link should
 * still be able to read what Premium is.
 *
 * Checkout is offered only when the backend says a provider is configured.
 * Where it is not, the page keeps its placeholder and says so plainly instead
 * of showing a button that goes nowhere.
 *
 * Payment itself happens on the provider's own page. Nothing here collects a
 * card, and returning from it is not treated as proof of payment — see
 * `Settling`.
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
  /** Sellable periods, cheapest first. Empty for a tier nobody pays for. */
  prices: TierPrice[]
}

/**
 * The half of billing that is the same for everybody.
 *
 * Served without authentication, so a shared link to this page answers someone
 * who has never signed in — which is the whole point of a link to a pricing
 * page.
 */
interface PublicPlans {
  tiers: TierDescription[]
  checkoutUrl: string
  /**
   * Whether a purchase can actually be started right now.
   *
   * False when no payment provider is configured, which is a normal state
   * rather than a fault. The page keeps its placeholder in that case — an
   * upgrade button that leads nowhere is worse than one that is honestly
   * absent.
   */
  checkoutAvailable: boolean
}

interface PlanResponse extends PublicPlans {
  tier: 'FREE' | 'PREMIUM'
  description: TierDescription
  entitlements: { managedPersonLimit: number; connectionLimit: number }
  /**
   * A checkout started and not yet finished.
   *
   * Note what this does and does not claim. It says a checkout was started and
   * when — not that a payment succeeded. The backend cannot tell those apart
   * either: someone who paid and someone who closed the tab at the provider
   * leave behind exactly the same row. So the copy below is careful to say
   * only what is known.
   */
  pendingCheckout: {
    subscriptionId: string
    priceId: string
    startedAt: string
  } | null
  subscription: {
    id: string
    status: string
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
  } | null
}

/** What `POST /billing/checkout` answers with: somewhere to send the payer. */
interface CheckoutSession {
  redirectUrl: string
  subscriptionId: string
  priceId: string
  amountMinor: number
  currency: string
}

/**
 * How the page treats a payer who has come back from the provider.
 *
 * `waiting` is the honest default. Entitlement is granted by a webhook, not by
 * the browser returning, so at the moment of return the answer is genuinely
 * not known yet — and saying either "you're Premium" or "that failed" would be
 * a guess. `slow` is where the poll gives up looking without ever claiming the
 * payment failed, because it has no evidence of that.
 */
type Settling = 'waiting' | 'confirmed' | 'slow'

/** How long to keep asking before saying it is taking a while. ~30s. */
const SETTLE_ATTEMPTS = 15
const SETTLE_INTERVAL_MS = 2000

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100)

/** "month" for a single interval, "3 months" for several. */
const per = (price: TierPrice) =>
  price.intervalCount === 1 ? price.interval : `${price.intervalCount} ${price.interval}s`

function Includes({ items }: { items: string[] }) {
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
          <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function TierCard({
  tier,
  isCurrent,
  selectedPriceId,
  onSelectPrice,
  children,
}: {
  tier: TierDescription
  isCurrent: boolean
  selectedPriceId?: string
  onSelectPrice?: (priceId: string) => void
  children?: React.ReactNode
}) {
  return (
    <section
      style={{
        padding: '1.25rem',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--surface-container-lowest)',
        border: `1px solid ${isCurrent ? 'var(--primary)' : 'var(--outline-variant)'}`,
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-headline)', fontWeight: 800,
            fontSize: '1.125rem', color: 'var(--on-surface)',
          }}>
            {tier.name}
          </h2>
          {isCurrent && (
            <span style={{
              padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)',
              background: 'var(--primary-fixed)', color: 'var(--primary)',
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              Your plan
            </span>
          )}
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
          {tier.summary}
        </p>

        {tier.prices.length === 0 && (
          <p style={{
            fontFamily: 'var(--font-headline)', fontWeight: 800,
            fontSize: '1.5rem', color: 'var(--on-surface)', marginTop: '0.25rem',
          }}>
            Free
          </p>
        )}
      </div>

      {/* One row per sellable period. Rendered from the list, so a new period
          appears here without this component changing. */}
      {tier.prices.length > 0 && (
        <div role="radiogroup" aria-label={`${tier.name} billing period`} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {tier.prices.map(price => {
            const chosen = price.id === selectedPriceId
            return (
              <button
                key={price.id}
                role="radio"
                aria-checked={chosen}
                onClick={() => onSelectPrice?.(price.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.875rem 1rem', cursor: 'pointer', textAlign: 'left',
                  borderRadius: 'var(--radius-lg)',
                  border: `1px solid ${chosen ? 'var(--primary)' : 'var(--outline-variant)'}`,
                  background: chosen ? 'var(--primary-fixed)' : 'var(--surface-container-lowest)',
                }}
              >
                <span
                  aria-hidden
                  className="material-symbols-outlined"
                  style={{ fontSize: 20, color: chosen ? 'var(--primary)' : 'var(--outline)' }}
                >
                  {chosen ? 'radio_button_checked' : 'radio_button_unchecked'}
                </span>

                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--on-surface)' }}>
                    {money(price.amountMinor, price.currency)}
                    <span style={{ fontWeight: 500, color: 'var(--on-surface-variant)' }}> / {per(price)}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>
                    {price.label}
                    {price.perMonthMinor !== price.amountMinor &&
                      ` · ${money(price.perMonthMinor, price.currency)} a month`}
                  </span>
                </span>

                {/* The saving, worked out rather than left to the reader. */}
                {price.savingPercent > 0 && (
                  <span style={{
                    flexShrink: 0, padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--tertiary-fixed)', color: 'var(--tertiary)',
                    fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
                  }}>
                    Save {price.savingPercent}% · {money(price.savingMinorPerYear, price.currency)}/yr
                  </span>
                )}
              </button>
            )
          })}

          {tier.prices.some(p => p.provisional) && (
            <p style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>
              Prices are provisional and may change before subscriptions open.
            </p>
          )}
        </div>
      )}

      <Includes items={tier.includes} />

      {children}
    </section>
  )
}

/**
 * The bottom of the Premium card: whatever this reader can actually do next.
 *
 * Four different answers, and the order matters. Being signed out and having
 * no provider configured are both ordinary states rather than errors, and each
 * has something true to say — so neither is allowed to fall through to a
 * button that would fail.
 */
function CheckoutArea({
  signedIn,
  tier,
  checkoutAvailable,
  selectedPriceId,
  starting,
  error,
  onStart,
}: {
  signedIn: boolean
  /** Undefined while the account half is still loading, or signed out. */
  tier?: 'FREE' | 'PREMIUM'
  checkoutAvailable: boolean
  selectedPriceId?: string
  starting: boolean
  error: string
  onStart: () => void
}) {
  const placeholder = (icon: string, title: string, detail: string, action?: React.ReactNode) => (
    <div
      style={{
        padding: '1rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--outline)',
        background: 'var(--surface-container-low)',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        alignItems: 'center', textAlign: 'center',
      }}
    >
      <span className="material-symbols-outlined" aria-hidden style={{ color: 'var(--outline)' }}>
        {icon}
      </span>
      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)' }}>
        {title}
      </p>
      <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
        {detail}
      </p>
      {action}
    </div>
  )

  // Checkout is an authenticated call — a subscription has to belong to
  // someone. Reading the page signed out is fine; buying from it is not.
  if (!signedIn) {
    return placeholder(
      'account_circle',
      'Sign in to continue',
      'A subscription belongs to an account, so you’ll need to be signed in before you can start one.',
      <Link to="/login" style={{ textDecoration: 'none' }}>
        <Button variant="secondary" size="sm" icon="login">Sign in</Button>
      </Link>,
    )
  }

  // Already paying. Offering to buy again would be a button whose only
  // possible outcome is an error from the backend.
  if (tier === 'PREMIUM') {
    return placeholder(
      'check_circle',
      'Premium is active',
      'You can change or stop your subscription from your profile.',
    )
  }

  // No provider configured, or the plan never loaded. Either way there is
  // nothing that can be started, and the page says so rather than pretending.
  if (!checkoutAvailable) {
    return placeholder(
      'schedule',
      'Checkout isn’t live yet',
      'This page shows what Premium includes and what it costs. Nothing is charged today.',
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {error && <StatusBanner type="error" message={error} />}

      <Button
        variant="primary"
        onClick={onStart}
        loading={starting}
        disabled={starting || !selectedPriceId}
        style={{ width: '100%' }}
      >
        {starting ? 'Starting…' : 'Continue'}
      </Button>

      <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', textAlign: 'center' }}>
        You’ll be taken to our payment provider to finish. Your subscription
        starts once the payment clears.
      </p>
    </div>
  )
}

export function BillingPage() {
  const [plan, setPlan] = useState<PlanResponse | null>(null)
  const [tiers, setTiers] = useState<TierDescription[] | null>(null)
  const [checkoutAvailable, setCheckoutAvailable] = useState(false)
  const [tiersFailed, setTiersFailed] = useState(false)
  const [signedIn, setSignedIn] = useState(true)
  const [selectedPriceId, setSelectedPriceId] = useState<string | undefined>(undefined)
  const [starting, setStarting] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [settling, setSettling] = useState<Settling | null>(null)
  /**
   * Whether a started-but-unfinished checkout has been seen at any point.
   *
   * Latched rather than read live, because the poll below is keyed on it: a
   * value that flipped back to false the moment the checkout resolved would
   * restart the very effect that resolved it.
   */
  const [pendingSeen, setPendingSeen] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams()
  const returned = searchParams.get('checkout') === 'returned'

  /** The public half: tiers, prices, and whether anything can be bought. */
  const applyPublic = useCallback((p: PublicPlans) => {
    setTiers(p.tiers)
    setCheckoutAvailable(p.checkoutAvailable)
    const premiumPrices = p.tiers.find(t => t.tier === 'PREMIUM')?.prices ?? []
    // Default to the best value on offer — no assumption about which period
    // that is. Only ever a default: this runs again on every poll while a
    // payment settles, and must not move a choice already made.
    const best = [...premiumPrices].sort((a, b) => b.savingPercent - a.savingPercent)[0]
    setSelectedPriceId(current => current ?? best?.id)
  }, [])

  /** The account half. Absent for a signed-out reader, which is not an error. */
  const applyPlan = useCallback((p: PlanResponse) => {
    setPlan(p)
    if (p.pendingCheckout) setPendingSeen(true)
  }, [])

  // What Premium is. Needs no account, so a shared link works for a stranger.
  useEffect(() => {
    api.get<PublicPlans>('/api/v1/billing/tiers')
      .then(applyPublic)
      .catch(() => setTiersFailed(true))
  }, [applyPublic])

  // Who this reader is. Failing on 401 is the ordinary signed-out path, and
  // leaves the page above still standing.
  useEffect(() => {
    api.get<PlanResponse>('/api/v1/billing/plan')
      .then(applyPlan)
      .catch(e => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setSignedIn(false)
        }
      })
  }, [applyPlan])

  /**
   * Wait for a payment to become real.
   *
   * The provider sends the payer back the moment they are done, but what makes
   * them Premium is a webhook arriving on its own schedule. So the return is
   * the beginning of the wait, not the end of it: poll the plan until the tier
   * changes, and if it has not changed by the time the budget runs out, say
   * that it is taking a while.
   *
   * A failed poll is deliberately not treated as a failed payment. The two
   * have nothing to do with each other, and money has already moved.
   */
  useEffect(() => {
    // Two ways in. Coming back from the provider is one; finding an unfinished
    // checkout already on the account is the other, and it is what rescues
    // someone who closed the tab mid-payment and came back later.
    if (!returned && !pendingSeen) return
    if (!signedIn) {
      // Nothing to wait for, and no way to find out. Better to drop the wait
      // than to leave "confirming your payment" on screen indefinitely.
      setSettling(null)
      return
    }

    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout>

    setSettling(current => current ?? 'waiting')

    const tick = async () => {
      if (cancelled) return
      attempts += 1

      try {
        const p = await api.get<PlanResponse>('/api/v1/billing/plan')
        if (cancelled) return
        applyPlan(p)

        if (p.tier === 'PREMIUM') {
          setSettling('confirmed')
          // Drop the marker so a reload is an ordinary visit rather than
          // another wait for something that has already happened.
          setSearchParams({}, { replace: true })
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
  }, [returned, pendingSeen, signedIn, applyPlan, setSearchParams])

  /**
   * Start a purchase, then leave for the provider.
   *
   * `starting` is not cleared on the happy path — the navigation away is the
   * end of this page's involvement, and re-enabling the button first would let
   * a second checkout be started in the gap.
   */
  const startCheckout = async () => {
    if (!selectedPriceId) return

    setStarting(true)
    setCheckoutError('')

    try {
      const session = await api.post<CheckoutSession>(
        '/api/v1/billing/checkout',
        { priceId: selectedPriceId },
      )
      window.location.assign(session.redirectUrl)
    } catch (e) {
      setCheckoutError(
        e instanceof ApiError ? e.message : 'Could not start checkout. Please try again.',
      )
      setStarting(false)
    }
  }

  const premium = tiers?.find(t => t.tier === 'PREMIUM')
  const free = tiers?.find(t => t.tier === 'FREE')

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface)', padding: 'clamp(1.5rem, 5vw, 3rem) 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }} className="animate-fade-up">

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2rem', justifyContent: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, overflow: 'hidden' }}>
            <img src="/icons/icon-192x192.png" alt="Vitals logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)' }}>Vitals</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-headline)', fontWeight: 800,
          fontSize: 'clamp(1.5rem, 5vw, 1.875rem)', color: 'var(--on-surface)',
          textAlign: 'center', marginBottom: '0.5rem',
        }}>
          Vitals Premium
        </h1>
        <p style={{
          fontSize: '0.9rem', color: 'var(--on-surface-variant)',
          textAlign: 'center', marginBottom: '2rem',
        }}>
          Care for the people around you, not just yourself.
        </p>

        {/* Where a payment is still settling, that outranks everything else on
            the page — it is the thing the reader came back to find out. */}
        {settling && (
          <div style={{ marginBottom: '1.5rem' }}>
            {settling === 'confirmed' ? (
              <StatusBanner
                type="success"
                message="Payment received. Premium is active on your account."
              />
            ) : settling === 'waiting' ? (
              <StatusBanner
                type="info"
                message={
                  returned
                    ? 'Confirming your payment. This usually takes a few seconds — you can stay on this page.'
                    : 'You have a subscription you started and haven’t finished. Checking whether it went through.'
                }
              />
            ) : (
              <StatusBanner
                type="info"
                message={
                  returned
                    ? 'Your payment is still being confirmed. This can take a few minutes; Premium will switch on by itself once it clears, and you don’t need to pay again.'
                    : 'That subscription hasn’t come through. If you completed payment it will switch on by itself — otherwise you can pick a period and start again.'
                }
              />
            )}
          </div>
        )}

        {/* The honest bit, and only where it is true. Said before the price,
            not buried under it. */}
        {tiers && !checkoutAvailable && (
          <div style={{ marginBottom: '1.5rem' }}>
            <StatusBanner
              type="info"
              message="Subscriptions aren't open yet. This page shows what Premium will include and what it will cost — there's nothing to pay for today."
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {premium && (
            <TierCard
              tier={premium}
              isCurrent={plan?.tier === 'PREMIUM'}
              selectedPriceId={selectedPriceId}
              onSelectPrice={setSelectedPriceId}
            >
              <CheckoutArea
                signedIn={signedIn}
                tier={plan?.tier}
                checkoutAvailable={checkoutAvailable}
                selectedPriceId={selectedPriceId}
                starting={starting}
                error={checkoutError}
                onStart={startCheckout}
              />
            </TierCard>
          )}

          {free && <TierCard tier={free} isCurrent={plan?.tier === 'FREE'} />}

          {/* Only a genuine failure to load the tier list. Being signed out no
              longer lands here — that used to leave a stranger following a
              shared link with nothing but an error. */}
          {tiersFailed && (
            <StatusBanner
              type="error"
              message="Couldn't load plan details. Please try again shortly."
            />
          )}
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          {signedIn ? (
            <Link to="/profile" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" icon="arrow_back">Back to Vitals</Button>
            </Link>
          ) : (
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <Button variant="primary" icon="login">Sign in to Vitals</Button>
            </Link>
          )}
        </div>

        <p style={{
          marginTop: '1.5rem', fontSize: '0.75rem',
          color: 'var(--on-surface-variant)', textAlign: 'center',
        }}>
          Premium changes how many people you can care for. It never changes
          access to health records you already have.
        </p>
      </div>
    </div>
  )
}

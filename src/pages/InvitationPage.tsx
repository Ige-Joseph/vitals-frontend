import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Button, Skeleton, StatusBanner } from '@/components/ui'
import { UpgradePrompt } from '@/components/billing/PremiumAccess'
import { useBillingTier } from '@/hooks/useBillingStatus'
import { RegrantPanel } from '@/components/family/RegrantPanel'
import type { Capacity } from '@/pages/family/FamilySection'
import {
  describeBlockers,
  ROLE_OFFER_HINT,
  ROLE_OFFER_LABEL,
  type InvitationPreview,
  type ReceivedInvitation,
  type RespondMode,
  type RespondResult,
  type RevokedManager,
} from '@/components/family/invitation.types'

/**
 * Answering an invitation.
 *
 * Standalone, outside the app shell, because the person reading it usually has
 * no Vitals account yet — and main navigation stays at five items regardless.
 * The token in the URL is the credential; it was sent to an address, and what
 * it reveals is no more than the email already said.
 *
 * ── What this screen must not say ────────────────────────────────────────
 *
 * When ownership is not on offer, the screen offers a connection and says
 * nothing at all about claiming. Whether the inviter marked a record as being
 * *about* the person they invited is the inviter's business, and an
 * explanation of its absence — even a gentle one — would disclose it. There is
 * no greyed-out button here and no "not available for this record" line: the
 * option simply is not part of the screen.
 *
 * A *refused* claim is different and is explained fully. There the invitee
 * asked, and what stopped them is a fact about their own record, which is
 * theirs to know.
 */

type Stage =
  | { name: 'deciding' }
  | { name: 'claimed'; personId: string; revoked: RevokedManager[] }
  | { name: 'refused'; blockedBy: Record<string, number> }
  | { name: 'done'; message: string; personId?: string }

export function InvitationPage() {
  const { token, invitationId } = useParams()
  const { user, isAuthenticated } = useAuthStore()
  const { tier } = useBillingTier(isAuthenticated)

  /**
   * Two ways to reach one offer.
   *
   * A token comes from the email and works signed out. An id comes from the
   * account's own list of offers and only works signed in — it is not a
   * credential, and the API narrows every lookup by the caller's verified
   * address, so holding one proves nothing.
   */
  const byId = Boolean(invitationId)

  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<RespondMode | null>(null)
  const [error, setError] = useState('')
  const [stage, setStage] = useState<Stage>({ name: 'deciding' })
  /**
   * The invitee's own connection ceiling.
   *
   * Connecting consumes a slot on the *accepting* account, so this is the one
   * side where capacity decides anything — the inviter's ceilings are not
   * involved in an offer they make. Read here so a free account is told why it
   * cannot accept, instead of pressing a button that returns an error.
   */
  const [capacity, setCapacity] = useState<Capacity | null>(null)

  useEffect(() => {
    if (byId) {
      // The list is already scoped to this account's verified address, so an
      // id that is not in it is one this account cannot answer — the same
      // answer the API would give, reached without a round trip that leaks the
      // difference between "not yours" and "not there".
      api
        .get<ReceivedInvitation[]>('/api/v1/invitations')
        .then(rows => {
          const found = rows.find(r => r.invitationId === invitationId)
          if (!found) {
            setLoadError('No pending invitation for this account')
            return
          }
          setPreview({
            personId: found.personId,
            email: user?.email ?? '',
            role: found.role,
            claimable: found.claimable,
            recordName: found.recordName,
            inviterName: found.inviterName,
            // listPending only ever returns live offers, so this is PENDING by
            // construction rather than by assumption.
            status: 'PENDING',
            expiresAt: found.expiresAt,
            requiresSignup: false,
          })
        })
        .catch(e =>
          setLoadError(
            e instanceof ApiError ? e.message : 'This invitation could not be opened.',
          ),
        )
        .finally(() => setLoading(false))
      return
    }

    api
      .get<InvitationPreview>(`/api/v1/invitations/${token}`)
      .then(setPreview)
      .catch(e =>
        setLoadError(
          e instanceof ApiError ? e.message : 'This invitation link could not be opened.',
        ),
      )
      .finally(() => setLoading(false))
  }, [token, invitationId, byId, user?.email])

  useEffect(() => {
    if (!isAuthenticated) return
    api
      .get<Capacity>('/api/v1/persons/capacity')
      // Unknown rather than assumed: leaving it null keeps the button enabled
      // and lets the API be the judge, which is the safe direction to fail.
      .catch(() => null)
      .then(c => setCapacity(c))
  }, [isAuthenticated])

  const respond = async (mode: RespondMode) => {
    setBusy(mode)
    setError('')

    try {
      const result = await api.post<RespondResult>(
        byId
          ? `/api/v1/invitations/by-id/${invitationId}/respond`
          : `/api/v1/invitations/${token}/respond`,
        { mode },
      )

      if (result.outcome === 'claimed') {
        setStage({ name: 'claimed', personId: result.personId, revoked: result.revoked })
      } else if (result.outcome === 'refused') {
        // Not an error. The invitation is still open and connecting still
        // works — the screen says so rather than dead-ending.
        setStage({ name: 'refused', blockedBy: result.blockedBy })
      } else if (result.outcome === 'connected') {
        setStage({ name: 'done', message: 'You now have access to this record.', personId: preview?.personId })
      } else {
        setStage({ name: 'done', message: 'Invitation declined.' })
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  const atConnectionCeiling =
    capacity !== null && capacity.connectionsUsed >= capacity.connectionLimit

  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: '100dvh', background: 'var(--surface)', padding: 'clamp(1.5rem, 5vw, 3rem) 1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 520, margin: '0 auto' }} className="animate-fade-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2rem', justifyContent: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, overflow: 'hidden' }}>
            <img src="/icons/icon-192x192.png" alt="Vitals logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)' }}>
            Vitals
          </span>
        </div>

        <div style={{
          padding: '1.5rem', borderRadius: 'var(--radius-xl)',
          background: 'var(--surface-container-lowest)',
          border: '1px solid var(--outline-variant)',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}>
          {children}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return shell(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Skeleton height={24} width="60%" />
        <Skeleton height={64} />
        <Skeleton height={44} />
      </div>,
    )
  }

  if (loadError || !preview) {
    return shell(
      <>
        <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--on-surface)' }}>
          This link doesn&rsquo;t work
        </h1>
        <StatusBanner type="error" message={loadError || 'This invitation link is not valid.'} />
        <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
          It may have been withdrawn, already answered, or simply be out of date.
          Ask whoever sent it to invite you again.
        </p>
        <Link to="/dashboard" style={{ textDecoration: 'none' }}>
          <Button variant="secondary" style={{ width: '100%' }}>Go to Vitals</Button>
        </Link>
      </>,
    )
  }

  // ── Settled outcomes ────────────────────────────────────────────────────

  if (stage.name === 'claimed') {
    return shell(
      <>
        <StatusBanner type="success" message={`${preview.recordName} is now your record.`} />
        <RegrantPanel
          personId={stage.personId}
          revoked={stage.revoked}
          onDone={kept =>
            setStage({
              name: 'done',
              message:
                kept > 0
                  ? 'Done. This record is yours, and the access you kept is unchanged.'
                  : 'Done. This record is yours alone now.',
              personId: stage.personId,
            })
          }
        />
        {stage.revoked.length === 0 && (
          <Link to={`/dashboard?personId=${encodeURIComponent(stage.personId)}`} style={{ textDecoration: 'none' }}>
            <Button variant="primary" style={{ width: '100%' }}>Go to your record</Button>
          </Link>
        )}
      </>,
    )
  }

  /**
   * The claim could not be taken. Say what is possible, not what isn't.
   *
   * No red, no "error", no blame. The invitee tried to do something reasonable
   * and the answer is that both records stay separate — which is a fact about
   * how Vitals treats health data, not a fault of theirs.
   */
  if (stage.name === 'refused') {
    return shell(
      <>
        <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--on-surface)' }}>
          You already have health records in Vitals
        </h1>

        <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
          {preview.inviterName} kept a record about you. Because you&rsquo;ve already
          recorded {describeBlockers(stage.blockedBy)} of your own, we can&rsquo;t merge
          the two — combining health records risks losing or mixing up information.
        </p>

        <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
          You can open {preview.inviterName}&rsquo;s record alongside your own, with
          full access. Both stay separate and complete.
        </p>

        {error && <StatusBanner type="error" message={error} />}

        {atConnectionCeiling && tier === 'FREE' ? (
          <UpgradePrompt
            title="This connection needs Premium capacity"
            description={`You’ve reached this account’s limit of ${capacity?.connectionLimit} connected records. Upgrade, or disconnect from someone in Profile → Family; this invitation will remain available.`}
          />
        ) : atConnectionCeiling ? (
          <StatusBanner
            type="info"
            message="Your current connection capacity is full. Disconnect from someone in Profile → Family to open both records; this invitation will remain available."
          />
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Button
            variant="primary"
            onClick={() => respond('connect')}
            loading={busy === 'connect'}
            disabled={busy !== null || atConnectionCeiling}
            style={{ width: '100%' }}
          >
            Open both records
          </Button>
          <Button
            variant="ghost"
            onClick={() => respond('decline')}
            loading={busy === 'decline'}
            disabled={busy !== null}
            style={{ width: '100%' }}
          >
            Not now
          </Button>
        </div>
      </>,
    )
  }

  if (stage.name === 'done') {
    return shell(
      <>
        <StatusBanner type="success" message={stage.message} />
        {/* Straight to the record that was just accepted. `preview.personId`
            is what makes that possible — without it this could only offer a
            profile page and a hunt. */}
        {stage.personId ? (
          <Link to={`/dashboard?personId=${encodeURIComponent(stage.personId)}`} style={{ textDecoration: 'none' }}>
            <Button variant="primary" style={{ width: '100%' }}>
              Open {preview.recordName}&rsquo;s record
            </Button>
          </Link>
        ) : (
          <Link to="/dashboard" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" style={{ width: '100%' }}>Go to Vitals</Button>
          </Link>
        )}
      </>,
    )
  }

  // ── Deciding ────────────────────────────────────────────────────────────

  const offer = (
    <>
      <div>
        <p style={{
          fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.35rem',
        }}>
          Invitation
        </p>
        <h1 style={{
          fontFamily: 'var(--font-headline)', fontWeight: 800,
          fontSize: '1.3rem', color: 'var(--on-surface)', lineHeight: 1.25,
        }}>
          {preview.inviterName} shared {preview.recordName}&rsquo;s record with you
        </h1>
      </div>

      <div style={{
        padding: '0.875rem 1rem', borderRadius: 'var(--radius-lg)',
        background: 'var(--surface-container-low)',
      }}>
        <p style={{ fontWeight: 700, fontSize: '0.875rem', fontFamily: 'var(--font-headline)', color: 'var(--on-surface)' }}>
          {ROLE_OFFER_LABEL[preview.role === 'VIEWER' ? 'VIEWER' : 'CAREGIVER']}
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', marginTop: '0.15rem' }}>
          {ROLE_OFFER_HINT[preview.role === 'VIEWER' ? 'VIEWER' : 'CAREGIVER']}
        </p>
      </div>
    </>
  )

  if (preview.status !== 'PENDING') {
    const settled: Record<string, string> = {
      ACCEPTED: 'This invitation has already been accepted.',
      DECLINED: 'This invitation was declined.',
      REVOKED: 'This invitation was withdrawn.',
      EXPIRED: 'This invitation has expired.',
    }
    return shell(
      <>
        {offer}
        <StatusBanner type="info" message={settled[preview.status] ?? 'This invitation is no longer open.'} />
        <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
          Ask {preview.inviterName} to send a new invitation if you still need access.
        </p>
        <Link to="/dashboard" style={{ textDecoration: 'none' }}>
          <Button variant="secondary" style={{ width: '100%' }}>Go to Vitals</Button>
        </Link>
      </>,
    )
  }

  // Signed out: show what is on offer, then send them to the right door.
  if (!isAuthenticated) {
    return shell(
      <>
        {offer}
        <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', lineHeight: 1.55 }}>
          {preview.requiresSignup
            ? `Create a Vitals account with ${preview.email} to accept this.`
            : `Sign in as ${preview.email} to accept this.`}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link to={preview.requiresSignup ? '/signup' : '/login'} style={{ textDecoration: 'none' }}>
            <Button variant="primary" style={{ width: '100%' }}>
              {preview.requiresSignup ? 'Create an account' : 'Sign in'}
            </Button>
          </Link>
          <p style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', textAlign: 'center' }}>
            Come back to this link afterwards — or find it waiting in Profile → Family.
          </p>
        </div>
      </>,
    )
  }

  // Signed in as somebody else. The API refuses this, so say so before they try.
  const addressMatches =
    (user?.email ?? '').trim().toLowerCase() === preview.email.trim().toLowerCase()

  if (!addressMatches) {
    return shell(
      <>
        {offer}
        <StatusBanner
          type="info"
          message={`This invitation was sent to ${preview.email}, and you're signed in as ${user?.email ?? 'another account'}.`}
        />
        <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
          Sign in with {preview.email} to accept it.
        </p>
      </>,
    )
  }

  return shell(
    <>
      {offer}

      {error && <StatusBanner type="error" message={error} />}

      {/* Connecting spends a slot on this account; claiming does not, because
          a claimed record becomes this account's own rather than somebody
          else's shared with it. So a full account can still take ownership —
          only the connection is out of reach, and only that is explained. */}
      {atConnectionCeiling && (
        tier === 'FREE' ? (
          <UpgradePrompt
            title="This connection needs Premium capacity"
            description={`You’ve reached this account’s limit of ${capacity?.connectionLimit} connected records. Upgrade, or disconnect from someone in Profile → Family; this invitation will remain available.`}
          />
        ) : tier === 'PREMIUM' ? (
          <StatusBanner
            type="info"
            message={`You’re using all ${capacity?.connectionLimit} connection slots currently assigned to this account. Disconnect from someone in Profile → Family to accept; this invitation will remain available.`}
          />
        ) : (
          <StatusBanner
            type="info"
            message="Your current connection capacity is full. Check your plan or disconnect from someone in Profile → Family to accept; this invitation will remain available."
          />
        )
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* Ownership, only where it is offered. Where it is not, nothing here
            hints that it could have been. */}
        {preview.claimable && (
          <>
            <Button
              variant="primary"
              onClick={() => respond('claim')}
              loading={busy === 'claim'}
              disabled={busy !== null}
              style={{ width: '100%' }}
            >
              This record is about me
            </Button>
            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
              Takes it over as your own record. {preview.inviterName} keeps access only
              if you say so on the next screen.
            </p>
          </>
        )}

        <Button
          variant={preview.claimable ? 'secondary' : 'primary'}
          onClick={() => respond('connect')}
          loading={busy === 'connect'}
          disabled={busy !== null || atConnectionCeiling}
          style={{ width: '100%' }}
        >
          {preview.claimable ? 'Just give me access' : 'Accept'}
        </Button>

        <Button
          variant="ghost"
          onClick={() => respond('decline')}
          loading={busy === 'decline'}
          disabled={busy !== null}
          style={{ width: '100%' }}
        >
          Decline
        </Button>
      </div>
    </>,
  )
}

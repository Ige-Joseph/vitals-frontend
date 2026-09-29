import { Link } from 'react-router-dom'

import { Button } from '@/components/ui'
import {
  ROLE_OFFER_LABEL,
  STATUS_LABEL,
  type ReceivedInvitation,
  type SentInvitation,
} from './invitation.types'

/**
 * Offers in flight, both directions.
 *
 * Two lists rather than one, because the two are answered by different people
 * and carry different actions: an offer *to* you is accepted or declined by
 * you, an offer *from* you is only yours to withdraw. Merging them into a
 * single "invitations" list would put the wrong verb next to half the rows.
 *
 * Received invitations are answered here, by id. The token in the email is one
 * way in; for an account that is already signed in and can see the offer
 * listed, the id is the other — which matters most for the account that was
 * created *from* the invitation, where the email has usually been used or lost.
 *
 * Taking ownership is not offered here even where it is available. That
 * decision ends somebody else's access and is followed by a question about
 * whether to restore it, which belongs on a screen of its own rather than in a
 * row in a settings panel — so a claimable offer sends the reader there
 * instead.
 */

const expiryNote = (iso: string): string => {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (days <= 0) return 'Expires today'
  if (days === 1) return 'Expires tomorrow'
  return `Expires in ${days} days`
}

function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <p style={{
      fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.8125rem',
      color: 'var(--on-surface-variant)', letterSpacing: '0.05em',
      textTransform: 'uppercase', marginBottom: '0.625rem',
    }}>
      {label} ({count})
    </p>
  )
}

export function PendingInvitations({
  received,
  sent,
  onRespond,
  respondingId,
  onWithdraw,
  withdrawingId,
}: {
  received: ReceivedInvitation[]
  sent: SentInvitation[]
  onRespond: (invitation: ReceivedInvitation, mode: 'connect' | 'decline') => void
  respondingId: string | null
  onWithdraw: (invitation: SentInvitation) => void
  withdrawingId: string | null
}) {
  // Only what is still answerable. Settled offers are history and would only
  // make the live ones harder to find.
  const livesSent = sent.filter(s => s.status === 'PENDING')

  if (received.length === 0 && livesSent.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {received.length > 0 && (
        <div>
          <SectionHeading label="Invitations for you" count={received.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {received.map(invitation => (
              <div
                key={invitation.invitationId}
                style={{
                  padding: '0.875rem 1rem', borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--primary)',
                  background: 'var(--primary-fixed)',
                  display: 'flex', flexDirection: 'column', gap: '0.625rem',
                }}
              >
                <div>
                  <p style={{
                    fontFamily: 'var(--font-headline)', fontWeight: 700,
                    fontSize: '0.9rem', color: 'var(--on-surface)',
                  }}>
                    {invitation.inviterName} shared {invitation.recordName}&rsquo;s record
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: '0.15rem' }}>
                    {ROLE_OFFER_LABEL[invitation.role === 'VIEWER' ? 'VIEWER' : 'CAREGIVER']}
                    {' · '}{expiryNote(invitation.expiresAt)}
                  </p>
                </div>

                {invitation.claimable ? (
                  <>
                    {/* Ownership is on offer, so accepting as a connection here
                        would quietly forfeit it. The full decision screen is
                        where that choice belongs. */}
                    <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
                      {invitation.inviterName} says this record is about you, so you
                      can take it over as your own.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Link
                        to={`/invitations/by-id/${invitation.invitationId}`}
                        style={{ textDecoration: 'none', flex: 1, minWidth: 150 }}
                      >
                        <Button variant="primary" size="sm" style={{ width: '100%' }}>
                          Review options
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={respondingId === invitation.invitationId}
                        onClick={() => onRespond(invitation, 'decline')}
                      >
                        Decline
                      </Button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      icon="check"
                      disabled={respondingId === invitation.invitationId}
                      onClick={() => onRespond(invitation, 'connect')}
                      style={{ flex: 1, minWidth: 130 }}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={respondingId === invitation.invitationId}
                      onClick={() => onRespond(invitation, 'decline')}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {livesSent.length > 0 && (
        <div>
          <SectionHeading label="Invitations you sent" count={livesSent.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {livesSent.map(invitation => (
              <div
                key={invitation.id}
                style={{
                  padding: '0.875rem 1rem', borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--outline-variant)',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: 'var(--font-headline)', fontWeight: 700,
                    fontSize: '0.875rem', color: 'var(--on-surface)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {invitation.email}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                    {invitation.recordName}
                    {' · '}{ROLE_OFFER_LABEL[invitation.role === 'VIEWER' ? 'VIEWER' : 'CAREGIVER']}
                    {invitation.claimable ? ' · can take ownership' : ''}
                    {' · '}{STATUS_LABEL[invitation.status]}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  icon="close"
                  disabled={withdrawingId === invitation.id}
                  onClick={() => onWithdraw(invitation)}
                >
                  Withdraw
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

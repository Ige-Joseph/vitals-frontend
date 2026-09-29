import { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import { api, ApiError } from '@/lib/api'
import { Button, Input, StatusBanner } from '@/components/ui'
import type { PersonListEntry } from '@/pages/profile/FamilySection'
import { ROLE_OFFER_HINT, ROLE_OFFER_LABEL } from './invitation.types'

/**
 * Offer someone access to a record.
 *
 * Which record is a choice, because the common case is not the obvious one:
 * sharing *your own* record with a relative is at least as ordinary as sharing
 * a dependent's. Only records this account can manage are offerable — the API
 * requires `manage`, so anything else would be a form that fails on submit.
 *
 * ── The claimable checkbox ────────────────────────────────────────────────
 *
 * "This record is about them" is the inviter asserting that the person they
 * are inviting is the subject of the record, which is what makes taking
 * ownership available at acceptance. It is the inviter's to assert and nobody
 * else's: without it, anyone invited to look at a baby's record could take
 * ownership of it and lock the parent out.
 *
 * It is offered only for records nobody owns yet. A record that already
 * belongs to its subject cannot be offered to somebody else as theirs to take,
 * and the API refuses it — so the control is absent rather than present and
 * rejected.
 */
export function InviteModal({
  people,
  defaultPersonId,
  onSent,
  onCancel,
}: {
  people: PersonListEntry[]
  defaultPersonId?: string
  onSent: (recordName: string, email: string) => void
  onCancel: () => void
}) {
  // Only what this account manages. `role` is the caller's role on the record.
  const offerable = people.filter(p => p.role === 'OWNER')

  const [personId, setPersonId] = useState(
    defaultPersonId ?? offerable.find(p => p.isSelf)?.personId ?? offerable[0]?.personId ?? '',
  )
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'CAREGIVER' | 'VIEWER'>('CAREGIVER')
  const [claimable, setClaimable] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submitting = useRef(false)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const selected = offerable.find(p => p.personId === personId)

  // Ownership is only offerable on a record nobody has claimed. Reset the box
  // rather than leaving it ticked out of sight when the record changes.
  const canOfferClaim = Boolean(selected && !selected.isSelf && !selected.isClaimed)
  useEffect(() => {
    if (!canOfferClaim) setClaimable(false)
  }, [canOfferClaim])

  const submit = async () => {
    if (submitting.current) return

    if (!personId) {
      setError('Choose which record to share.')
      return
    }
    if (!email.trim()) {
      setError('Enter the email address to send this to.')
      return
    }

    submitting.current = true
    setLoading(true)
    setError('')

    try {
      await api.post(`/api/v1/persons/${personId}/invitations`, {
        email: email.trim(),
        role,
        claimable,
      })

      onSent(selected?.displayName ?? 'this record', email.trim())
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Could not send that invitation. Please try again.',
      )
      submitting.current = false
      setLoading(false)
    }
  }

  const modal = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(24,28,32,0.58)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(0.5rem, 2vw, 1.25rem)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !loading) onCancel()
      }}
    >
      <div
        style={{
          background: 'var(--surface-container-lowest)',
          borderRadius: 'var(--radius-2xl)',
          width: '100%', maxWidth: 560, maxHeight: '94dvh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeUp 0.28s cubic-bezier(0.34,1.2,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid var(--outline-variant)', flexShrink: 0 }}>
          <div style={{ width: 38, height: 4, borderRadius: 999, background: 'var(--outline-variant)', margin: '0 auto 1rem' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <p style={{
                fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.06em',
                textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.25rem',
              }}>
                Invitation
              </p>
              <h2 style={{
                fontFamily: 'var(--font-headline)', fontWeight: 900,
                fontSize: '1.35rem', color: 'var(--on-surface)', lineHeight: 1.15,
              }}>
                Share a record
              </h2>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                They&rsquo;ll get an email with a link. Nothing is shared until they accept.
              </p>
            </div>

            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              aria-label="Close"
              style={{
                background: 'var(--surface-container)', border: '1px solid var(--outline-variant)',
                cursor: loading ? 'not-allowed' : 'pointer', width: 36, height: 36,
                borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--on-surface-variant)', flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined icon-sm">close</span>
            </button>
          </div>
        </div>

        <div style={{
          overflowY: 'auto', padding: '1rem', paddingBottom: '2rem',
          display: 'flex', flexDirection: 'column', gap: '1.25rem',
        }}>
          {error && <StatusBanner type="error" message={error} />}

          <div>
            <label style={{
              display: 'block', fontSize: '0.8125rem', fontWeight: 600,
              color: 'var(--on-surface-variant)', marginBottom: '0.375rem',
            }}>
              Which record
            </label>
            <select
              value={personId}
              onChange={e => setPersonId(e.target.value)}
              style={{
                width: '100%', padding: '0.75rem 0.875rem',
                borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)',
                background: 'var(--surface-container-lowest)', color: 'var(--on-surface)',
                fontSize: '0.9375rem', fontFamily: 'inherit',
              }}
            >
              {offerable.map(p => (
                <option key={p.personId} value={p.personId}>
                  {p.isSelf ? `${p.displayName} (your own record)` : p.displayName}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Their email address"
            type="email"
            placeholder="sister@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <div>
            <label style={{
              display: 'block', fontSize: '0.8125rem', fontWeight: 600,
              color: 'var(--on-surface-variant)', marginBottom: '0.5rem',
            }}>
              What they can do
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(['CAREGIVER', 'VIEWER'] as const).map(option => {
                const chosen = role === option
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    onClick={() => setRole(option)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                      padding: '0.75rem 0.875rem', cursor: 'pointer', textAlign: 'left',
                      borderRadius: 'var(--radius-lg)',
                      border: `1px solid ${chosen ? 'var(--primary)' : 'var(--outline-variant)'}`,
                      background: chosen ? 'var(--primary-fixed)' : 'transparent',
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
                      <span style={{
                        display: 'block', fontWeight: 700, fontSize: '0.9rem',
                        fontFamily: 'var(--font-headline)', color: 'var(--on-surface)',
                      }}>
                        {ROLE_OFFER_LABEL[option]}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>
                        {ROLE_OFFER_HINT[option]}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {canOfferClaim && (
            <label
              style={{
                display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                padding: '0.875rem 1rem', borderRadius: 'var(--radius-lg)',
                background: 'var(--surface-container-low)', cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={claimable}
                onChange={e => setClaimable(e.target.checked)}
                style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0, accentColor: 'var(--primary)' }}
              />
              <span>
                <span style={{
                  display: 'block', fontWeight: 700, fontSize: '0.875rem',
                  fontFamily: 'var(--font-headline)', color: 'var(--on-surface)',
                }}>
                  This record is about them
                </span>
                <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
                  Lets them take it over as their own. Your access ends when they
                  do — you&rsquo;ll be offered it back, and it&rsquo;s theirs to keep or not.
                </span>
              </span>
            </label>
          )}
        </div>

        <div style={{
          padding: '0.875rem 1rem', borderTop: '1px solid var(--outline-variant)',
          display: 'flex', gap: '0.625rem', justifyContent: 'flex-end', flexShrink: 0,
        }}>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={loading} disabled={loading}>
            Send invitation
          </Button>
        </div>
      </div>
    </div>
  )

  return ReactDOM.createPortal(modal, document.body)
}

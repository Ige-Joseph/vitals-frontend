import { useState } from 'react'

import { api, ApiError } from '@/lib/api'
import { Button, StatusBanner } from '@/components/ui'
import { ROLE_OFFER_LABEL, type RevokedManager } from './invitation.types'

/**
 * "Ada set this record up for you — keep her access?"
 *
 * The second of the two decisions a claim involves. Taking ownership ended
 * everyone else's access, because once the record's subject owns it, anyone
 * else's access is the subject's decision rather than something inherited from
 * having set the record up first. This is where that decision gets made, while
 * the person is still on the screen and still knows who Ada is — not buried in
 * a settings page nobody opens.
 *
 * One tap is the common case, so keeping is the primary action and the default
 * level is the one they already had. Declining is a real, unpunished option
 * sitting beside it: nobody is asked to justify keeping their own record to
 * themselves.
 */
export function RegrantPanel({
  personId,
  revoked,
  onDone,
}: {
  personId: string
  revoked: RevokedManager[]
  onDone: (keptCount: number) => void
}) {
  /**
   * Per-person choice, seeded with what each already held.
   *
   * Seeded rather than blank because the question is "keep her access?", and
   * the honest default for that question is the access she had a moment ago.
   */
  const [choices, setChoices] = useState<Record<string, 'CAREGIVER' | 'VIEWER' | 'none'>>(
    Object.fromEntries(
      revoked.map(r => [r.userId, r.role === 'VIEWER' ? 'VIEWER' : 'CAREGIVER']),
    ),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const keeping = Object.values(choices).filter(c => c !== 'none').length

  const submit = async () => {
    setSaving(true)
    setError('')

    const grants = Object.entries(choices)
      .filter(([, level]) => level !== 'none')
      .map(([userId, level]) => ({ userId, role: level as 'CAREGIVER' | 'VIEWER' }))

    try {
      // Nobody kept is a decision too, and needs no request — the claim has
      // already revoked them. Skipping the call keeps the ledger honest: a
      // GRANTED event for nobody would be a lie about what happened.
      if (grants.length > 0) {
        await api.post(`/api/v1/persons/${personId}/claim-regrant`, { grants })
      }
      onDone(grants.length)
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Could not restore that access. Please try again.',
      )
      setSaving(false)
    }
  }

  if (revoked.length === 0) return null

  const only = revoked.length === 1 ? revoked[0] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h2 style={{
          fontFamily: 'var(--font-headline)', fontWeight: 800,
          fontSize: '1.15rem', color: 'var(--on-surface)',
        }}>
          {only
            ? `${only.name} set this record up for you`
            : 'These people set this record up for you'}
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginTop: '0.3rem', lineHeight: 1.55 }}>
          It&rsquo;s yours now, so their access is your call. Keep it and nothing
          changes for them; end it and they lose access to the record — nothing
          in it is deleted either way.
        </p>
      </div>

      {error && <StatusBanner type="error" message={error} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {revoked.map(person => {
          const choice = choices[person.userId]
          return (
            <div
              key={person.userId}
              style={{
                padding: '0.875rem 1rem', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--outline-variant)',
                display: 'flex', flexDirection: 'column', gap: '0.625rem',
              }}
            >
              <p style={{
                fontFamily: 'var(--font-headline)', fontWeight: 700,
                fontSize: '0.9rem', color: 'var(--on-surface)',
              }}>
                {person.name}
              </p>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {(['CAREGIVER', 'VIEWER', 'none'] as const).map(level => {
                  const chosen = choice === level
                  return (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={chosen}
                      onClick={() =>
                        setChoices(current => ({ ...current, [person.userId]: level }))
                      }
                      style={{
                        padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-full)',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        fontFamily: 'var(--font-headline)',
                        border: `1px solid ${chosen ? 'var(--primary)' : 'var(--outline-variant)'}`,
                        background: chosen ? 'var(--primary-fixed)' : 'transparent',
                        color: chosen ? 'var(--primary)' : 'var(--on-surface-variant)',
                      }}
                    >
                      {level === 'none' ? 'End access' : ROLE_OFFER_LABEL[level]}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <Button
        variant="primary"
        onClick={submit}
        loading={saving}
        disabled={saving}
        style={{ width: '100%' }}
      >
        {keeping === 0
          ? 'Done — keep it to myself'
          : keeping === revoked.length && only
            ? `Keep ${only.name}'s access`
            : `Save — keeping ${keeping} of ${revoked.length}`}
      </Button>
    </div>
  )
}

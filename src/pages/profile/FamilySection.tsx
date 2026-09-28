import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { EmptyState, Skeleton, StatusBanner } from '@/components/ui'
import { PersonProfile } from './PersonProfile'

/**
 * Family lives inside Profile, not as a sixth navigation item.
 *
 * Two groupings, both always rendered: **Managed** are people with no Vitals
 * account of their own — a baby, a parent — whose records this account looks
 * after. **Connected** are adults who have their own account and have shared
 * theirs. The distinction is not cosmetic: a managed record can be handed over
 * or archived, a connected one belongs to somebody who can revoke you.
 */

export interface PersonListEntry {
  personId: string
  displayName: string
  dateOfBirth: string | null
  gender: string | null
  origin: string
  role: string
  isSelf: boolean
  isClaimed: boolean
}

export interface Capacity {
  managedLimit: number
  managedUsed: number
  connectionLimit: number
  connectionsUsed: number
  firstBabyExempt: boolean
}

const ORIGIN_LABEL: Record<string, string> = {
  SELF: 'You',
  DELIVERY: 'Born through your pregnancy journey',
  BABY_PROFILE: 'Baby profile',
  MANAGED: 'Added by you',
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'You manage this record',
  CAREGIVER: 'You can view and update',
  VIEWER: 'You can view',
}

function PersonRow({
  person,
  onOpen,
  onDisconnect,
  disconnecting = false,
}: {
  person: PersonListEntry
  onOpen: () => void
  onDisconnect?: () => void
  disconnecting?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.5rem' }}>
    <button
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.875rem', width: '100%',
        padding: '0.875rem 1rem', textAlign: 'left', cursor: 'pointer',
        background: 'var(--surface-container-lowest)',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div
        aria-hidden
        style={{
          width: 40, height: 40, borderRadius: 'var(--radius-full)', flexShrink: 0,
          background: 'var(--primary-fixed)', color: 'var(--primary)',
          display: 'grid', placeItems: 'center',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
          {person.isClaimed ? 'person' : 'child_care'}
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.95rem',
          color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {person.displayName}
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>
          {ORIGIN_LABEL[person.origin] ?? person.origin} · {ROLE_LABEL[person.role] ?? person.role}
        </p>
      </div>

      <span className="material-symbols-outlined" style={{ color: 'var(--outline)' }}>
        chevron_right
      </span>
    </button>

    {onDisconnect && (
      // Their record, their consent — and equally yours to end. Leaving needs
      // no permission from the owner.
      <button
        onClick={onDisconnect}
        disabled={disconnecting}
        aria-label={`Disconnect from ${person.displayName}`}
        title={`Disconnect from ${person.displayName}`}
        style={{
          opacity: disconnecting ? 0.5 : 1,
          flexShrink: 0, width: 44, display: 'grid', placeItems: 'center',
          cursor: 'pointer', background: 'var(--surface-container-lowest)',
          border: '1px solid var(--outline-variant)',
          borderRadius: 'var(--radius-lg)', color: 'var(--error)',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
          {disconnecting ? 'hourglass_top' : 'link_off'}
        </span>
      </button>
    )}
    </div>
  )
}

function Group({
  title,
  description,
  people,
  emptyMessage,
  onOpen,
  onDisconnect,
  disconnectingId,
}: {
  title: string
  description: string
  people: PersonListEntry[]
  emptyMessage: string
  onOpen: (personId: string) => void
  onDisconnect?: (person: PersonListEntry) => void
  disconnectingId?: string | null
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      <div>
        <h3 style={{
          fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.95rem',
          color: 'var(--on-surface)',
        }}>
          {title}
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>{description}</p>
      </div>

      {people.length === 0 ? (
        <p style={{
          fontSize: '0.85rem', color: 'var(--on-surface-variant)',
          padding: '0.875rem 1rem', borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--outline-variant)',
        }}>
          {emptyMessage}
        </p>
      ) : (
        people.map(person => (
          <PersonRow
            key={person.personId}
            person={person}
            onOpen={() => onOpen(person.personId)}
            onDisconnect={onDisconnect ? () => onDisconnect(person) : undefined}
            disconnecting={disconnectingId === person.personId}
          />
        ))
      )}
    </section>
  )
}

export function FamilySection() {
  const [people, setPeople] = useState<PersonListEntry[] | null>(null)
  const [capacity, setCapacity] = useState<Capacity | null>(null)
  const [openPersonId, setOpenPersonId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const { user } = useAuthStore()

  const load = async () => {
    try {
      const [list, cap] = await Promise.all([
        api.get<PersonListEntry[]>('/api/v1/persons'),
        api.get<Capacity>('/api/v1/persons/capacity'),
      ])
      setPeople(list)
      setCapacity(cap)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your family')
      setPeople([])
    }
  }

  useEffect(() => {
    void load()
  }, [])

  /**
   * End your own membership. Requires no permission from the owner — they can
   * revoke you, and this is the same right in the other direction.
   */
  const disconnect = async (person: PersonListEntry) => {
    if (!user?.id) return

    const confirmed = window.confirm(
      `Disconnect from ${person.displayName}?

` +
        `You will no longer see their health record. This removes your access ` +
        `only — nothing of theirs is deleted, and they can invite you again.`,
    )
    if (!confirmed) return

    setDisconnecting(person.personId)
    setError('')
    setSuccess('')

    try {
      await api.delete(`/api/v1/persons/${person.personId}/members/${user.id}`)
      setSuccess(`Disconnected from ${person.displayName}`)
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not disconnect')
    } finally {
      setDisconnecting(null)
    }
  }

  if (openPersonId) {
    return (
      <PersonProfile
        personId={openPersonId}
        onBack={() => {
          setOpenPersonId(null)
          void load()
        }}
      />
    )
  }

  if (people === null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Skeleton height={18} width="40%" />
        <Skeleton height={68} />
        <Skeleton height={68} />
      </div>
    )
  }

  // Managed: no account of their own. Connected: an adult who has one.
  const managed = people.filter(p => !p.isSelf && !p.isClaimed)
  const connected = people.filter(p => !p.isSelf && p.isClaimed)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error ? <StatusBanner type="error" message={error} /> : null}
      {success ? <StatusBanner type="success" message={success} /> : null}

      <Group
        title="Managed"
        description="People whose records you look after. They have no Vitals account of their own."
        people={managed}
        emptyMessage="Nobody yet. A baby added through the Mother & Baby journey appears here."
        onOpen={setOpenPersonId}
      />

      <Group
        title="Connected"
        description="Adults with their own Vitals account who have shared their record with you."
        people={connected}
        emptyMessage="Nobody yet. A connection starts with an invitation they accept."
        onOpen={setOpenPersonId}
        onDisconnect={disconnect}
        disconnectingId={disconnecting}
      />

      {capacity && (
        <div style={{
          padding: '0.875rem 1rem', borderRadius: 'var(--radius-lg)',
          background: 'var(--surface-container-low)',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
            Managing {capacity.managedUsed} of {capacity.managedLimit} ·
            {' '}connected to {capacity.connectionsUsed} of {capacity.connectionLimit}
          </p>
          {capacity.firstBabyExempt && (
            <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>
              Your first baby doesn't count towards this.
            </p>
          )}
          {capacity.managedUsed >= capacity.managedLimit && (
            <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>
              Upgrade to manage more people.
            </p>
          )}
        </div>
      )}

      {people.length === 1 && (
        <EmptyState
          icon="family_restroom"
          title="Just you so far"
          description="When you add a baby or someone shares their record with you, they'll appear here."
        />
      )}
    </div>
  )
}

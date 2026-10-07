import { useEffect, useState } from 'react'

import { api, ApiError } from '@/lib/api'
import { Button, Card, EmptyState, Skeleton, StatusBanner } from '@/components/ui'
import { ContextPhoto } from '@/components/ui/ContextPhoto'
import { AddAppointmentModal } from '@/components/appointments/AddAppointmentModal'
import { AppointmentCard } from '@/components/appointments/AppointmentCard'
import { isOpen, type Appointment } from '@/components/appointments/appointment.types'

/**
 * Appointments, for the Person whose record is being viewed.
 *
 * The subject is resolved server-side. This page never sends a personId, so it
 * always reads the caller's own record — the same default every other clinical
 * surface uses. When Family gains a person switcher, one prop threaded through
 * to the query is the whole of what changes here.
 *
 * `embedded` matches MedicationsPage: the page lives inside a My Care tab, and
 * main navigation stays at five items.
 */
export function AppointmentsPage({ embedded, personId }: { embedded?: boolean; personId?: string } = {}) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    setLoadError('')
    try {
      // `all` rather than `upcoming`: this page shows both, and splitting one
      // response is cheaper than two round trips.
      const params = new URLSearchParams({ scope: 'all', limit: '100' })
      if (personId) params.set('personId', personId)
      const data = await api.get<Appointment[]>(`/api/v1/appointments?${params}`)
      setAppointments(data)
      setError('')
    } catch (e) {
      if (!silent) {
        setLoadError(e instanceof ApiError ? e.message : 'Could not load your appointments')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [personId])

  const flash = (message: string) => {
    setSuccess(message)
    setTimeout(() => setSuccess(''), 5000)
  }

  const handleBooked = (appointment: Appointment) => {
    setBooking(false)
    // Shown immediately rather than waiting for the refetch — the server has
    // already confirmed it, and a list that lags behind a confirmation reads
    // like the booking failed.
    setAppointments(current => [appointment, ...current])
    flash('Appointment booked. We’ll remind you before it.')
    void load(true)
    window.dispatchEvent(new Event('vitals:refresh-timeline'))
  }

  /**
   * Cancelling says plainly what it does before it does it.
   *
   * The record is kept either way — what stops is the reminders. Someone
   * hesitating here is usually worried about losing the history, so that is
   * the sentence they get.
   */
  const handleCancel = async (appointment: Appointment) => {
    const confirmed = window.confirm(
      `Cancel "${appointment.carePlan.title}"?\n\n` +
        `The appointment stays on the record as cancelled and its reminders stop. ` +
        `Nothing else is removed.`,
    )
    if (!confirmed) return

    setBusyId(appointment.id)
    setError('')

    try {
      const updated = await api.post<Appointment>(
        `/api/v1/appointments/${appointment.id}/cancel`,
        personId ? { personId } : {},
      )
      setAppointments(current =>
        current.map(a => (a.id === updated.id ? updated : a)),
      )
      flash('Appointment cancelled.')
      window.dispatchEvent(new Event('vitals:refresh-timeline'))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not cancel that appointment')
    } finally {
      setBusyId(null)
    }
  }

  const handleComplete = async (appointment: Appointment) => {
    setBusyId(appointment.id)
    setError('')

    try {
      const updated = await api.post<Appointment>(
        `/api/v1/appointments/${appointment.id}/complete`,
        personId ? { personId } : {},
      )
      setAppointments(current =>
        current.map(a => (a.id === updated.id ? updated : a)),
      )
      flash('Marked as attended.')
      window.dispatchEvent(new Event('vitals:refresh-timeline'))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update that appointment')
    } finally {
      setBusyId(null)
    }
  }

  // Anything still open and ahead is what the reader came for; everything else
  // is history, newest first.
  const now = Date.now()
  const upcoming = appointments
    .filter(a => isOpen(a.status) && new Date(a.startsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())

  const past = appointments
    .filter(a => !upcoming.includes(a))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())

  const bookButton = (
    <Button icon="add" size="sm" onClick={() => setBooking(true)}>
      Book appointment
    </Button>
  )

  return (
    <div style={{ padding: embedded ? 0 : 'clamp(1rem, 4vw, 2rem)', maxWidth: 680, margin: '0 auto' }}>
      {!embedded && (
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}
          className="animate-fade-up"
        >
          <div>
            <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--on-surface)' }}>
              Appointments
            </h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
              Keep track of visits and get reminded before them.
            </p>
          </div>
          {bookButton}
        </div>
      )}

      {embedded && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          {bookButton}
        </div>
      )}

      {success && (
        <div style={{ marginBottom: '1rem' }}>
          <StatusBanner type="success" message={success} />
        </div>
      )}
      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <StatusBanner type="error" message={error} />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} height={120} style={{ borderRadius: 'var(--radius-xl)' }} />
          ))}
        </div>
      ) : loadError ? (
        <Card style={{ padding: '2.5rem 1.5rem' }}>
          <EmptyState
            icon="wifi_off"
            title="Couldn't load appointments"
            description={loadError}
            action={<Button icon="refresh" onClick={() => void load()}>Try again</Button>}
          />
        </Card>
      ) : appointments.length === 0 ? (
        <Card style={{ padding: '2.5rem 1.5rem' }}>
          <ContextPhoto
            src="/images/contextual/appointment-context.webp"
            srcSet="/images/contextual/appointment-context-480.webp 480w, /images/contextual/appointment-context.webp 1024w"
            sizes="(max-width: 680px) calc(100vw - 4rem), 600px"
            width={1024}
            height={684}
            alt="A child being examined during a routine visit."
            className="appointments-empty-photo"
          />
          <EmptyState
            icon="event"
            title="No appointments yet"
            description="Add a visit and we'll remind you before it — a day ahead and an hour ahead, unless you choose otherwise."
            action={
              <Button icon="add" onClick={() => setBooking(true)}>
                Book appointment
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <p
                style={{
                  fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.8125rem',
                  color: 'var(--on-surface-variant)', letterSpacing: '0.05em',
                  textTransform: 'uppercase', marginBottom: '0.75rem',
                }}
              >
                Upcoming ({upcoming.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {upcoming.map(a => (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    onCancel={handleCancel}
                    onComplete={handleComplete}
                    busy={busyId === a.id}
                  />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.8125rem',
                  color: 'var(--on-surface-variant)', letterSpacing: '0.05em',
                  textTransform: 'uppercase', marginBottom: '0.75rem',
                }}
              >
                Past ({past.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {past.map(a => (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    onCancel={handleCancel}
                    onComplete={handleComplete}
                    busy={busyId === a.id}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {booking && (
        <AddAppointmentModal
          personId={personId}
          onSuccess={handleBooked}
          onCancel={() => setBooking(false)}
        />
      )}
    </div>
  )
}

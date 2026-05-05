import React, { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { Button, Card, EmptyState, Skeleton, StatusBanner, Badge } from '@/components/ui'

type CareEventStatus = 'PENDING' | 'DONE' | 'SKIPPED' | 'MISSED'

interface CareEvent {
  id: string
  carePlanId: string
  eventType: 'MEDICATION_DOSE' | 'ANC_VISIT' | 'ANC_SCAN' | 'VACCINATION' | string
  title: string
  description?: string | null
  scheduledFor: string
  status: CareEventStatus
  metadata?: Record<string, unknown>
  carePlan?: {
    type: string
    title: string
  }
}

const EVENT_ICONS: Record<string, string> = {
  MEDICATION_DOSE: 'pill',
  ANC_VISIT: 'pregnant_woman',
  ANC_SCAN: 'biotech',
  VACCINATION: 'vaccines',
}

const EVENT_LABELS: Record<string, string> = {
  MEDICATION_DOSE: 'Medication',
  ANC_VISIT: 'ANC visit',
  ANC_SCAN: 'Scan',
  VACCINATION: 'Vaccination',
}

function formatDateTime(value: string) {
  const date = new Date(value)

  return {
    date: date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

function isToday(value: string) {
  const d = new Date(value)
  const now = new Date()

  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function CareEventCard({
  event,
  onUpdate,
  updatingId,
}: {
  event: CareEvent
  onUpdate: (id: string, status: 'DONE' | 'SKIPPED') => Promise<void>
  updatingId: string | null
}) {
  const { date, time } = formatDateTime(event.scheduledFor)
  const icon = EVENT_ICONS[event.eventType] ?? 'event'
  const label = EVENT_LABELS[event.eventType] ?? event.eventType
  const updating = updatingId === event.id

  return (
    <Card style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 'var(--radius-md)',
            background: 'var(--primary-fixed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>
            {icon}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '0.75rem',
              alignItems: 'flex-start',
              marginBottom: '0.375rem',
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  color: 'var(--on-surface)',
                  lineHeight: 1.35,
                }}
              >
                {event.title}
              </p>

              {event.description && (
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--on-surface-variant)',
                    marginTop: '0.2rem',
                    lineHeight: 1.45,
                  }}
                >
                  {event.description}
                </p>
              )}
            </div>

            <Badge variant={event.status === 'PENDING' ? 'primary' : 'neutral'}>
              {event.status}
            </Badge>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              alignItems: 'center',
              marginTop: '0.625rem',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--on-surface-variant)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span className="material-symbols-outlined icon-sm" style={{ fontSize: 15 }}>
                schedule
              </span>
              {isToday(event.scheduledFor) ? 'Today' : date} · {time}
            </span>

            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--primary)',
                background: 'var(--primary-fixed)',
                padding: '0.1875rem 0.5rem',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {label}
            </span>
          </div>

          {event.status === 'PENDING' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem' }}>
              <Button
                size="sm"
                loading={updating}
                disabled={updating}
                onClick={() => onUpdate(event.id, 'DONE')}
              >
                Done
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={updating}
                onClick={() => onUpdate(event.id, 'SKIPPED')}
              >
                Skip
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export function CareTimeline() {
  const [events, setEvents] = useState<CareEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get<CareEvent[]>('/api/v1/care/events?status=PENDING')
      setEvents(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load care events')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])


    useEffect(() => {
    const handler = () => loadEvents()

    window.addEventListener('vitals:refresh-timeline', handler)

    return () => {
      window.removeEventListener('vitals:refresh-timeline', handler)
    }
     }, [loadEvents])

  const groupedEvents = events.reduce<Record<string, CareEvent[]>>((groups, event) => {
    const date = new Date(event.scheduledFor)
    const now = new Date()

    const isSameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()

    const tomorrow = new Date()
    tomorrow.setDate(now.getDate() + 1)

    const isTomorrow =
      date.getFullYear() === tomorrow.getFullYear() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getDate() === tomorrow.getDate()

    const key = isSameDay
      ? 'Today'
      : isTomorrow
        ? 'Tomorrow'
        : date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })

    if (!groups[key]) groups[key] = []
    groups[key].push(event)

    return groups
  }, {})


if (loading) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {[1, 2, 3].map(i => (
        <Skeleton key={i} height={110} style={{ borderRadius: 'var(--radius-xl)' }} />
      ))}
    </div>
  )
}

return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <div>
      <h2
        style={{
          fontFamily: 'var(--font-headline)',
          fontWeight: 800,
          fontSize: '1.125rem',
          color: 'var(--on-surface)',
        }}
      >
        Care timeline
      </h2>
      <p
        style={{
          color: 'var(--on-surface-variant)',
          fontSize: '0.875rem',
          marginTop: '0.2rem',
        }}
      >
        Upcoming medication doses, pregnancy visits, scans, and vaccinations.
      </p>
    </div>

    {error && <StatusBanner type="error" message={error} />}
    {success && <StatusBanner type="success" message={success} />}

    {events.length === 0 ? (
      <Card style={{ padding: '2rem 1.25rem' }}>
        <EmptyState
          icon="event_available"
          title="No pending care events"
          description="Your upcoming care events will appear here."
        />
      </Card>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {Object.entries(groupedEvents).map(([group, groupEvents]) => (
          <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <p
              style={{
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: '0.8125rem',
                color: 'var(--on-surface-variant)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: '0.5rem',
              }}
            >
              {group}
            </p>

            {groupEvents.map(event => (
              <CareEventCard
                key={event.id}
                event={event}
                updatingId={updatingId}
                onUpdate={async (id, status) => {
                  setUpdatingId(id)
                  setError('')
                  setSuccess('')

                  try {
                    await api.patch(`/api/v1/care/events/${id}/status`, { status })

                    setEvents(prev => prev.filter(e => e.id !== id))

                    setSuccess(
                      status === 'DONE'
                        ? 'Event marked as done.'
                        : 'Event skipped.'
                    )

                    setTimeout(() => setSuccess(''), 3000)
                  } catch (err) {
                    setError(
                      err instanceof ApiError
                        ? err.message
                        : 'Failed to update event'
                    )
                  } finally {
                    setUpdatingId(null)
                  }
                }}
              />
            ))}
          </div>
        ))}
      </div>
    )}

    <Button variant="ghost" size="sm" onClick={loadEvents} icon="refresh">
      Refresh timeline
    </Button>
  </div>
)
}
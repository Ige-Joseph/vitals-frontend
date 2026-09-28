import { useState } from 'react'

import { Button } from '@/components/ui'
import {
  formatWhen,
  isOpen,
  relativeWhen,
  STATUS_LABELS,
  STATUS_TONE,
  type Appointment,
} from './appointment.types'

/**
 * One appointment.
 *
 * Actions appear only while there is something to act on — a cancelled or
 * attended appointment keeps its card and loses its buttons, because the
 * record stays either way and only the choices go.
 */
export function AppointmentCard({
  appointment,
  onCancel,
  onComplete,
  busy,
}: {
  appointment: Appointment
  onCancel: (appointment: Appointment) => void
  onComplete: (appointment: Appointment) => void
  busy: boolean
}) {
  const [showNotes, setShowNotes] = useState(false)

  const tone = STATUS_TONE[appointment.status]
  const settled = !isOpen(appointment.status)

  const detail = [appointment.clinician, appointment.specialty, appointment.location]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      style={{
        padding: '1rem 1.125rem',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--surface-container-lowest)',
        border: '1px solid var(--outline-variant)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        // A settled appointment stays legible but stops competing with the
        // ones that still need attention.
        opacity: settled ? 0.75 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--on-surface)',
              textDecoration: appointment.status === 'CANCELLED' ? 'line-through' : 'none',
            }}
          >
            {appointment.carePlan.title}
          </p>

          {detail && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.15rem' }}>
              {detail}
            </p>
          )}
        </div>

        <span
          style={{
            flexShrink: 0,
            padding: '0.2rem 0.55rem',
            borderRadius: 'var(--radius-full)',
            background: tone.background,
            color: tone.color,
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {STATUS_LABELS[appointment.status]}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span
          className="material-symbols-outlined"
          aria-hidden
          style={{ fontSize: 18, color: 'var(--primary)' }}
        >
          event
        </span>
        <span style={{ fontSize: '0.875rem', color: 'var(--on-surface)', fontWeight: 600 }}>
          {formatWhen(appointment.startsAt)}
        </span>
        <span style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>
          · {appointment.durationMinutes} min
        </span>
        {isOpen(appointment.status) && (
          <span style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>
            · {relativeWhen(appointment.startsAt)}
          </span>
        )}
      </div>

      {appointment.status === 'CANCELLED' && appointment.cancellationReason && (
        <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>
          Cancelled: {appointment.cancellationReason}
        </p>
      )}

      {(appointment.reason || appointment.notes) && (
        <div>
          <button
            type="button"
            onClick={() => setShowNotes(current => !current)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--primary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              fontFamily: 'var(--font-headline)',
            }}
          >
            {showNotes ? 'Hide details' : 'Details'}
          </button>

          {showNotes && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {appointment.reason && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  <strong style={{ color: 'var(--on-surface)' }}>Reason:</strong> {appointment.reason}
                </p>
              )}
              {appointment.notes && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  <strong style={{ color: 'var(--on-surface)' }}>Notes:</strong> {appointment.notes}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {isOpen(appointment.status) && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button
            size="sm"
            variant="secondary"
            icon="check"
            disabled={busy}
            onClick={() => onComplete(appointment)}
          >
            Attended
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon="close"
            disabled={busy}
            onClick={() => onCancel(appointment)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}

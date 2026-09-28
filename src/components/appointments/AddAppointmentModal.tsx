import { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import { api, ApiError } from '@/lib/api'
import { Button, Input, StatusBanner } from '@/components/ui'

import {
  DURATIONS,
  localInputValue,
  REMINDER_LEADS,
  type Appointment,
} from './appointment.types'

/**
 * Book an appointment.
 *
 * The time is entered as local wall-clock — a `datetime-local` input carries no
 * timezone, which is exactly what someone typing "next Tuesday at ten" means.
 * It becomes an absolute instant once, on submit, and the server stores that.
 *
 * Reminder leads are offered rather than typed. Any of them may already have
 * passed by the time the appointment is booked, and that is not an error: the
 * server writes the ones still ahead and quietly drops the rest, so booking
 * something for this afternoon with "a day before" ticked still works.
 */
export function AddAppointmentModal({
  onSuccess,
  onCancel,
  personId,
}: {
  onSuccess: (appointment: Appointment) => void
  onCancel: () => void
  personId?: string
}) {
  const tomorrowMorning = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(9, 0, 0, 0)
    return d
  }

  const [form, setForm] = useState({
    title: '',
    startsAt: localInputValue(tomorrowMorning()),
    durationMinutes: 30,
    clinician: '',
    specialty: '',
    location: '',
    reason: '',
    notes: '',
  })

  const [leads, setLeads] = useState<number[]>([1440, 60])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Guards the gap between click and state update — a second submit in that
  // window would book the appointment twice.
  const submittingRef = useRef(false)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const setField = (key: string, value: string | number) =>
    setForm(current => ({ ...current, [key]: value }))

  const toggleLead = (minutes: number) =>
    setLeads(current =>
      current.includes(minutes)
        ? current.filter(m => m !== minutes)
        : [...current, minutes],
    )

  const submit = async () => {
    if (submittingRef.current) return

    if (!form.title.trim()) {
      setError('Give the appointment a name so it is recognisable in a list.')
      return
    }

    const startsAt = new Date(form.startsAt)
    if (Number.isNaN(startsAt.getTime())) {
      setError('That date and time could not be read.')
      return
    }
    if (startsAt.getTime() <= Date.now()) {
      setError('Choose a time in the future.')
      return
    }

    submittingRef.current = true
    setLoading(true)
    setError('')

    try {
      const appointment = await api.post<Appointment>('/api/v1/appointments', {
        ...(personId ? { personId } : {}),
        title: form.title.trim(),
        startsAt: startsAt.toISOString(),
        durationMinutes: form.durationMinutes,
        // Empty strings are absent fields, not empty values.
        clinician: form.clinician.trim() || undefined,
        specialty: form.specialty.trim() || undefined,
        location: form.location.trim() || undefined,
        reason: form.reason.trim() || undefined,
        notes: form.notes.trim() || undefined,
        reminderLeadMinutes: leads,
      })

      onSuccess(appointment)
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Could not book this appointment. Please try again.',
      )
      submittingRef.current = false
      setLoading(false)
    }
  }

  const fieldRow: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '0.875rem',
  }

  const modal = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(24,28,32,0.58)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
          width: '100%',
          maxWidth: 680,
          maxHeight: '94dvh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeUp 0.28s cubic-bezier(0.34,1.2,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            padding: '1rem 1.25rem 0.75rem',
            borderBottom: '1px solid var(--outline-variant)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 38,
              height: 4,
              borderRadius: 999,
              background: 'var(--outline-variant)',
              margin: '0 auto 1rem',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--primary)',
                  marginBottom: '0.25rem',
                }}
              >
                Appointment
              </p>
              <h2
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontWeight: 900,
                  fontSize: '1.35rem',
                  color: 'var(--on-surface)',
                  lineHeight: 1.15,
                }}
              >
                Book an appointment
              </h2>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                We&rsquo;ll remind you before it.
              </p>
            </div>

            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              aria-label="Close"
              style={{
                background: 'var(--surface-container)',
                border: '1px solid var(--outline-variant)',
                cursor: loading ? 'not-allowed' : 'pointer',
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--on-surface-variant)',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined icon-sm">close</span>
            </button>
          </div>
        </div>

        <div
          style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '1rem',
            paddingBottom: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {error && <StatusBanner type="error" message={error} />}

          <Input
            label="What is it?"
            placeholder="Cardiology follow-up"
            value={form.title}
            onChange={e => setField('title', e.target.value)}
            maxLength={200}
          />

          <div style={fieldRow}>
            <Input
              label="When"
              type="datetime-local"
              value={form.startsAt}
              min={localInputValue(new Date())}
              onChange={e => setField('startsAt', e.target.value)}
            />

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--on-surface-variant)',
                  marginBottom: '0.375rem',
                }}
              >
                How long
              </label>
              <select
                value={form.durationMinutes}
                onChange={e => setField('durationMinutes', Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.875rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--outline-variant)',
                  background: 'var(--surface-container-lowest)',
                  color: 'var(--on-surface)',
                  fontSize: '0.9375rem',
                  fontFamily: 'inherit',
                }}
              >
                {DURATIONS.map(d => (
                  <option key={d.minutes} value={d.minutes}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={fieldRow}>
            <Input
              label="Who you're seeing"
              placeholder="Dr Adeyemi"
              value={form.clinician}
              onChange={e => setField('clinician', e.target.value)}
              maxLength={200}
            />
            <Input
              label="Specialty"
              placeholder="Cardiology"
              value={form.specialty}
              onChange={e => setField('specialty', e.target.value)}
              maxLength={120}
            />
          </div>

          <Input
            label="Where"
            placeholder="Lagos University Teaching Hospital"
            value={form.location}
            onChange={e => setField('location', e.target.value)}
            maxLength={300}
          />

          <Input
            label="Reason (optional)"
            placeholder="Six-month review"
            value={form.reason}
            onChange={e => setField('reason', e.target.value)}
            maxLength={500}
          />

          <Input
            label="Notes (optional)"
            placeholder="Bring the previous ECG"
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            maxLength={2000}
          />

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--on-surface-variant)',
                marginBottom: '0.5rem',
              }}
            >
              Remind me
            </label>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {REMINDER_LEADS.map(lead => {
                const chosen = leads.includes(lead.minutes)
                return (
                  <button
                    key={lead.minutes}
                    type="button"
                    aria-pressed={chosen}
                    onClick={() => toggleLead(lead.minutes)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      fontFamily: 'var(--font-headline)',
                      border: `1px solid ${chosen ? 'var(--primary)' : 'var(--outline-variant)'}`,
                      background: chosen ? 'var(--primary-fixed)' : 'transparent',
                      color: chosen ? 'var(--primary)' : 'var(--on-surface-variant)',
                    }}
                  >
                    {lead.label}
                  </button>
                )
              })}
            </div>

            <p style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', marginTop: '0.5rem' }}>
              Pick up to five. Any that have already passed by the time you save
              are simply skipped.
            </p>
          </div>
        </div>

        <div
          style={{
            padding: '0.875rem 1rem',
            borderTop: '1px solid var(--outline-variant)',
            display: 'flex',
            gap: '0.625rem',
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}
        >
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={loading} disabled={loading}>
            Book appointment
          </Button>
        </div>
      </div>
    </div>
  )

  return ReactDOM.createPortal(modal, document.body)
}

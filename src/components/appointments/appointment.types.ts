/**
 * An appointment, as the API returns it.
 *
 * The subject is a Person, never an account — `personId` is whose record this
 * belongs to, and it is not the caller's id. The server resolves access before
 * returning anything, so a row arriving here is one this reader is allowed to
 * see; nothing in this folder re-decides that.
 */
export interface Appointment {
  id: string
  carePlanId: string
  personId: string
  startsAt: string
  durationMinutes: number
  clinician: string | null
  specialty: string | null
  location: string | null
  reason: string | null
  notes: string | null
  status: AppointmentStatus
  reminderLeadMinutes: number[]
  cancelledAt: string | null
  cancellationReason: string | null
  completedAt: string | null
  /** The care plan is the engine root, and carries the title. */
  carePlan: { id: string; title: string; status: string }
}

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'MISSED'

/**
 * How each status reads, and what it looks like.
 *
 * MISSED is deliberately not styled as an error. It is a fact about a visit
 * that did not happen, not a fault of the person reading it, and a red alarm
 * on a health record is a poor way to say "this passed".
 */
export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Scheduled',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Attended',
  CANCELLED: 'Cancelled',
  MISSED: 'Missed',
}

export const STATUS_TONE: Record<
  AppointmentStatus,
  { background: string; color: string }
> = {
  SCHEDULED: { background: 'var(--primary-fixed)', color: 'var(--primary)' },
  CONFIRMED: { background: 'var(--tertiary-fixed)', color: 'var(--tertiary)' },
  COMPLETED: { background: 'var(--tertiary-fixed)', color: 'var(--tertiary)' },
  CANCELLED: { background: 'var(--surface-container)', color: 'var(--on-surface-variant)' },
  MISSED: { background: 'var(--surface-container)', color: 'var(--on-surface-variant)' },
}

/** Statuses that can still be acted on. Everything else is settled. */
export const isOpen = (status: AppointmentStatus) =>
  status === 'SCHEDULED' || status === 'CONFIRMED'

/**
 * Reminder lead times offered in the form.
 *
 * The API accepts any minute value; these are the ones worth offering. A lead
 * that has already passed by the time you save simply produces no reminder,
 * which is why booking something for this afternoon with a day-ahead lead
 * selected is allowed rather than rejected.
 */
export const REMINDER_LEADS: { minutes: number; label: string }[] = [
  { minutes: 10_080, label: 'A week before' },
  { minutes: 2880, label: 'Two days before' },
  { minutes: 1440, label: 'A day before' },
  { minutes: 180, label: 'Three hours before' },
  { minutes: 60, label: 'An hour before' },
  { minutes: 30, label: '30 minutes before' },
]

export const DURATIONS: { minutes: number; label: string }[] = [
  { minutes: 15, label: '15 minutes' },
  { minutes: 30, label: '30 minutes' },
  { minutes: 45, label: '45 minutes' },
  { minutes: 60, label: '1 hour' },
  { minutes: 90, label: '1 hour 30' },
  { minutes: 120, label: '2 hours' },
]

/** "Mon 14 Sep, 10:00" — the whole of what a reader needs at a glance. */
export const formatWhen = (iso: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  return date.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * How far away it is, in words, or how long ago it was.
 *
 * Deliberately coarse. "In 3 days" is what someone wants from a list; the
 * exact timestamp is right beside it for anyone who wants precision.
 */
export const relativeWhen = (iso: string): string => {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''

  const diffMs = then - Date.now()
  const future = diffMs >= 0
  const minutes = Math.round(Math.abs(diffMs) / 60_000)

  if (minutes < 60) return future ? `In ${minutes} min` : `${minutes} min ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return future ? `In ${hours}h` : `${hours}h ago`

  const days = Math.round(hours / 24)
  if (days < 30) return future ? `In ${days} day${days === 1 ? '' : 's'}` : `${days} day${days === 1 ? '' : 's'} ago`

  const months = Math.round(days / 30)
  return future ? `In ${months} month${months === 1 ? '' : 's'}` : `${months} month${months === 1 ? '' : 's'} ago`
}

/**
 * The value a `datetime-local` input wants, from now plus an offset.
 *
 * That input has no timezone: it reads and writes local wall-clock time, which
 * is what someone booking an appointment means. Converting to an absolute
 * instant happens on submit, once, via `new Date(value)`.
 */
export const localInputValue = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

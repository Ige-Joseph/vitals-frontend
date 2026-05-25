import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import { Card, Button, Badge, StatusBanner } from '@/components/ui'
import { usePushNotifications } from '@/hooks/usePushNotifications'



interface Usage {
  symptomChecks: { used: number; limit: number }
  drugDetections: { used: number; limit: number }
}

interface CalendarSyncSummary {
  connected: boolean
  failedSyncs: number
  accountEmail?: string | null
}

interface UserProfile {
  firstName?: string
  lastName?: string
  email?: string
  profile?: {
    gender?: string
    country?: string
    city?: string
    phoneNumber?: string
    dateOfBirth?: string
    bloodGroup?: string
    genotype?: string
    heightCm?: number
    weightKg?: number
    allergies?: string[]
    existingConditions?: string[]
    currentMedications?: string[]
    disabilities?: string[]
    smokingStatus?: string
    alcoholUse?: string
    timezone?: string
    selectedJourney?: string
  }
}

// ── helpers ────────────────────────────────────────────────────────────────────

const splitList = (value: string) =>
  value.split(',').map(v => v.trim()).filter(Boolean)

// ── display formatters ─────────────────────────────────────────────────────────

const prettyGender: Record<string, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  NON_BINARY: 'Non-binary',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
}

const prettySmoking: Record<string, string> = {
  never: 'Never',
  former: 'Former smoker',
  occasional: 'Occasional',
  regular: 'Regular',
}

const prettyAlcohol: Record<string, string> = {
  none: 'None',
  occasional: 'Occasional',
  moderate: 'Moderate',
  heavy: 'Heavy',
}

const prettyJourney: Record<string, string> = {
  MEDICATION: 'Medication',
  PREGNANCY: 'Pregnancy',
  VACCINATION: 'Vaccination',
}

const fmt = (map: Record<string, string>, value?: string) =>
  value ? map[value] ?? value : undefined

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <label
        style={{
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--on-surface-variant)',
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  fontSize: '0.9rem',
  color: 'var(--on-surface)',
  background: 'var(--surface-container)',
  border: '1px solid var(--outline-variant)',
  borderRadius: 'var(--radius-lg)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
}

function Input({
  value,
  onChange,
  type = 'text',
  placeholder,
  step,
  autoComplete,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  step?: string
  autoComplete?: string
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      step={step}
      autoComplete={autoComplete}
      onChange={e => onChange(e.target.value)}
      style={inputStyle}
      onFocus={e => {
        e.currentTarget.style.borderColor = 'var(--primary)'
        e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)'
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = 'var(--outline-variant)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    />
  )
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
  placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
      onFocus={e => {
        e.currentTarget.style.borderColor = 'var(--primary)'
        e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)'
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = 'var(--outline-variant)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function Textarea({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      rows={2}
      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
      onFocus={e => {
        e.currentTarget.style.borderColor = 'var(--primary)'
        e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)'
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = 'var(--outline-variant)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    />
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-headline)',
        fontWeight: 700,
        fontSize: '0.875rem',
        color: 'var(--on-surface-variant)',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        marginBottom: '1rem',
      }}
    >
      {label}
    </p>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value?: string | number | string[]
}) {
  const display = Array.isArray(value)
    ? value.length ? value.join(', ') : '—'
    : value || '—'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.625rem 0',
        borderBottom: '1px solid var(--outline-variant)',
      }}
    >
      <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--on-surface)',
          textAlign: 'right',
          wordBreak: 'break-word',
        }}
      >
        {display}
      </span>
    </div>
  )
}

// ── collapsible card ──────────────────────────────────────────────────────────

function CollapsibleCard({
  title,
  open,
  onToggle,
  children,
  className,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card style={{ padding: '1.25rem' }} className={className}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: open ? '1rem' : 0,
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-headline)',
            fontWeight: 700,
            fontSize: '0.875rem',
            color: 'var(--on-surface-variant)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          {title}
        </p>
        <span
          className="material-symbols-outlined"
          style={{ color: 'var(--on-surface-variant)', fontSize: '1.25rem', flexShrink: 0 }}
        >
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && <div>{children}</div>}
    </Card>
  )
}

// ── skeleton ───────────────────────────────────────────────────────────────────

function Skeleton({ width = '100%', height = '1rem', radius = 'var(--radius-lg)' }: {
  width?: string | number
  height?: string | number
  radius?: string
}) {
  return (
    <div style={{
      width,
      height,
      borderRadius: radius,
      background: 'var(--surface-container-high)',
      animation: 'skeleton-pulse 1.6s ease-in-out infinite',
    }} />
  )
}

// ── date formatter ─────────────────────────────────────────────────────────────

const prettyDate = (iso: string) => {
  if (!iso) return undefined
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── completion calculator ──────────────────────────────────────────────────────

type FormValues = Record<string, string>

const COMPLETION_FIELDS = [
  'firstName',
  'lastName',
  'gender',
  'country',
  'city',
  'phoneNumber',
  'dateOfBirth',
  'bloodGroup',
  'genotype',
  'heightCm',
  'weightKg',
  'allergies',
  'existingConditions',
  'currentMedications',
  'disabilities',
  'smokingStatus',
  'alcoholUse',
] as const

const calcCompletion = (form: FormValues) => {
  const filled = COMPLETION_FIELDS.filter(
    key => String(form[key] ?? '').trim() !== ''
  ).length
  return Math.round((filled / COMPLETION_FIELDS.length) * 100)
}

export function ProfilePage() {
  const { user, logout } = useAuthStore()
  const { pushState, requestPermissionAndRegister } = usePushNotifications()
  const [usage, setUsage] = useState<Usage | null>(null)

  // ── Google Calendar state ──────────────────────────────────────────────────
  const [calendarSummary, setCalendarSummary] = useState<CalendarSyncSummary | null>(null)
  const [isRetryingSync, setIsRetryingSync] = useState(false)

  // derived — calendarSummary is the single source of truth
  const calendarConnected = calendarSummary?.connected ?? false
  const failedSyncs = calendarSummary?.failedSyncs ?? 0

  const [openSections, setOpenSections] = useState({
    medical: false,
    lifestyle: false,
    notifications: false,
    calendar: false,
    usage: false,
  })

  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingVerification, setIsSendingVerification] = useState(false)
  const [isVerificationCooldown, setIsVerificationCooldown] = useState(false)
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    country: '',
    city: '',
    phoneNumber: '',
    dateOfBirth: '',
    bloodGroup: '',
    genotype: '',
    heightCm: '',
    weightKg: '',
    allergies: '',
    existingConditions: '',
    currentMedications: '',
    disabilities: '',
    smokingStatus: '',
    alcoholUse: '',
    timezone: '',
    selectedJourney: '',
  })

  const set = (key: keyof typeof form) => (value: string) => {
    setSuccess('')
    setError('')
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // snapshot form on entering edit so Cancel can restore it
  const [snapshot, setSnapshot] = useState<typeof form | null>(null)

  const startEditing = () => {
    setSnapshot(form)
    setSuccess('')
    setError('')
    setIsEditing(true)
  }

  const cancelEditing = () => {
    if (snapshot) setForm(snapshot)
    setSuccess('')
    setError('')
    setIsEditing(false)
  }

  useEffect(() => {
    api
      .get<UserProfile>('/api/v1/users/profile')
      .then((r: UserProfile) => {
        setForm({
          firstName: r.firstName ?? '',
          lastName: r.lastName ?? '',
          gender: r.profile?.gender ?? '',
          country: r.profile?.country ?? '',
          city: r.profile?.city ?? '',
          phoneNumber: r.profile?.phoneNumber ?? '',
          dateOfBirth: r.profile?.dateOfBirth
            ? r.profile.dateOfBirth.slice(0, 10)
            : '',
          bloodGroup: r.profile?.bloodGroup ?? '',
          genotype: r.profile?.genotype ?? '',
          heightCm: r.profile?.heightCm?.toString() ?? '',
          weightKg: r.profile?.weightKg?.toString() ?? '',
          allergies: r.profile?.allergies?.join(', ') ?? '',
          existingConditions:
            r.profile?.existingConditions?.join(', ') ?? '',
          currentMedications:
            r.profile?.currentMedications?.join(', ') ?? '',
          disabilities: r.profile?.disabilities?.join(', ') ?? '',
          smokingStatus: r.profile?.smokingStatus ?? '',
          alcoholUse: r.profile?.alcoholUse ?? '',
          timezone: r.profile?.timezone ?? '',
          selectedJourney: r.profile?.selectedJourney ?? '',
        })

        // silently sync timezone if backend doesn't have it yet
        if (!r.profile?.timezone) {
          const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
          api.patch('/api/v1/users/profile', { timezone: detected }).catch(() => {})
        }
      })
      .catch(() => {
        setError('Could not load your profile. Please refresh.')
      })
      .finally(() => setIsLoadingProfile(false))

    api.get<Usage>('/api/v1/usage').then(setUsage).catch(() => {
      // non-fatal: usage section simply won't render
    })

    // ── Google Calendar: handle OAuth redirect & fetch sync summary ──────────
    const params = new URLSearchParams(window.location.search)

    const calendarRedirect = params.get('calendar') === 'connected'
    if (calendarRedirect) {
      const url = new URL(window.location.href)
      url.searchParams.delete('calendar')
      window.history.replaceState({}, '', url.toString())
    }

    api
      .get<CalendarSyncSummary>('/api/v1/calendar/sync/summary')
      .then((data) => {
        setCalendarSummary(data)
        // show banner only once backend confirms the connection landed
        if (calendarRedirect && data.connected) {
          setSuccess('Google Calendar connected successfully')
          setOpenSections(prev => ({ ...prev, calendar: true }))
        }
      })
      .catch(() => {
        // non-fatal: calendar section degrades gracefully if summary fails
      })
  }, [])

  // clean up cooldown timer if component unmounts mid-countdown
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
    }
  }, [])

  const completion = useMemo(() => calcCompletion(form), [form])

  const completionColor = completion === 100
    ? '#16a34a'
    : completion >= 60
    ? 'var(--primary)'
    : 'var(--tertiary)'

  if (isLoadingProfile) {
    return (
      <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <style>{`@keyframes skeleton-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

        {/* user card skeleton */}
        <Card style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Skeleton width={56} height={56} radius="50%" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Skeleton width="50%" height="1rem" />
              <Skeleton width="70%" height="0.875rem" />
              <Skeleton width="30%" height="1.25rem" radius="999px" />
            </div>
          </div>
        </Card>

        {/* completion skeleton */}
        <Card style={{ padding: '1.25rem' }}>
          <Skeleton width="40%" height="0.75rem" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '1rem' }}>
            <Skeleton width={86} height={86} radius="50%" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Skeleton width="90%" height="0.875rem" />
              <Skeleton width="70%" height="0.875rem" />
            </div>
          </div>
        </Card>

        {/* section skeletons */}
        {[7, 8, 2].map((rows, i) => (
          <Card key={i} style={{ padding: '1.25rem' }}>
            <Skeleton width="35%" height="0.75rem" />
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: rows }).map((_, j) => (
                <div key={j} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.625rem', borderBottom: '1px solid var(--outline-variant)' }}>
                  <Skeleton width="35%" height="0.875rem" />
                  <Skeleton width="40%" height="0.875rem" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      await api.patch('/api/v1/users/profile', {
        firstName: form.firstName,
        lastName: form.lastName,
        gender: form.gender || undefined,
        country: form.country || undefined,
        city: form.city || undefined,
        phoneNumber: form.phoneNumber || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        bloodGroup: form.bloodGroup || undefined,
        genotype: form.genotype || undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        allergies: splitList(form.allergies),
        existingConditions: splitList(form.existingConditions),
        currentMedications: splitList(form.currentMedications),
        disabilities: splitList(form.disabilities),
        smokingStatus: form.smokingStatus || undefined,
        alcoholUse: form.alcoholUse || undefined,
        timezone: form.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      })

      setSuccess('Profile updated successfully')
      setIsEditing(false)
    } catch {
      setError('Could not update profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResendVerification = async () => {
    setIsSendingVerification(true)
    setError('')
    setSuccess('')

    try {
      await api.post<null>('/api/v1/auth/resend-verification', {})
      setSuccess('Verification email sent successfully.')
      setIsVerificationCooldown(true)
      cooldownTimerRef.current = setTimeout(() => setIsVerificationCooldown(false), 60_000)
    } catch {
      setError('Could not send verification email.')
    } finally {
      setIsSendingVerification(false)
    }
  }

  const handleConnectGoogleCalendar = async () => {
    setIsConnectingCalendar(true)
    setError('')
    setSuccess('')

    try {
      const result = await api.get<{ url: string }>('/api/v1/calendar/google/connect')
      window.location.href = result.url
    } catch {
      setError('Could not start Google Calendar connection.')
      setIsConnectingCalendar(false)
    }
  }

  // ── push notification UI config ──────────────────────────────────────────────

  const PUSH_UI = {
    idle: {
      icon: 'notifications',
      label: 'Enable reminders',
      color: 'var(--primary)',
      bg: 'var(--primary-fixed)',
      action: true,
    },
    requesting: {
      icon: 'hourglass_top',
      label: 'Requesting…',
      color: 'var(--outline)',
      bg: 'var(--surface-container)',
      action: false,
    },
    enabled: {
      icon: 'notifications_active',
      label: 'Reminders on',
      color: '#16a34a',
      bg: '#dcfce7',
      action: false,
    },
    denied: {
      icon: 'notifications_off',
      label: 'Blocked by browser',
      color: 'var(--error)',
      bg: 'var(--error-container)',
      action: false,
    },
    unsupported: {
      icon: 'notifications_off',
      label: 'Not supported',
      color: 'var(--outline)',
      bg: 'var(--surface-container)',
      action: false,
    },
    failed: {
      icon: 'error',
      label: 'Failed — tap to retry',
      color: 'var(--error)',
      bg: 'var(--error-container)',
      action: true,
    },
  }
  const pushUI = PUSH_UI[pushState] ?? PUSH_UI.idle

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        padding: 'clamp(1rem, 4vw, 2rem)',
        maxWidth: 560,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {/* Header */}
      <div className="animate-fade-up">
        <h1
          style={{
            fontFamily: 'var(--font-headline)',
            fontWeight: 800,
            fontSize: '1.5rem',
            color: 'var(--on-surface)',
          }}
        >
          Profile
        </h1>
      </div>

      {/* User card */}
      <Card style={{ padding: '1.5rem' }} className="animate-fade-up delay-100">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--gradient-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontFamily: 'var(--font-headline)',
              fontWeight: 800,
              fontSize: '1.375rem',
            }}
          >
            {user?.firstName?.[0]?.toUpperCase() ??
              user?.email?.[0]?.toUpperCase() ??
              'V'}
          </div>
          <div>
            <p
              style={{
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: '1rem',
                color: 'var(--on-surface)',
              }}
            >
              {user?.firstName ?? user?.email?.split('@')[0] ?? 'User'}
            </p>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--on-surface-variant)',
                marginBottom: '0.25rem',
              }}
            >
              {user?.email}
            </p>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <Badge variant={user?.emailVerified ? 'success' : 'warning'}>
                {user?.emailVerified ? 'Verified' : 'Unverified'}
              </Badge>
              <Badge
                variant={user?.planType === 'PREMIUM' ? 'primary' : 'neutral'}
              >
                {user?.planType?.toLowerCase() ?? 'free'}
              </Badge>
            </div>
          </div>
        </div>

        {!user?.emailVerified && (
          <div
            style={{
              padding: '0.875rem',
              background: 'var(--tertiary-fixed)',
              borderRadius: 'var(--radius-xl)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.875rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '0.625rem',
                alignItems: 'center',
              }}
            >
              <span
                className="material-symbols-outlined icon-sm"
                style={{ color: 'var(--tertiary)' }}
              >
                mail
              </span>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--tertiary)',
                  fontWeight: 500,
                  lineHeight: 1.5,
                }}
              >
                Please verify your email to unlock all features.
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleResendVerification}
              disabled={isSendingVerification || isVerificationCooldown}
              style={{ alignSelf: 'flex-start' }}
              icon={isSendingVerification ? 'hourglass_top' : 'send'}
            >
              {isSendingVerification
                ? 'Sending…'
                : isVerificationCooldown
                ? 'Email sent'
                : 'Send verification email'}
            </Button>
          </div>
        )}
      </Card>

      {/* Profile completion */}
      <Card style={{ padding: '1.25rem' }} className="animate-fade-up delay-150">
        <SectionHeader label="Profile completion" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 86, height: 86, flexShrink: 0 }}>
            <svg width="86" height="86" viewBox="0 0 86 86">
              <circle
                cx="43" cy="43" r="34"
                fill="none"
                stroke="var(--surface-container-high)"
                strokeWidth="10"
              />
              <circle
                cx="43" cy="43" r="34"
                fill="none"
                stroke={completionColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - completion / 100)}`}
                transform="rotate(-90 43 43)"
                style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
            </svg>
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-headline)',
              fontWeight: 800,
              fontSize: '1.1rem',
              color: completionColor,
            }}>
              {completion}%
            </div>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6, flex: 1 }}>
            {completion === 100
              ? 'Your health profile is complete.'
              : (() => {
                  const remaining = COMPLETION_FIELDS.length - Math.round(completion / 100 * COMPLETION_FIELDS.length)
                  return `${remaining} field${remaining === 1 ? '' : 's'} remaining — a complete profile helps Vitals give better insights.`
                })()}
          </p>
        </div>
      </Card>

      {/* Push notifications */}
      <CollapsibleCard
        title="Notifications"
        open={openSections.notifications}
        onToggle={() => toggleSection('notifications')}
        className="animate-fade-up delay-200"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.875rem',
            background: pushUI.bg,
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              className="material-symbols-outlined icon-sm icon-filled"
              style={{ color: pushUI.color }}
            >
              {pushUI.icon}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: pushUI.color,
              }}
            >
              {pushUI.label}
            </p>
            <p
              style={{
                fontSize: '0.8125rem',
                color: pushUI.color,
                opacity: 0.8,
                marginTop: '0.125rem',
              }}
            >
              {pushState === 'enabled'
                ? 'Medication and care reminders will be delivered as push notifications.'
                : pushState === 'denied'
                ? 'Allow notifications in your browser settings to enable reminders.'
                : 'Enable to receive timely medication and care reminders.'}
            </p>
          </div>
          {pushUI.action && (
            <Button
              variant="secondary"
              size="sm"
              onClick={requestPermissionAndRegister}
            >
              Enable
            </Button>
          )}
        </div>

        {pushState === 'denied' && (
          <div style={{ marginTop: '0.75rem' }}>
            <StatusBanner
              type="info"
              message="To re-enable: click the lock icon in your browser address bar → Notifications → Allow."
            />
          </div>
        )}
      </CollapsibleCard>

      {/* Google Calendar */}
      <CollapsibleCard
        title="Google Calendar"
        open={openSections.calendar}
        onToggle={() => toggleSection('calendar')}
        className="animate-fade-up delay-250"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* ── responsive calendar card (mobile-safe) ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              padding: '1rem',
              background: calendarConnected ? '#dcfce7' : 'var(--primary-fixed)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '0.875rem',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span
                  className="material-symbols-outlined icon-sm icon-filled"
                  style={{
                    color: calendarConnected ? '#16a34a' : 'var(--primary)',
                  }}
                >
                  {calendarConnected ? 'check_circle' : 'event'}
                </span>
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-headline)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: calendarConnected ? '#166534' : 'var(--primary)',
                    lineHeight: 1.4,
                  }}
                >
                  {calendarConnected
                    ? 'Google Calendar connected'
                    : 'Sync care reminders'}
                </p>

                <p
                  style={{
                    fontSize: '0.8125rem',
                    opacity: 0.85,
                    marginTop: '0.25rem',
                    color: calendarConnected ? '#166534' : 'var(--primary)',
                    lineHeight: 1.5,
                  }}
                >
                  {calendarConnected
                    ? 'Your care reminders can now sync with Google Calendar.'
                    : 'Connect Google Calendar so medication and pregnancy reminders can sync automatically.'}
                </p>

                {calendarSummary?.accountEmail && (
                  <p
                    style={{
                      fontSize: '0.75rem',
                      marginTop: '0.5rem',
                      color: calendarConnected ? '#166534' : 'var(--primary)',
                      opacity: 0.85,
                      wordBreak: 'break-word',
                    }}
                  >
                    Connected as {calendarSummary.accountEmail}
                  </p>
                )}
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleConnectGoogleCalendar}
              disabled={isConnectingCalendar}
              icon={
                isConnectingCalendar
                  ? 'hourglass_top'
                  : calendarConnected
                  ? 'sync'
                  : 'link'
              }
              style={{
                width: '100%',
                justifyContent: 'center',
              }}
            >
              {isConnectingCalendar
                ? 'Connecting…'
                : calendarConnected
                ? 'Reconnect'
                : 'Connect'}
            </Button>
          </div>

          {failedSyncs > 0 && (
            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--error-container)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    color: 'var(--error)',
                  }}
                >
                  Some calendar events failed to sync
                </p>
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--error)',
                    marginTop: '0.25rem',
                  }}
                >
                  Failed syncs: {failedSyncs}
                </p>
              </div>

              <Button
                size="sm"
                variant="secondary"
                disabled={isRetryingSync}
                onClick={async () => {
                  try {
                    setIsRetryingSync(true)
                    await api.post<null>('/api/v1/calendar/sync/retry-failed', {})
                    setSuccess('Retry started successfully')
                    const updated = await api.get<CalendarSyncSummary>('/api/v1/calendar/sync/summary')
                    setCalendarSummary(updated)
                    // calendarConnected is derived from calendarSummary — no manual sync needed
                  } catch {
                    setError('Could not retry failed syncs')
                  } finally {
                    setIsRetryingSync(false)
                  }
                }}
              >
                {isRetryingSync ? 'Retrying…' : 'Retry failed syncs'}
              </Button>
            </div>
          )}
        </div>
      </CollapsibleCard>

      {/* Usage */}
      {usage && (
        <CollapsibleCard
          title="Daily AI usage"
          open={openSections.usage}
          onToggle={() => toggleSection('usage')}
          className="animate-fade-up delay-300"
        >
          {[
            { label: 'Symptom checks', ...usage.symptomChecks },
            { label: 'Drug detections', ...usage.drugDetections },
          ].map(({ label, used, limit }) => (
            <div key={label} style={{ marginBottom: '0.875rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.375rem',
                }}
              >
                <span style={{ fontSize: '0.875rem', color: 'var(--on-surface)' }}>
                  {label}
                </span>
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color:
                      used >= limit ? 'var(--error)' : 'var(--on-surface)',
                  }}
                >
                  {used} / {limit}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 99,
                  background: 'var(--surface-container-high)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, (used / limit) * 100)}%`,
                    background:
                      used >= limit ? 'var(--error)' : 'var(--gradient-primary)',
                    borderRadius: 99,
                    transition: 'width 0.4s',
                  }}
                />
              </div>
            </div>
          ))}
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--outline)',
              marginTop: '0.25rem',
            }}
          >
            Quotas reset daily at midnight.
          </p>
        </CollapsibleCard>
      )}

      {/* ── Health profile: view or edit ───────────────────────────────────── */}
      {isEditing ? (
        <>
          <Card style={{ padding: '1.25rem' }} className="animate-fade-up delay-400">
            <SectionHeader label="Basic Information" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.875rem' }}>
              <Field label="First name">
                <Input value={form.firstName} onChange={set('firstName')} placeholder="First name" autoComplete="given-name" />
              </Field>
              <Field label="Last name">
                <Input value={form.lastName} onChange={set('lastName')} placeholder="Last name" autoComplete="family-name" />
              </Field>
              <Field label="Gender">
                <Select
                  value={form.gender}
                  onChange={set('gender')}
                  placeholder="Select gender"
                  options={[
                    { label: 'Male', value: 'MALE' },
                    { label: 'Female', value: 'FEMALE' },
                    { label: 'Non-binary', value: 'NON_BINARY' },
                    { label: 'Prefer not to say', value: 'PREFER_NOT_TO_SAY' },
                  ]}
                />
              </Field>
              <Field label="Date of birth">
                <Input value={form.dateOfBirth} onChange={set('dateOfBirth')} type="date" autoComplete="bday" />
              </Field>
              <Field label="Phone number">
                <Input value={form.phoneNumber} onChange={set('phoneNumber')} placeholder="+1 555 000 0000" type="tel" autoComplete="tel" />
              </Field>
              <Field label="Country">
                <Input value={form.country} onChange={set('country')} placeholder="Country" autoComplete="country-name" />
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={set('city')} placeholder="City" autoComplete="address-level2" />
              </Field>
            </div>
          </Card>

          <CollapsibleCard
            title="Medical Information"
            open={openSections.medical}
            onToggle={() => toggleSection('medical')}
            className="animate-fade-up delay-500"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.875rem' }}>
                <Field label="Blood group">
                  <Select
                    value={form.bloodGroup}
                    onChange={set('bloodGroup')}
                    placeholder="Select"
                    options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(v => ({ label: v, value: v }))}
                  />
                </Field>
                <Field label="Genotype">
                  <Select
                    value={form.genotype}
                    onChange={set('genotype')}
                    placeholder="Select"
                    options={['AA', 'AS', 'AC', 'SS', 'SC', 'CC'].map(v => ({ label: v, value: v }))}
                  />
                </Field>
                <Field label="Height (cm)">
                  <Input value={form.heightCm} onChange={set('heightCm')} type="number" step="0.1" placeholder="e.g. 170" autoComplete="off" />
                </Field>
                <Field label="Weight (kg)">
                  <Input value={form.weightKg} onChange={set('weightKg')} type="number" step="0.1" placeholder="e.g. 65" autoComplete="off" />
                </Field>
              </div>
              <Field label="Allergies (comma-separated)">
                <Textarea value={form.allergies} onChange={set('allergies')} placeholder="e.g. Penicillin, Peanuts, Latex" />
              </Field>
              <Field label="Existing conditions (comma-separated)">
                <Textarea value={form.existingConditions} onChange={set('existingConditions')} placeholder="e.g. Hypertension, Diabetes type 2" />
              </Field>
              <Field label="Current medications (comma-separated)">
                <Textarea value={form.currentMedications} onChange={set('currentMedications')} placeholder="e.g. Metformin 500mg, Lisinopril 10mg" />
              </Field>
              <Field label="Disabilities (comma-separated)">
                <Textarea value={form.disabilities} onChange={set('disabilities')} placeholder="e.g. Hearing impairment" />
              </Field>
            </div>
          </CollapsibleCard>

          <CollapsibleCard
            title="Lifestyle"
            open={openSections.lifestyle}
            onToggle={() => toggleSection('lifestyle')}
            className="animate-fade-up delay-600"
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.875rem' }}>
              <Field label="Smoking status">
                <Select
                  value={form.smokingStatus}
                  onChange={set('smokingStatus')}
                  placeholder="Select"
                  options={[
                    { label: 'Never', value: 'never' },
                    { label: 'Former', value: 'former' },
                    { label: 'Occasional', value: 'occasional' },
                    { label: 'Regular', value: 'regular' },
                  ]}
                />
              </Field>
              <Field label="Alcohol use">
                <Select
                  value={form.alcoholUse}
                  onChange={set('alcoholUse')}
                  placeholder="Select"
                  options={[
                    { label: 'None', value: 'none' },
                    { label: 'Occasional', value: 'occasional' },
                    { label: 'Moderate', value: 'moderate' },
                    { label: 'Heavy', value: 'heavy' },
                  ]}
                />
              </Field>
            </div>
          </CollapsibleCard>
        </>
      ) : (
        <>
          <Card style={{ padding: '1.25rem' }} className="animate-fade-up delay-400">
            <SectionHeader label="Basic Information" />
            <InfoRow label="First name" value={form.firstName} />
            <InfoRow label="Last name" value={form.lastName} />
            <InfoRow label="Gender" value={fmt(prettyGender, form.gender)} />
            <InfoRow label="Date of birth" value={prettyDate(form.dateOfBirth)} />
            <InfoRow label="Phone" value={form.phoneNumber} />
            <InfoRow label="Country" value={form.country} />
            <InfoRow label="City" value={form.city} />
            <InfoRow label="Timezone" value={form.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone} />
            <InfoRow label="Vitals journey" value={fmt(prettyJourney, form.selectedJourney)} />
          </Card>

          <CollapsibleCard
            title="Medical Information"
            open={openSections.medical}
            onToggle={() => toggleSection('medical')}
            className="animate-fade-up delay-500"
          >
            <InfoRow label="Blood group" value={form.bloodGroup} />
            <InfoRow label="Genotype" value={form.genotype} />
            <InfoRow label="Height" value={form.heightCm !== '' ? `${form.heightCm} cm` : undefined} />
            <InfoRow label="Weight" value={form.weightKg !== '' ? `${form.weightKg} kg` : undefined} />
            <InfoRow label="Allergies" value={splitList(form.allergies)} />
            <InfoRow label="Conditions" value={splitList(form.existingConditions)} />
            <InfoRow label="Medications" value={splitList(form.currentMedications)} />
            <InfoRow label="Disabilities" value={splitList(form.disabilities)} />
          </CollapsibleCard>

          <CollapsibleCard
            title="Lifestyle"
            open={openSections.lifestyle}
            onToggle={() => toggleSection('lifestyle')}
            className="animate-fade-up delay-600"
          >
            <InfoRow label="Smoking" value={fmt(prettySmoking, form.smokingStatus)} />
            <InfoRow label="Alcohol" value={fmt(prettyAlcohol, form.alcoholUse)} />
          </CollapsibleCard>
        </>
      )}

      {/* Feedback banners */}
      {success && (
        <div className="animate-fade-up">
          <StatusBanner type="success" message={success} />
        </div>
      )}
      {error && (
        <div className="animate-fade-up">
          <StatusBanner type="error" message={error} />
        </div>
      )}

      {/* Action buttons */}
      {isEditing ? (
        <>
          <div className="animate-fade-up">
            <Button type="button" variant="primary" onClick={handleSave} disabled={isSaving} style={{ width: '100%' }} icon={isSaving ? 'hourglass_top' : 'save'}>
              {isSaving ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
          <div className="animate-fade-up">
            <Button type="button" variant="secondary" onClick={cancelEditing} disabled={isSaving} style={{ width: '100%' }} icon="close">
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <div className="animate-fade-up">
          <Button type="button" variant="primary" onClick={startEditing} style={{ width: '100%' }} icon="edit">
            Edit profile
          </Button>
        </div>
      )}

      {/* Sign out */}
      <div className="animate-fade-up">
        <Button variant="danger" onClick={logout} style={{ width: '100%' }} icon="logout">
          Sign out
        </Button>
      </div>
    </div>
  )
}
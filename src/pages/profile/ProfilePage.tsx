import { useEffect, useRef, useState } from 'react'
import { Button, StatusBanner } from '@/components/ui'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { ProfileDetails } from './ProfileDetails'
import { ProfilePageSkeleton } from './ProfileControls'
import {
  CalendarSettings,
  CompletionCard,
  NotificationSettings,
  UsageSettings,
  UserSummaryCard,
} from './ProfileOverview'
import {
  CLOSED_PROFILE_SECTIONS,
  EMPTY_PROFILE_FORM,
  type CalendarSyncSummary,
  type ProfileForm,
  type ProfileSectionKey,
  type Usage,
  type UserProfile,
} from './profile.types'
import {
  calculateProfileCompletion,
  profileToForm,
  profileUpdatePayload,
} from './profile.utils'

export function ProfilePage() {
  const { user, logout } = useAuthStore()
  const { pushState, requestPermissionAndRegister } = usePushNotifications()
  const [form, setForm] = useState<ProfileForm>(EMPTY_PROFILE_FORM)
  const [snapshot, setSnapshot] = useState<ProfileForm | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [calendarSummary, setCalendarSummary] = useState<CalendarSyncSummary | null>(null)
  const [openSections, setOpenSections] = useState(CLOSED_PROFILE_SECTIONS)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingVerification, setIsSendingVerification] = useState(false)
  const [isVerificationCooldown, setIsVerificationCooldown] = useState(false)
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false)
  const [isRetryingSync, setIsRetryingSync] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.get<UserProfile>('/api/v1/users/profile')
      .then(profile => {
        setForm(profileToForm(profile))
        if (!profile.profile?.timezone) {
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
          void api.patch('/api/v1/users/profile', { timezone }).catch(() => undefined)
        }
      })
      .catch(() => setError('Could not load your profile. Please refresh.'))
      .finally(() => setIsLoadingProfile(false))

    void api.get<Usage>('/api/v1/usage').then(setUsage).catch(() => undefined)

    const params = new URLSearchParams(window.location.search)
    const calendarRedirect = params.get('calendar') === 'connected'
    if (calendarRedirect) {
      const url = new URL(window.location.href)
      url.searchParams.delete('calendar')
      window.history.replaceState({}, '', url.toString())
    }

    void api.get<CalendarSyncSummary>('/api/v1/calendar/sync/summary')
      .then(summary => {
        setCalendarSummary(summary)
        if (calendarRedirect && summary.connected) {
          setSuccess('Google Calendar connected successfully')
          setOpenSections(previous => ({ ...previous, calendar: true }))
        }
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => () => {
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
  }, [])

  const toggleSection = (section: ProfileSectionKey) => {
    setOpenSections(previous => ({ ...previous, [section]: !previous[section] }))
  }

  const updateField = (field: keyof ProfileForm, value: string) => {
    setSuccess('')
    setError('')
    setForm(previous => ({ ...previous, [field]: value }))
  }

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

  const handleSave = async () => {
    setIsSaving(true)
    setError('')
    setSuccess('')
    try {
      await api.patch('/api/v1/users/profile', profileUpdatePayload(form))
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
      await api.post<null>('/api/v1/auth/resend-verification')
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
      window.location.assign(result.url)
    } catch {
      setError('Could not start Google Calendar connection.')
      setIsConnectingCalendar(false)
    }
  }

  const handleRetryCalendarSync = async () => {
    setIsRetryingSync(true)
    setError('')
    try {
      await api.post<null>('/api/v1/calendar/sync/retry-failed')
      const summary = await api.get<CalendarSyncSummary>('/api/v1/calendar/sync/summary')
      setCalendarSummary(summary)
      setSuccess('Retry started successfully')
    } catch {
      setError('Could not retry failed syncs')
    } finally {
      setIsRetryingSync(false)
    }
  }

  if (isLoadingProfile) return <ProfilePageSkeleton />

  const completion = calculateProfileCompletion(form)

  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="animate-fade-up">
        <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--on-surface)' }}>Profile</h1>
      </div>

      <UserSummaryCard
        user={user}
        sendingVerification={isSendingVerification}
        verificationCooldown={isVerificationCooldown}
        onResendVerification={handleResendVerification}
      />
      <CompletionCard completion={completion} />
      <NotificationSettings
        open={openSections.notifications}
        pushState={pushState}
        onToggle={() => toggleSection('notifications')}
        onEnable={requestPermissionAndRegister}
      />
      <CalendarSettings
        open={openSections.calendar}
        summary={calendarSummary}
        connecting={isConnectingCalendar}
        retrying={isRetryingSync}
        onToggle={() => toggleSection('calendar')}
        onConnect={handleConnectGoogleCalendar}
        onRetry={handleRetryCalendarSync}
      />
      <UsageSettings usage={usage} open={openSections.usage} onToggle={() => toggleSection('usage')} />

      <ProfileDetails
        editing={isEditing}
        form={form}
        openSections={openSections}
        onChange={updateField}
        onToggleMedical={() => toggleSection('medical')}
        onToggleLifestyle={() => toggleSection('lifestyle')}
      />

      {success ? <div className="animate-fade-up"><StatusBanner type="success" message={success} /></div> : null}
      {error ? <div className="animate-fade-up"><StatusBanner type="error" message={error} /></div> : null}

      {isEditing ? (
        <>
          <div className="animate-fade-up">
            <Button type="button" variant="primary" onClick={handleSave} disabled={isSaving} style={{ width: '100%' }} icon={isSaving ? 'hourglass_top' : 'save'}>
              {isSaving ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
          <div className="animate-fade-up">
            <Button type="button" variant="secondary" onClick={cancelEditing} disabled={isSaving} style={{ width: '100%' }} icon="close">Cancel</Button>
          </div>
        </>
      ) : (
        <div className="animate-fade-up">
          <Button type="button" variant="primary" onClick={startEditing} style={{ width: '100%' }} icon="edit">Edit profile</Button>
        </div>
      )}

      <div className="animate-fade-up">
        <Button variant="danger" onClick={logout} style={{ width: '100%' }} icon="logout">Sign out</Button>
      </div>
    </div>
  )
}


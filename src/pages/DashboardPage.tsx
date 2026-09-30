import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { api, ApiError } from '@/lib/api'
import { Card, Badge, Skeleton, EmptyState, Button } from '@/components/ui'

interface DashboardData {
  todayTasks: CareEvent[]
  upcomingReminders: CareEvent[]
  recentActivity: ActivityLog[]
  usageSummary: UsageSummary
  latestMoodInsight: MoodLog | null
  motherBabySummary?: unknown
  subject: PersonSubject
  people: PersonSummary[]
}

interface DashboardResponse {
  subject: PersonSubject
  care: Pick<DashboardData, 'todayTasks' | 'upcomingReminders' | 'recentActivity' | 'latestMoodInsight'> & {
    journey: unknown
  }
  account: { usageSummary: UsageSummary }
  people: PersonSummary[]
}

interface PersonSubject {
  personId: string
  displayName: string
  isSelf: boolean
}

interface PersonSummary {
  personId: string
  displayName: string
  relationship: 'self' | 'managed' | 'connected'
  isClaimed: boolean
  origin: string
  role: string
  isSelected: boolean
  upcomingTasks: number
}

const RELATIONSHIP_ICON: Record<PersonSummary['relationship'], string> = {
  self: 'person',
  managed: 'child_care',
  connected: 'group',
}

interface CareEvent {
  id: string; title: string; scheduledFor: string; status: string
  eventType: string; carePlan: { type: string; title: string }
}
interface ActivityLog { id: string; type: string; message: string; createdAt: string }
interface UsageSummary {
  symptomChecksUsed: number
  symptomChecksLimit: number
  drugDetectionsUsed: number
  drugDetectionsLimit: number
}
interface MoodLog { mood: string | null; craving: string | null; insight: string | null; loggedAt: string }

function PersonSwitcher({
  people,
  subject,
  onSelect,
}: {
  people: PersonSummary[]
  subject: PersonSubject
  onSelect: (personId: string | undefined) => void
}) {
  if (people.length <= 1) return null

  return (
    <div role="tablist" aria-label="Viewing health record for" style={{
      display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem',
      marginBottom: '1.25rem',
    }}>
      {people.map(person => {
        const active = person.personId === subject.personId
        return (
          <button
            key={person.personId}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(person.relationship === 'self' ? undefined : person.personId)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.875rem', borderRadius: 'var(--radius-full)',
              border: `1px solid ${active ? 'var(--primary)' : 'var(--outline-variant)'}`,
              background: active ? 'var(--primary-fixed)' : 'var(--surface-container-lowest)',
              color: active ? 'var(--primary)' : 'var(--on-surface-variant)',
              fontFamily: 'var(--font-headline)', fontWeight: active ? 700 : 500,
              fontSize: '0.85rem', whiteSpace: 'nowrap', cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {RELATIONSHIP_ICON[person.relationship]}
            </span>
            {person.displayName}
            {person.upcomingTasks > 0 && <span aria-label={`${person.upcomingTasks} upcoming tasks`}>
              {person.upcomingTasks}
            </span>}
          </button>
        )
      })}
    </div>
  )
}

const GREETING = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const EVENT_TYPE_ICON: Record<string, string> = {
  MEDICATION_DOSE: 'pill',
  ANC_VISIT: 'pregnant_woman',
  ANC_SCAN: 'biotech',
  VACCINATION: 'vaccines',
  default: 'calendar_today',
}

const STATUS_CONFIG = {
  PENDING:  { label: 'Due',     color: 'var(--primary)',   bg: 'var(--primary-fixed)'   },
  DONE:     { label: 'Done',    color: '#16a34a',          bg: '#dcfce7'                },
  SKIPPED:  { label: 'Skipped', color: 'var(--tertiary)',  bg: 'var(--tertiary-fixed)'  },
  MISSED:   { label: 'Missed',  color: 'var(--error)',     bg: 'var(--error-container)' },
}

function TaskCard({ event, onAction }: { event: CareEvent; onAction: (id: string, status: 'DONE' | 'SKIPPED') => Promise<void> }) {
  const [acting, setActing] = useState(false)
  const icon = EVENT_TYPE_ICON[event.eventType] ?? EVENT_TYPE_ICON.default
  const cfg  = STATUS_CONFIG[event.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING
  const time  = new Date(event.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const handle = async (status: 'DONE' | 'SKIPPED') => {
    setActing(true)
    try {
      await onAction(event.id, status)
    } finally {
      setActing(false)
    }
  }

return (
  <div style={{
    background: 'var(--surface-container-lowest)',
    borderRadius: 'var(--radius-xl)',
    padding: '1.125rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: 'var(--shadow-sm)',
    borderLeft: event.status === 'MISSED'
      ? '3px solid var(--error)'
      : event.status === 'DONE'
        ? '3px solid #16a34a'
        : '3px solid transparent',

    opacity: event.status === 'DONE' ? 0.7 : 1,
  }}>
      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: `${cfg.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{ color: cfg.color, fontSize: 22 }}>{icon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.125rem' }}>{time} · {event.carePlan.title}</p>
      </div>
      {event.status === 'PENDING' ? (
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button aria-label={`Mark ${event.title} done`} aria-busy={acting} onClick={() => void handle('DONE')} disabled={acting} style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', opacity: acting ? 0.6 : 1, pointerEvents: acting ? 'none' : 'auto',
          }}>
            <span className="material-symbols-outlined icon-sm">{acting ? 'hourglass_top' : 'check'}</span>
          </button>
          <button aria-label={`Skip ${event.title}`} aria-busy={acting} onClick={() => void handle('SKIPPED')} disabled={acting} style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', opacity: acting ? 0.6 : 1, pointerEvents: acting ? 'none' : 'auto',
          }}>
            <span className="material-symbols-outlined icon-sm">{acting ? 'hourglass_top' : 'close'}</span>
          </button>
        </div>
      ) : (
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-full)', flexShrink: 0 }}>{cfg.label}</span>
      )}
    </div>
  )
}

function QuickAction({ icon, label, color, bg, to }: { icon: string; label: string; color: string; bg: string; to: string }) {
  const nav = useNavigate()
  return (
    <button onClick={() => nav(to)} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
      padding: '1rem 0.5rem', background: 'var(--surface-container-lowest)',
      borderRadius: 'var(--radius-xl)', border: 'none', cursor: 'pointer',
      boxShadow: 'var(--shadow-sm)', transition: 'all 0.15s', flex: 1,
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-md)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-sm)' }}
    >
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-symbols-outlined" style={{ color, fontSize: 22 }}>{icon}</span>
      </div>
      <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--on-surface-variant)', textAlign: 'center', lineHeight: 1.3, fontFamily: 'var(--font-headline)' }}>{label}</span>
    </button>
  )
}

function SkeletonDashboard() {
  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Skeleton height={32} width="60%" />
      <Skeleton height={16} width="40%" />
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {[1, 2, 3, 4].map(i => <Skeleton key={i} height={88} style={{ flex: 1, borderRadius: 'var(--radius-xl)' }} />)}
      </div>
      {[1, 2, 3].map(i => <Skeleton key={i} height={72} style={{ borderRadius: 'var(--radius-xl)' }} />)}
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedPersonId = searchParams.get('personId') || undefined
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const nav = useNavigate()

  const selectPerson = (personId: string | undefined) => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous)
      if (personId) next.set('personId', personId)
      else next.delete('personId')
      return next
    }, { replace: true })
  }

  
  const load = async (silent = false, personId = selectedPersonId) => {
    if (!silent) setLoading(true)
    setError('')

    try {
      const query = personId ? `?personId=${encodeURIComponent(personId)}` : ''
      const response = await api.get<DashboardResponse>(`/api/v1/dashboard${query}`)
      setData({
        ...response.care,
        usageSummary: response.account.usageSummary,
        motherBabySummary: response.care.journey,
        subject: response.subject,
        people: response.people,
      })
    } catch (e) {
      if (!silent) {
        setError(e instanceof ApiError ? e.message : 'Failed to load dashboard')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()

    const interval = setInterval(() => {
      load(true)
    }, 120000)

    return () => clearInterval(interval)
  }, [selectedPersonId])

  const updateEventStatus = async (id: string, status: 'DONE' | 'SKIPPED') => {
    try {
      await api.patch(`/api/v1/care/events/${id}/status`, { status })
      setData(prev => {
        if (!prev) return prev

        return {
          ...prev,
          todayTasks: prev.todayTasks.filter(e => e.id !== id),
          upcomingReminders: prev.upcomingReminders.filter(e => e.id !== id),
        }
      })
    } catch (err) {
      await load()
      setError(err instanceof ApiError ? err.message : 'Could not update this reminder. Please try again.')
    }
  }

  const displayName = user?.firstName ?? user?.email?.split('@')[0] ?? 'there'
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  if (loading) return <SkeletonDashboard />

  if (error) return (
    <div style={{ padding: '2rem' }}>
      <EmptyState icon="wifi_off" title="Couldn't load dashboard" description={error}
        action={<Button onClick={() => load()} variant="primary" size="sm" icon="refresh">Try again</Button>} />
    </div>
  )

  const pendingCount = data?.todayTasks.filter(t => t.status === 'PENDING').length ?? 0


  const totalTasks = data?.todayTasks.length ?? 0
  const completedTasks = Math.max(0, totalTasks - pendingCount)

  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      {data && <PersonSwitcher people={data.people} subject={data.subject} onSelect={selectPerson} />}
      <div className="animate-fade-up" style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--outline)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{today}</p>
        <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: 'var(--on-surface)', lineHeight: 1.2 }}>
          {data && !data.subject.isSelf
            ? <><span style={{ color: 'var(--primary)' }}>{data.subject.displayName}</span>'s care</>
            : <>{GREETING()}, <span style={{ color: 'var(--primary)' }}>{displayName}</span> 👋</>}
        </h1>
        {pendingCount > 0 && (
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', marginTop: '0.375rem' }}>
           You have <strong style={{ color: 'var(--primary)' }}>{pendingCount} task{pendingCount > 1 ? 's' : ''}</strong> remaining today
            {totalTasks > 0 && (
              <>
                {' '}— {completedTasks} of {totalTasks} completed.
              </>
            )}
          </p>
        )}
        {!user?.emailVerified && (
          <div style={{ marginTop: '0.875rem', padding: '0.75rem 1rem', background: 'var(--tertiary-fixed)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--tertiary)' }}>mail</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--tertiary)', fontWeight: 500 }}>Please verify your email to enable all features.</span>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="animate-fade-up delay-100" style={{ marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Quick actions</p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <QuickAction icon="pill" label="Add Med" color="var(--primary)" bg="var(--primary-fixed)" to="/care" />
          <QuickAction icon="pregnant_woman" label="Pregnancy" color="var(--secondary)" bg="var(--secondary-fixed)" to="/mother-baby" />
          <QuickAction icon="mood" label="Log Mood" color="var(--tertiary)" bg="var(--tertiary-fixed)" to="/mother-baby?tab=mood" />
          <QuickAction icon="biotech" label="Symptom AI" color="#7c3aed" bg="#ede9fe" to="/care?tab=symptoms" />
        </div>
      </div>

      {/* Today's tasks */}
        <div className="animate-fade-up delay-200" style={{ marginBottom: '2rem' }}>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.875rem'
          }}>
            <p style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: '0.8125rem',
              color: 'var(--on-surface-variant)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              Today's tasks
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {pendingCount > 0 && (
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {pendingCount} remaining
                </span>
              )}

              <button
                onClick={() => nav('/care?tab=timeline')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                View all
              </button>
            </div>
          </div>

          {data?.todayTasks.length === 0 ? (
            <Card style={{ padding: '2rem' }}>
              <EmptyState
                icon="check_circle"
                title="All caught up!"
                description="No tasks scheduled for today. Great work."
              />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {data?.todayTasks.map((event, i) => (
                <div key={event.id} className={`animate-fade-up delay-${(i + 1) * 100}`}>
                  <TaskCard event={event} onAction={updateEventStatus} />
                </div>
              ))}
            </div>
          )}

        </div>

      {/* Upcoming */}
      {(data?.upcomingReminders ?? []).length > 0 && (
        <div className="animate-fade-up delay-300" style={{ marginBottom: '2rem' }}>
          <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Coming up</p>
          <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }} className="no-scrollbar">
            {data?.upcomingReminders.slice(0, 5).map(event => {
              const icon = EVENT_TYPE_ICON[event.eventType] ?? EVENT_TYPE_ICON.default
              const d = new Date(event.scheduledFor)
              return (
                <button
                  key={event.id}
                  onClick={() => nav('/care?tab=timeline')}
                  style={{
                    flexShrink: 0,
                    width: 140,
                    background: 'var(--surface-container-lowest)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '1rem',
                    boxShadow: 'var(--shadow-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.625rem' }}>
                    <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--primary)' }}>{icon}</span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--on-surface)', lineHeight: 1.3, marginBottom: '0.25rem' }}>{event.title}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                    {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* AI usage + Mood */}
      <div className="animate-fade-up delay-400" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '2rem' }}>
        {/* Usage */}
        <Card style={{ padding: '1.25rem' }}>
          <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--on-surface-variant)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '1rem' }}>AI today</p>
          {data?.usageSummary && [
              { label: 'Symptom checks', used: data.usageSummary.symptomChecksUsed, limit: data.usageSummary.symptomChecksLimit },
              { label: 'Drug scans', used: data.usageSummary.drugDetectionsUsed, limit: data.usageSummary.drugDetectionsLimit },
          ].map(({ label, used, limit }) => (
            <div key={label} style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>{label}</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: used >= limit ? 'var(--error)' : 'var(--primary)' }}>{used}/{limit}</span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: 'var(--surface-container-high)' }}>
                <div style={{ height: '100%', width: limit > 0 ? `${Math.min(100, (used / limit) * 100)}%` : '0%', background: used >= limit ? 'var(--error)' : 'var(--gradient-primary)', borderRadius: 99, transition: 'width 0.4s' }} />
              </div>
            </div>
          ))}
        </Card>

        {/* Latest mood */}
        <Card style={{ padding: '1.25rem', cursor: 'pointer' }} onClick={() => nav('/mother-baby?tab=mood')}>
          <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--on-surface-variant)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Last mood</p>
          {data?.latestMoodInsight ? (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {data.latestMoodInsight.mood && <span style={{ padding: '0.25rem 0.625rem', background: 'var(--primary-fixed)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{data.latestMoodInsight.mood}</span>}
                {data.latestMoodInsight.craving && <span style={{ padding: '0.25rem 0.625rem', background: 'var(--tertiary-fixed)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--tertiary)' }}>{data.latestMoodInsight.craving}</span>}
              </div>
              {data.latestMoodInsight.insight && <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{data.latestMoodInsight.insight.slice(0, 80)}…</p>}
            </>
          ) : (
            <EmptyState icon="mood" title="No mood logged" description="Tap to log today's mood" />
          )}
        </Card>
      </div>

      {/* Recent activity */}
      {(data?.recentActivity ?? []).length > 0 && (
        <div className="animate-fade-up delay-500">
          <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Recent activity</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data?.recentActivity.slice(0, 5).map(log => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', flex: 1 }}>{log.message}</p>
                <span style={{ fontSize: '0.75rem', color: 'var(--outline)', flexShrink: 0 }}>
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

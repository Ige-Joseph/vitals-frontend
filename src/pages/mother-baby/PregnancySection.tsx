import { useState, type FormEvent } from 'react'
import { Badge, Button, Card, Input, StatusBanner } from '@/components/ui'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { api, ApiError } from '@/lib/api'
import type { PregnancyTimeline } from './mother-baby.types'

const BABY_SIZES: Record<number, string> = {
  4: 'poppy seed', 6: 'lentil', 8: 'raspberry', 10: 'strawberry', 12: 'plum',
  14: 'lemon', 16: 'avocado', 18: 'bell pepper', 20: 'banana', 22: 'coconut',
  24: 'corn', 26: 'lettuce head', 28: 'aubergine', 30: 'cabbage', 32: 'squash',
  34: 'butternut squash', 36: 'honeydew melon', 38: 'pumpkin', 40: 'watermelon',
}

function getBabySize(week: number) {
  const weeks = Object.keys(BABY_SIZES).map(Number).sort((left, right) => left - right)
  const matchingWeek = weeks.reduce((previous, current) => current <= week ? current : previous, weeks[0])
  return BABY_SIZES[matchingWeek] ?? 'growing beautifully'
}

export function PregnancySetupForm({ onSuccess }: { onSuccess: (timeline: PregnancyTimeline) => void }) {
  const { requestPermissionAndRegister, pushState } = usePushNotifications()
  const [inputMode, setInputMode] = useState<'lmp' | 'week'>('lmp')
  const [lmpDate, setLmpDate] = useState('')
  const [weekNumber, setWeekNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (pushState !== 'enabled') await requestPermissionAndRegister()

      const payload = inputMode === 'lmp'
        ? { lmpDate }
        : { pregnancyWeekAtSetup: Number.parseInt(weekNumber, 10) }

      await api.post('/api/v1/mother-baby/setup', payload)
      const timeline = await api.get<PregnancyTimeline>('/api/v1/mother-baby/timeline')
      onSuccess(timeline)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Failed to set up timeline. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '2.25rem' }} aria-hidden="true">🤰</span>
        <h2 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.375rem', color: 'var(--on-surface)', marginTop: '0.5rem' }}>Start your pregnancy journey</h2>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', marginTop: '0.375rem', lineHeight: 1.6 }}>
          Enter either your last menstrual period (LMP) date or your current pregnancy week to generate your personalised ANC timeline.
        </p>
      </div>

      <div style={{ padding: '0.75rem 1rem', background: 'var(--primary-fixed)', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
        <span className="material-symbols-outlined icon-sm" aria-hidden="true" style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }}>notifications_active</span>
        <p style={{ fontSize: '0.8125rem', color: 'var(--on-primary-fixed-variant)', lineHeight: 1.55 }}>
          We&apos;ll ask to enable push notifications so you receive timely ANC appointment reminders.
        </p>
      </div>

      {error ? <div style={{ marginBottom: '1.25rem' }}><StatusBanner type="error" message={error} /></div> : null}

      <div role="tablist" aria-label="Pregnancy date input" style={{ display: 'flex', gap: '0.375rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)', padding: '0.25rem', marginBottom: '1.25rem' }}>
        {(['lmp', 'week'] as const).map(mode => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={inputMode === mode}
            onClick={() => setInputMode(mode)}
            style={{
              flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-lg)', border: 'none',
              background: inputMode === mode ? 'var(--surface-container-lowest)' : 'transparent',
              color: inputMode === mode ? 'var(--primary)' : 'var(--on-surface-variant)',
              fontFamily: 'var(--font-headline)', fontWeight: inputMode === mode ? 700 : 500,
              fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: inputMode === mode ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {mode === 'lmp' ? 'Last period date' : 'Current week'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
        {inputMode === 'lmp' ? (
          <Input
            label="First day of last menstrual period"
            type="date"
            value={lmpDate}
            onChange={event => setLmpDate(event.target.value)}
            required
            max={new Date().toISOString().split('T')[0]}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <Input
              label="Current pregnancy week"
              type="number"
              min={1}
              max={42}
              placeholder="e.g. 18"
              value={weekNumber}
              onChange={event => setWeekNumber(event.target.value)}
              required
            />
            <p style={{ fontSize: '0.8125rem', color: 'var(--outline)' }}>Enter a number between 1 and 42.</p>
          </div>
        )}
        <Button type="submit" loading={saving} style={{ marginTop: '0.25rem' }}>Generate my timeline</Button>
      </form>
    </Card>
  )
}

export function PregnancyTimelineView({ timeline, onReset }: { timeline: PregnancyTimeline; onReset: () => void }) {
  const { currentWeek, trimester, expectedDeliveryDate, guidance, upcomingANCVisits, allMilestones } = timeline
  const daysToGo = Math.max(0, Math.round((new Date(expectedDeliveryDate).getTime() - Date.now()) / 86400000))
  const weeksLeft = Math.floor(daysToGo / 7)
  const progress = Math.min(100, (currentWeek / 40) * 100)
  const babySize = getBabySize(currentWeek)
  const trimesterLabels = ['', 'First Trimester', 'Second Trimester', 'Third Trimester']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{
        background: 'linear-gradient(135deg, #c8d8ff 0%, #d8e8ff 50%, #e8f0ff 100%)',
        borderRadius: 'var(--radius-2xl)', padding: '1.75rem', position: 'relative', overflow: 'hidden',
      }}>
        <div aria-hidden="true" style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }} />
        <div aria-hidden="true" style={{ position: 'absolute', right: 20, top: 20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.25)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Week {currentWeek}</p>
          <h2 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '2.5rem', color: 'var(--on-surface)', lineHeight: 1.05 }}>Week {currentWeek}</h2>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', marginTop: '0.25rem' }}>You&apos;re {currentWeek} weeks pregnant · {weeksLeft} weeks to go</p>
          <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.65)', borderRadius: 'var(--radius-xl)', backdropFilter: 'blur(8px)', maxWidth: 280 }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
              Your baby is about the size of a <strong style={{ color: 'var(--on-surface)' }}>{babySize}</strong>.
            </p>
          </div>
        </div>
      </div>

      {guidance ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
          <Card style={{ padding: '1.125rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
              <span style={{ fontSize: '1.25rem' }} aria-hidden="true">👶</span>
              <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem' }}>Your Baby</p>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{guidance.summary}</p>
          </Card>
          <Card style={{ padding: '1.125rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
              <span style={{ fontSize: '1.25rem' }} aria-hidden="true">💙</span>
              <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem' }}>Tip of the Week</p>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{guidance.tips[0]}</p>
          </Card>
        </div>
      ) : null}

      <Card style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1rem', color: 'var(--on-surface)' }}>{trimesterLabels[trimester]}</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Week {currentWeek} of 40</p>
          </div>
          <Badge variant="primary">T{trimester}</Badge>
        </div>
        <div style={{ height: 8, background: 'var(--surface-container-high)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--gradient-primary)', borderRadius: 99, transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          {['T1', 'T2', 'T3'].map((label, index) => (
            <span key={label} style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', color: index + 1 === trimester ? 'var(--primary)' : 'var(--outline)' }}>{label}</span>
          ))}
        </div>
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
            EDD: <strong style={{ color: 'var(--on-surface)' }}>{new Date(expectedDeliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
            {' · '}<strong style={{ color: 'var(--primary)' }}>{weeksLeft} weeks to go</strong>
          </p>
        </div>
      </Card>

      <Card style={{ padding: '1.25rem' }}>
        <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.125rem', color: 'var(--on-surface)', marginBottom: '1.25rem' }}>Milestones</p>
        <div style={{ position: 'relative' }}>
          <div aria-hidden="true" style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 2, background: 'var(--outline-variant)', zIndex: 0 }} />
          {allMilestones.slice(0, 8).map(milestone => {
            const passed = currentWeek > milestone.weekNumber
            const current = Math.abs(currentWeek - milestone.weekNumber) <= 1 && !passed

            return (
              <div key={milestone.weekNumber} style={{ display: 'flex', gap: '1rem', marginBottom: '1.125rem', position: 'relative', alignItems: 'flex-start' }}>
                <div aria-hidden="true" style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0, zIndex: 1, marginTop: 2,
                  background: current ? 'var(--primary)' : passed ? 'var(--surface-container-high)' : 'white',
                  border: `2px solid ${current ? 'var(--primary)' : 'var(--outline-variant)'}`,
                  boxShadow: current ? '0 0 0 4px rgba(0,91,191,0.15)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {passed ? <span className="material-symbols-outlined icon-filled" style={{ fontSize: 12, color: 'var(--outline)' }}>check</span> : null}
                </div>
                <div style={{ flex: 1, paddingBottom: '0.125rem' }}>
                  <span style={{
                    display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)',
                    background: current ? 'var(--primary)' : 'var(--surface-container-high)',
                    color: current ? 'white' : 'var(--on-surface-variant)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.375rem',
                  }}>Week {milestone.weekNumber}</span>
                  {current ? (
                    <div style={{ background: 'linear-gradient(135deg, #d0dcff 0%, #dce8ff 100%)', borderRadius: 'var(--radius-lg)', padding: '0.875rem', marginTop: '0.25rem' }}>
                      <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)', marginBottom: '0.25rem' }}>{milestone.title}</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--secondary)', lineHeight: 1.45 }}>{milestone.description}</p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 600, fontSize: '0.9rem', color: passed ? 'var(--outline)' : 'var(--on-surface)' }}>{milestone.title}</p>
                      {passed ? <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>✓ Complete</span> : null}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {upcomingANCVisits.length > 0 ? (
        <Card style={{ padding: '1.25rem' }}>
          <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '0.875rem' }}>Upcoming ANC visits</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {upcomingANCVisits.slice(0, 3).map(visit => (
              <div key={visit.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--secondary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined icon-sm" aria-hidden="true" style={{ color: 'var(--secondary)' }}>pregnant_woman</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 600, fontSize: '0.875rem' }}>{visit.title}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                    {new Date(visit.scheduledFor).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
        <button type="button" onClick={onReset} style={{
          background: 'none', border: 'none', color: 'var(--outline)', fontSize: '0.8125rem',
          fontWeight: 600, cursor: 'pointer', opacity: 0.7,
        }}>
          Reset pregnancy timeline
        </button>
      </div>
    </div>
  )
}

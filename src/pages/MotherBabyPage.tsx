import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, ApiError } from '@/lib/api'
import { Button, Card, Badge, EmptyState, Skeleton, StatusBanner, Input } from '@/components/ui'
import { usePushNotifications } from '@/hooks/usePushNotifications'

/* ── Types ─────────────────────────────────────── */
interface Timeline {
  currentWeek: number
  trimester: number
  expectedDeliveryDate: string
  lmpDate: string
  guidance: { trimester: number; summary: string; tips: string[] } | null
  upcomingANCVisits: ANCVisit[]
  allMilestones: Milestone[]
}
interface ANCVisit  { id: string; title: string; scheduledFor: string; status: string }
interface Milestone { weekNumber: number; title: string; description: string; eventType: string }
interface MoodOption { moods: string[]; cravings: string[] }
interface MoodLog    { id: string; mood: string | null; craving: string | null; insight: string | null; loggedAt: string }

type TimelineState =
  | { status: 'loading' }
  | { status: 'setup' }       // no pregnancy — show setup form
  | { status: 'ready'; data: Timeline }
  | { status: 'error'; message: string }

/* ── Baby size metaphors ────────────────────────── */
const BABY_SIZES: Record<number, string> = {
  4:'poppy seed',6:'lentil',8:'raspberry',10:'strawberry',12:'plum',
  14:'lemon',16:'avocado',18:'bell pepper',20:'banana',22:'coconut',
  24:'corn',26:'lettuce head',28:'aubergine',30:'cabbage',32:'squash',
  34:'butternut squash',36:'honeydew melon',38:'pumpkin',40:'watermelon',
}
const getBabySize = (week: number) => {
  const keys = Object.keys(BABY_SIZES).map(Number).sort((a,b) => a-b)
  const k = keys.reduce((p,c) => (c <= week ? c : p), keys[0])
  return BABY_SIZES[k] ?? 'growing beautifully'
}

/* ── Pregnancy Setup Form ───────────────────────── */
interface SetupFormProps {
  onSuccess: (timeline: Timeline) => void
}
function PregnancySetupForm({ onSuccess }: SetupFormProps) {
  const { requestPermissionAndRegister, pushState } = usePushNotifications()
  const [inputMode, setInputMode] = useState<'lmp' | 'week'>('lmp')
  const [lmpDate, setLmpDate] = useState('')
  const [weekNum, setWeekNum] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      // Request push permission here — user is actively enabling reminders
      if (pushState !== 'enabled') {
        await requestPermissionAndRegister()
      }

      const payload = inputMode === 'lmp'
        ? { lmpDate }
        : { pregnancyWeekAtSetup: parseInt(weekNum, 10) }

      await api.post('/api/v1/mother-baby/setup', payload)
      // Fetch the generated timeline and hand it back to the parent
      const t = await api.get<Timeline>('/api/v1/mother-baby/timeline')
      onSuccess(t)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to set up timeline. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '2.25rem' }}>🤰</span>
        <h2 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.375rem', color: 'var(--on-surface)', marginTop: '0.5rem' }}>
          Start your pregnancy journey
        </h2>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', marginTop: '0.375rem', lineHeight: 1.6 }}>
          Enter either your last menstrual period (LMP) date or your current pregnancy week to generate your personalised ANC timeline.
        </p>
      </div>

      {/* Reminder opt-in notice */}
      <div style={{ padding: '0.75rem 1rem', background: 'var(--primary-fixed)', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
        <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }}>notifications_active</span>
        <p style={{ fontSize: '0.8125rem', color: 'var(--on-primary-fixed-variant)', lineHeight: 1.55 }}>
          We'll ask to enable push notifications so you receive timely ANC appointment reminders.
        </p>
      </div>

      {error && <div style={{ marginBottom: '1.25rem' }}><StatusBanner type="error" message={error} /></div>}

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '0.375rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)', padding: '0.25rem', marginBottom: '1.25rem' }}>
        {(['lmp', 'week'] as const).map(mode => (
          <button
            key={mode}
            type="button"
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
            onChange={e => setLmpDate(e.target.value)}
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
              value={weekNum}
              onChange={e => setWeekNum(e.target.value)}
              required
            />
            <p style={{ fontSize: '0.8125rem', color: 'var(--outline)' }}>Enter a number between 1 and 42.</p>
          </div>
        )}

        <Button type="submit" loading={saving} style={{ marginTop: '0.25rem' }}>
          Generate my timeline
        </Button>
      </form>
    </Card>
  )
}

/* ── Pregnancy Timeline Display ─────────────────── */
function PregnancyTimelineView({
  timeline,
  onReset,
}: {
  timeline: Timeline
  onReset: () => void
}) {
  const { currentWeek, trimester, expectedDeliveryDate, guidance, upcomingANCVisits, allMilestones } = timeline
  const daysToGo = Math.max(0, Math.round((new Date(expectedDeliveryDate).getTime() - Date.now()) / 86400000))
  const weeksLeft = Math.floor(daysToGo / 7)
  const progress = Math.min(100, (currentWeek / 40) * 100)
  const babySize = getBabySize(currentWeek)
  const trimesterLabels = ['', 'First Trimester', 'Second Trimester', 'Third Trimester']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Hero — styled after uploaded reference */}
      <div style={{
        background: 'linear-gradient(135deg, #c8d8ff 0%, #d8e8ff 50%, #e8f0ff 100%)',
        borderRadius: 'var(--radius-2xl)', padding: '1.75rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }} />
        <div style={{ position: 'absolute', right: 20, top: 20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.25)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Week {currentWeek}
          </p>
          <h2 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '2.5rem', color: 'var(--on-surface)', lineHeight: 1.05 }}>
            Week {currentWeek}
          </h2>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', marginTop: '0.25rem' }}>
            You're {currentWeek} weeks pregnant · {weeksLeft} weeks to go
          </p>
          <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.65)', borderRadius: 'var(--radius-xl)', backdropFilter: 'blur(8px)', maxWidth: 280 }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
              Your baby is about the size of a <strong style={{ color: 'var(--on-surface)' }}>{babySize}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Baby & Tip cards */}
      {guidance && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
          <Card style={{ padding: '1.125rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
              <span style={{ fontSize: '1.25rem' }}>👶</span>
              <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem' }}>Your Baby</p>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{guidance.summary}</p>
          </Card>
          <Card style={{ padding: '1.125rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
              <span style={{ fontSize: '1.25rem' }}>💙</span>
              <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem' }}>Tip of the Week</p>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{guidance.tips[0]}</p>
          </Card>
        </div>
      )}

      {/* Trimester progress */}
      <Card style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1rem', color: 'var(--on-surface)' }}>
              {trimesterLabels[trimester]}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Week {currentWeek} of 40</p>
          </div>
          <Badge variant="primary">T{trimester}</Badge>
        </div>
        <div style={{ height: 8, background: 'var(--surface-container-high)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--gradient-primary)', borderRadius: 99, transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          {['T1','T2','T3'].map((t,i) => (
            <span key={t} style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', color: i+1 === trimester ? 'var(--primary)' : 'var(--outline)' }}>{t}</span>
          ))}
        </div>
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
            EDD:{' '}
            <strong style={{ color: 'var(--on-surface)' }}>
              {new Date(expectedDeliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </strong>
            {' '}·{' '}
            <strong style={{ color: 'var(--primary)' }}>{weeksLeft} weeks to go</strong>
          </p>
        </div>
      </Card>

      {/* Milestones timeline — styled after uploaded screenshot */}
      <Card style={{ padding: '1.25rem' }}>
        <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.125rem', color: 'var(--on-surface)', marginBottom: '1.25rem' }}>
          Milestones
        </p>
        <div style={{ position: 'relative' }}>
          {/* Vertical spine */}
          <div style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 2, background: 'var(--outline-variant)', zIndex: 0 }} />

          {allMilestones.slice(0, 8).map((m) => {
            const passed  = currentWeek > m.weekNumber
            const current = Math.abs(currentWeek - m.weekNumber) <= 1 && !passed
            return (
              <div key={m.weekNumber} style={{ display: 'flex', gap: '1rem', marginBottom: '1.125rem', position: 'relative', alignItems: 'flex-start' }}>
                {/* Dot */}
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0, zIndex: 1, marginTop: 2,
                  background: current ? 'var(--primary)' : passed ? 'var(--surface-container-high)' : 'white',
                  border: `2px solid ${current ? 'var(--primary)' : 'var(--outline-variant)'}`,
                  boxShadow: current ? '0 0 0 4px rgba(0,91,191,0.15)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {passed && (
                    <span className="material-symbols-outlined icon-filled" style={{ fontSize: 12, color: 'var(--outline)' }}>check</span>
                  )}
                </div>

                <div style={{ flex: 1, paddingBottom: '0.125rem' }}>
                  <span style={{
                    display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)',
                    background: current ? 'var(--primary)' : 'var(--surface-container-high)',
                    color: current ? 'white' : 'var(--on-surface-variant)',
                    fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.375rem',
                  }}>
                    Week {m.weekNumber}
                  </span>

                  {current ? (
                    <div style={{ background: 'linear-gradient(135deg, #d0dcff 0%, #dce8ff 100%)', borderRadius: 'var(--radius-lg)', padding: '0.875rem', marginTop: '0.25rem' }}>
                      <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)', marginBottom: '0.25rem' }}>{m.title}</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--secondary)', lineHeight: 1.45 }}>{m.description}</p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 600, fontSize: '0.9rem', color: passed ? 'var(--outline)' : 'var(--on-surface)' }}>
                        {m.title}
                      </p>
                      {passed && <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>✓ Complete</span>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Upcoming ANC */}
      {upcomingANCVisits.length > 0 && (
        <Card style={{ padding: '1.25rem' }}>
          <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '0.875rem' }}>
            Upcoming ANC visits
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {upcomingANCVisits.slice(0,3).map(visit => (
              <div key={visit.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--secondary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--secondary)' }}>pregnant_woman</span>
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
      )}


      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
        <button
          onClick={onReset}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--outline)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: 0.7,
          }}
        >
          Reset pregnancy timeline
        </button>
      </div>



    </div>
  )
}

/* ── Mood Logger ─────────────────────────────────── */
function MoodLogger() {
  const [options, setOptions]             = useState<MoodOption | null>(null)
  const [history, setHistory]             = useState<MoodLog[]>([])
  const [selectedMood, setSelectedMood]   = useState<string | null>(null)
  const [selectedCraving, setSelectedCraving] = useState<string | null>(null)
  const [logging, setLogging]             = useState(false)
  const [insight, setInsight]             = useState<string | null>(null)
  const [error, setError]                 = useState('')

  // Load options and history once on mount — no dependency loop
  useEffect(() => {
    api.get<MoodOption>('/api/v1/mood/options').then(setOptions).catch(() => {})
    api.get<{ entries: MoodLog[] }>('/api/v1/mood/history?limit=5')
      .then(r => setHistory(r.entries))
      .catch(() => {})
  }, [])

  const handleLog = async () => {
    if (!selectedMood && !selectedCraving) {
      setError('Please select at least a mood or craving.')
      return
    }
    setLogging(true); setError('')
    try {
      const r = await api.post<{ insight: string }>('/api/v1/mood/log', {
        mood: selectedMood || undefined,
        craving: selectedCraving || undefined,
      })
      setInsight(r.insight)
      setSelectedMood(null); setSelectedCraving(null)
      const h = await api.get<{ entries: MoodLog[] }>('/api/v1/mood/history?limit=5')
      setHistory(h.entries)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to log mood')
    } finally { setLogging(false) }
  }

  const MOOD_EMOJIS: Record<string,string> = {
    HAPPY:'😊',CALM:'😌',ANXIOUS:'😟',TIRED:'😴',SAD:'😢',
    EMOTIONAL:'😭',IRRITABLE:'😤',STRESSED:'😰',ENERGETIC:'⚡',OVERWHELMED:'🌊',
  }
  const CRAVING_EMOJIS: Record<string,string> = {
    SWEET:'🍬',SALTY:'🧂',SPICY:'🌶️',SOUR:'🍋',COLD_DRINKS:'🧃',
    WARM_FOOD:'🍲',NO_APPETITE:'😶',VERY_HUNGRY:'🍽️',NAUSEOUS:'🤢',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <Card style={{ padding: '1.25rem' }}>
        <h3 style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>How are you feeling?</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1.25rem' }}>Log your mood and cravings — instant guidance follows.</p>

        {error && <div style={{ marginBottom: '1rem' }}><StatusBanner type="error" message={error} /></div>}

        {insight && (
          <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--primary-fixed)', borderRadius: 'var(--radius-xl)', borderLeft: '3px solid var(--primary)' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.375rem' }}>✨ Your insight</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--on-surface)', lineHeight: 1.6 }}>{insight}</p>
            <button onClick={() => setInsight(null)} style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Dismiss</button>
          </div>
        )}

        {options && (
          <>
            <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '0.625rem' }}>Mood</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {options.moods.map(m => (
                <button key={m} onClick={() => setSelectedMood(s => s === m ? null : m)} style={{
                  padding: '0.5rem 0.875rem', borderRadius: 'var(--radius-full)',
                  border: `1.5px solid ${selectedMood === m ? 'var(--primary)' : 'var(--outline-variant)'}`,
                  background: selectedMood === m ? 'var(--primary-fixed)' : 'transparent',
                  color: selectedMood === m ? 'var(--primary)' : 'var(--on-surface-variant)',
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.15s',
                }}>
                  <span>{MOOD_EMOJIS[m] ?? '•'}</span>
                  <span>{m.charAt(0) + m.slice(1).toLowerCase()}</span>
                </button>
              ))}
            </div>

            <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '0.625rem' }}>Cravings</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {options.cravings.map(c => (
                <button key={c} onClick={() => setSelectedCraving(s => s === c ? null : c)} style={{
                  padding: '0.5rem 0.875rem', borderRadius: 'var(--radius-full)',
                  border: `1.5px solid ${selectedCraving === c ? 'var(--tertiary)' : 'var(--outline-variant)'}`,
                  background: selectedCraving === c ? 'var(--tertiary-fixed)' : 'transparent',
                  color: selectedCraving === c ? 'var(--tertiary)' : 'var(--on-surface-variant)',
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.15s',
                }}>
                  <span>{CRAVING_EMOJIS[c] ?? '•'}</span>
                  <span>{c.replace(/_/g,' ').charAt(0) + c.replace(/_/g,' ').slice(1).toLowerCase()}</span>
                </button>
              ))}
            </div>

            <Button onClick={handleLog} loading={logging} style={{ width: '100%' }} disabled={!selectedMood && !selectedCraving}>
              Log now
            </Button>
          </>
        )}
      </Card>

      {history.length > 0 && (
        <Card style={{ padding: '1.25rem' }}>
          <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem', marginBottom: '1rem' }}>Recent entries</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {history.map(log => (
              <div key={log.id} style={{ display: 'flex', gap: '0.875rem', padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ flexShrink: 0, fontSize: '1.25rem' }}>
                  {MOOD_EMOJIS[log.mood ?? ''] ?? CRAVING_EMOJIS[log.craving ?? ''] ?? '💭'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    {log.mood    && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)',  background: 'var(--primary-fixed)',  padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)' }}>{log.mood}</span>}
                    {log.craving && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--tertiary)', background: 'var(--tertiary-fixed)', padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)' }}>{log.craving}</span>}
                  </div>
                  {log.insight && <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>{log.insight.slice(0,80)}…</p>}
                  <p style={{ fontSize: '0.75rem', color: 'var(--outline)', marginTop: '0.25rem' }}>
                    {new Date(log.loggedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                    {' at '}
                    {new Date(log.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}


function BabyTab() {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    api.get<any[]>('/api/v1/mother-baby/baby-profile')
      .then(res => setPlans(res))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <Skeleton height={200} />
  }

  if (plans.length === 0 || showForm) {
    return <BabySetupForm onSuccess={(plan) => {
    setPlans([plan])
    setShowForm(false)
    }} />
  }

    return <BabyTimeline 
    plan={plans[0]} 
    onReset={async () => {
      try {
        await api.patch('/api/v1/mother-baby/baby-profile/cancel', {})
        setPlans([])
        setShowForm(true)
      } catch (err) {
        console.error(err)
      }
    }} 
  />
}

function BabySetupForm({ onSuccess }: { onSuccess: (data: any) => void }) {
  const [deliveryDate, setDeliveryDate] = useState('')
  const [babyName, setBabyName] = useState('')
  const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setLoading(true)

      try {
        await api.post('/api/v1/mother-baby/baby-profile', {
          deliveryDate,
          babyName: babyName || undefined,
        })

        const plans = await api.get<any[]>('/api/v1/mother-baby/baby-profile')
        onSuccess(plans[0])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

  return (
    <Card style={{ padding: '2rem' }}>
      <h2 style={{ fontWeight: 700 }}>Create baby profile</h2>

      <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <Input
          label="Delivery date"
          type="date"
          value={deliveryDate}
          onChange={e => setDeliveryDate(e.target.value)}
          required
        />

        <Input
          label="Baby name (optional)"
          value={babyName}
          onChange={e => setBabyName(e.target.value)}
        />

        <Button type="submit" loading={loading}>
          Create vaccination schedule
        </Button>
      </form>
    </Card>
  )
}

function BabyTimeline({ plan, onReset }: { plan: any; onReset: () => void }){
  const events = plan.careEvents ?? []
  const babyName = plan.metadata?.babyName ?? 'Baby'
  const deliveryDate = plan.metadata?.deliveryDate


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <Card style={{
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #dbeafe 0%, #eef6ff 100%)',
        borderRadius: 'var(--radius-2xl)',
      }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
          Baby profile
        </p>

        <h2 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.5rem', marginTop: '0.25rem' }}>
          {babyName}'s vaccination journey
        </h2>

        {deliveryDate && (
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginTop: '0.35rem' }}>
            Born on {new Date(deliveryDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}

        <div style={{
          marginTop: '1rem',
          padding: '0.875rem',
          background: 'rgba(255,255,255,0.7)',
          borderRadius: 'var(--radius-xl)',
        }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
            Vaccination reminders are scheduled before each due date to help you stay on track.
          </p>
        </div>
      </Card>

      <Card style={{ padding: '1.25rem' }}>
        <h3 style={{
          fontFamily: 'var(--font-headline)',
          fontWeight: 800,
          fontSize: '1.125rem',
          marginBottom: '1.25rem',
        }}>
          Vaccination timeline
        </h3>

        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: 17,
            top: 0,
            bottom: 0,
            width: 2,
            background: 'var(--outline-variant)',
          }} />

          {events.map((e: any) => {
            const dueDate = new Date(e.scheduledFor)
            const isPast = dueDate.getTime() < Date.now()
            const vaccines = Array.isArray(e.metadata?.vaccines)
              ? e.metadata.vaccines.join(', ')
              : e.description

            return (
              <div key={e.id} style={{
                display: 'flex',
                gap: '1rem',
                position: 'relative',
                marginBottom: '1rem',
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: isPast ? 'var(--surface-container-high)' : 'var(--primary-fixed)',
                  border: '2px solid var(--outline-variant)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                  flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined icon-sm" style={{ color: isPast ? 'var(--outline)' : 'var(--primary)' }}>
                    vaccines
                  </span>
                </div>

                <div style={{
                  flex: 1,
                  padding: '0.875rem',
                  background: 'var(--surface-container-low)',
                  borderRadius: 'var(--radius-lg)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem' }}>
                      {e.metadata?.ageLabel ?? e.title}
                    </p>

                    <Badge variant={isPast ? 'neutral' : 'primary'}>
                      {e.status}
                    </Badge>
                  </div>

                  <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>
                    {dueDate.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>

                  <p style={{ fontSize: '0.875rem', color: 'var(--on-surface)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                    {vaccines}
                  </p>

                  <p style={{ fontSize: '0.8125rem', color: 'var(--outline)', marginTop: '0.5rem' }}>
                    Tip: Keep your baby’s immunization card updated after this visit.
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>


      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
        <button
          onClick={onReset}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--outline)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: 0.7,
          }}
        >
          Reset baby timeline
        </button>
      </div>
      
    </div>
  )
}

/* ── Mother & Baby Page ─────────────────────────── */
type Tab = 'timeline' | 'mood' | 'baby'

export function MotherBabyPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as Tab) ?? 'timeline'
  const setTab = useCallback((t: Tab) => setSearchParams({ tab: t }), [setSearchParams])

  // Timeline state lives HERE in the parent — survives tab switches without re-fetching
  const [timelineState, setTimelineState] = useState<TimelineState>({ status: 'loading' })
  const [success, setSuccess] = useState('')
  const timeoutRef = useRef<number | null>(null)
  const [showResetModal, setShowResetModal] = useState(false)
  

  useEffect(() => {
    // Only fetch once on mount. If already loaded, do nothing.
    // This prevents re-fetching when the user switches tabs.
    let cancelled = false

    api.get<Timeline>('/api/v1/mother-baby/timeline')
      .then(data => {
        if (!cancelled) setTimelineState({ status: 'ready', data })
      })
      .catch(err => {
        if (cancelled) return
        // 404 = no pregnancy yet → show setup form (not an error)
        const is404 = err instanceof ApiError && err.status === 404
        setTimelineState(is404 ? { status: 'setup' } : { status: 'error', message: err.message ?? 'Failed to load timeline' })
      })

    return () => { cancelled = true }
  }, []) // ← empty dep array: fetch exactly once per mount

  const handleSetupSuccess = useCallback((timeline: Timeline) => {
    setTimelineState({ status: 'ready', data: timeline })
  }, [])

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'timeline', label: 'Timeline', icon: 'pregnant_woman' },
    { id: 'mood',     label: 'Mood',     icon: 'mood'           },
    { id: 'baby',     label: 'Baby',     icon: 'child_care'     },
  ]



  const handleConfirmReset = async () => {
    try {
      await api.patch('/api/v1/mother-baby/pregnancy/cancel', {})
      setTimelineState({ status: 'setup' })
      setSuccess('Pregnancy timeline reset. You can set it up again when ready.')

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => {
        setSuccess('')
      }, 5000)
    } catch (err) {
      console.error(err)
    } finally {
      setShowResetModal(false)
    }
  }

  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: 680, margin: '0 auto' }}>
      <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--on-surface)' }}>Mother & Baby</h1>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginTop: '0.2rem' }}>Your pregnancy journey and wellness tracker.</p>
      </div>

      {/* Tab bar */}
      <div className="animate-fade-up delay-100" style={{ display: 'flex', gap: '0.375rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)', padding: '0.3rem', marginBottom: '1.5rem' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
            padding: '0.5625rem 0.75rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: tab === t.id ? 'var(--surface-container-lowest)' : 'transparent',
            color: tab === t.id ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontFamily: 'var(--font-headline)', fontWeight: tab === t.id ? 700 : 500,
            fontSize: '0.875rem', cursor: 'pointer',
            boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.2s',
          }}>
            <span className="material-symbols-outlined icon-sm">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {success && (
        <div style={{ marginBottom: '1rem' }}>
          <StatusBanner type="success" message={success} />
        </div>
      )}

      <div className="animate-fade-up delay-200">
        {/* Timeline tab — renders setup or display based on lifted state, no re-fetching on tab switch */}
        {tab === 'timeline' && (() => {
          switch (timelineState.status) {
            case 'loading':
              return <Skeleton height={320} style={{ borderRadius: 'var(--radius-2xl)' }} />
            case 'setup':
              return <PregnancySetupForm onSuccess={handleSetupSuccess} />
            case 'ready':
              return (
                <PregnancyTimelineView
                  timeline={timelineState.data}
                  onReset={() => setShowResetModal(true)}
                />
              )
            case 'error':
              return (
                <Card style={{ padding: '2rem' }}>
                  <EmptyState icon="wifi_off" title="Couldn't load timeline" description={timelineState.message}
                    action={
                      <Button size="sm" icon="refresh" onClick={() => {
                        setTimelineState({ status: 'loading' })
                        api.get<Timeline>('/api/v1/mother-baby/timeline')
                          .then(data => setTimelineState({ status: 'ready', data }))
                          .catch(() => setTimelineState({ status: 'setup' }))
                      }}>Retry</Button>
                    }
                  />
                </Card>
              )
          }
        })()}

        {tab === 'mood' && <MoodLogger />}

        {tab === 'baby' && <BabyTab />}
      </div>


          {showResetModal && (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <Card style={{ padding: '1.5rem', width: '90%', maxWidth: 400 }}>
          <h3 style={{
            fontFamily: 'var(--font-headline)',
            fontWeight: 700,
            marginBottom: '0.5rem'
          }}>
            Reset pregnancy timeline?
          </h3>

          <p style={{
            fontSize: '0.875rem',
            color: 'var(--on-surface-variant)',
            marginBottom: '1.25rem'
          }}>
            This will clear your current pregnancy timeline. You can set it up again afterwards.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>

            <Button variant="danger" onClick={handleConfirmReset}>
              Reset
            </Button>
          </div>
        </Card>
      </div>
    )}
    </div>
  )
}

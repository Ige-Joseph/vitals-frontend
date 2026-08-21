import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Card, EmptyState, Skeleton, StatusBanner } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { BabySection } from './BabySection'
import { MoodLogger } from './MoodLogger'
import { PregnancySetupForm, PregnancyTimelineView } from './PregnancySection'
import type { MotherBabyTab, PregnancyTimeline, PregnancyTimelineState } from './mother-baby.types'

const TABS: { id: MotherBabyTab; label: string; icon: string }[] = [
  { id: 'timeline', label: 'Timeline', icon: 'pregnant_woman' },
  { id: 'mood', label: 'Mood', icon: 'mood' },
  { id: 'baby', label: 'Baby', icon: 'child_care' },
]

const TAB_IDS = new Set<MotherBabyTab>(TABS.map(({ id }) => id))

function isMotherBabyTab(value: string | null): value is MotherBabyTab {
  return value !== null && TAB_IDS.has(value as MotherBabyTab)
}

type TimelineContentProps = {
  state: PregnancyTimelineState
  onSetupSuccess: (timeline: PregnancyTimeline) => void
  onReset: () => void
  onRetry: () => void
}

function TimelineContent({ state, onSetupSuccess, onReset, onRetry }: TimelineContentProps) {
  switch (state.status) {
    case 'loading':
      return <Skeleton height={320} style={{ borderRadius: 'var(--radius-2xl)' }} />
    case 'setup':
      return <PregnancySetupForm onSuccess={onSetupSuccess} />
    case 'ready':
      return <PregnancyTimelineView timeline={state.data} onReset={onReset} />
    case 'error':
      return (
        <Card style={{ padding: '2rem' }}>
          <EmptyState
            icon="wifi_off"
            title="Couldn't load timeline"
            description={state.message}
            action={<Button size="sm" icon="refresh" onClick={onRetry}>Retry</Button>}
          />
        </Card>
      )
  }
}

export function MotherBabyPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab = isMotherBabyTab(requestedTab) ? requestedTab : 'timeline'
  const [timelineState, setTimelineState] = useState<PregnancyTimelineState>({ status: 'loading' })
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)
  const successTimeoutRef = useRef<number | null>(null)

  const loadTimeline = useCallback(async () => {
    setTimelineState({ status: 'loading' })
    try {
      const timeline = await api.get<PregnancyTimeline>('/api/v1/mother-baby/timeline')
      setTimelineState({ status: 'ready', data: timeline })
    } catch (requestError) {
      const isNotFound = requestError instanceof ApiError && requestError.status === 404
      setTimelineState(isNotFound
        ? { status: 'setup' }
        : {
            status: 'error',
            message: requestError instanceof ApiError ? requestError.message : 'Failed to load timeline',
          })
    }
  }, [])

  useEffect(() => {
    void loadTimeline()
    return () => {
      if (successTimeoutRef.current) window.clearTimeout(successTimeoutRef.current)
    }
  }, [loadTimeline])

  const setTab = useCallback((nextTab: MotherBabyTab) => {
    setSearchParams({ tab: nextTab })
  }, [setSearchParams])

  const handleSetupSuccess = useCallback((timeline: PregnancyTimeline) => {
    setTimelineState({ status: 'ready', data: timeline })
  }, [])

  const handleConfirmReset = async () => {
    setResetting(true)
    setError('')
    try {
      await api.patch('/api/v1/mother-baby/pregnancy/cancel', {})
      setTimelineState({ status: 'setup' })
      setSuccess('Pregnancy timeline reset. You can set it up again when ready.')

      if (successTimeoutRef.current) window.clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = window.setTimeout(() => setSuccess(''), 5000)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Failed to reset the pregnancy timeline.')
    } finally {
      setResetting(false)
      setShowResetModal(false)
    }
  }

  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: 680, margin: '0 auto' }}>
      <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--on-surface)' }}>Mother &amp; Baby</h1>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginTop: '0.2rem' }}>Your pregnancy journey and wellness tracker.</p>
      </div>

      <div className="animate-fade-up delay-100" role="tablist" aria-label="Mother and baby sections" style={{ display: 'flex', gap: '0.375rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)', padding: '0.3rem', marginBottom: '1.5rem' }}>
        {TABS.map(({ id, label, icon }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
            padding: '0.5625rem 0.75rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: tab === id ? 'var(--surface-container-lowest)' : 'transparent',
            color: tab === id ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontFamily: 'var(--font-headline)', fontWeight: tab === id ? 700 : 500,
            fontSize: '0.875rem', cursor: 'pointer', boxShadow: tab === id ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s',
          }}>
            <span className="material-symbols-outlined icon-sm" aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {success ? <div style={{ marginBottom: '1rem' }}><StatusBanner type="success" message={success} /></div> : null}
      {error ? <div style={{ marginBottom: '1rem' }}><StatusBanner type="error" message={error} /></div> : null}

      <div className="animate-fade-up delay-200">
        {tab === 'timeline' ? (
          <TimelineContent
            state={timelineState}
            onSetupSuccess={handleSetupSuccess}
            onReset={() => setShowResetModal(true)}
            onRetry={() => void loadTimeline()}
          />
        ) : null}
        {tab === 'mood' ? <MoodLogger /> : null}
        {tab === 'baby' ? <BabySection /> : null}
      </div>

      {showResetModal ? (
        <div role="presentation" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <Card role="dialog" aria-modal="true" aria-labelledby="pregnancy-reset-title" style={{ padding: '1.5rem', width: '90%', maxWidth: 400 }}>
            <h3 id="pregnancy-reset-title" style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, marginBottom: '0.5rem' }}>Reset pregnancy timeline?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1.25rem' }}>
              This will clear your current pregnancy timeline. You can set it up again afterwards.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setShowResetModal(false)} disabled={resetting}>Cancel</Button>
              <Button variant="danger" onClick={handleConfirmReset} loading={resetting} disabled={resetting}>Reset</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

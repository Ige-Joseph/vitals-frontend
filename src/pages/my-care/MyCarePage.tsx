import { lazy } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AsyncRoute } from '@/components/routing/AsyncRoute'
import { CareTimeline } from '@/components/care/CareTimeline'
import type { CareTab } from './my-care.types'

const MedicationsPage = lazy(() => import('@/pages/MedicationsPage').then((module) => ({ default: module.MedicationsPage })))
const AppointmentsPage = lazy(() => import('@/pages/AppointmentsPage').then((module) => ({ default: module.AppointmentsPage })))
const DrugDetection = lazy(() => import('./DrugDetection').then((module) => ({ default: module.DrugDetection })))
const SymptomChecker = lazy(() => import('./SymptomChecker').then((module) => ({ default: module.SymptomChecker })))

const CARE_TABS: { id: CareTab; label: string; icon: string }[] = [
  { id: 'timeline', label: 'Timeline', icon: 'event_note' },
  { id: 'medications', label: 'Medications', icon: 'pill' },
  { id: 'appointments', label: 'Appointments', icon: 'event' },
  { id: 'symptoms', label: 'Symptom AI', icon: 'psychology' },
  { id: 'drug', label: 'Drug Information', icon: 'biotech' },
]

const CARE_TAB_IDS = new Set<CareTab>(CARE_TABS.map(({ id }) => id))

function isCareTab(value: string | null): value is CareTab {
  return value !== null && CARE_TAB_IDS.has(value as CareTab)
}

function CareTabContent({ tab, personId }: { tab: CareTab; personId?: string }) {
  switch (tab) {
    case 'medications':
      return <AsyncRoute label="medications"><MedicationsPage embedded /></AsyncRoute>
    case 'appointments':
      return <AsyncRoute label="appointments"><AppointmentsPage embedded personId={personId} /></AsyncRoute>
    case 'symptoms':
      return <AsyncRoute label="symptom checker"><SymptomChecker /></AsyncRoute>
    case 'drug':
      return <AsyncRoute label="drug information"><DrugDetection /></AsyncRoute>
    case 'timeline':
    default:
      return <CareTimeline />
  }
}

export function MyCarePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab = isCareTab(requestedTab) ? requestedTab : 'timeline'

  const setTab = (nextTab: CareTab) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', nextTab)
    setSearchParams(next, { replace: true })
  }

  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: 680, margin: '0 auto' }}>
      <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--on-surface)' }}>My Care</h1>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginTop: '0.2rem' }}>Medications, symptom guidance, and drug information.</p>
      </div>

      <div className="animate-fade-up delay-100" role="tablist" aria-label="Care sections" style={{ display: 'flex', gap: '0.375rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)', padding: '0.3rem', marginBottom: '1.5rem' }}>
        {CARE_TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
              padding: '0.5625rem 0.375rem', borderRadius: 'var(--radius-lg)', border: 'none',
              background: tab === id ? 'var(--surface-container-lowest)' : 'transparent',
              color: tab === id ? 'var(--primary)' : 'var(--on-surface-variant)',
              fontFamily: 'var(--font-headline)', fontWeight: tab === id ? 700 : 500,
              fontSize: '0.8125rem', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: tab === id ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <span className="material-symbols-outlined icon-sm" aria-hidden="true">{icon}</span>
            <span className="tab-label-text">{label}</span>
          </button>
        ))}
      </div>

      <div className="animate-fade-up delay-200">
        <CareTabContent tab={tab} personId={searchParams.get('personId') ?? undefined} />
      </div>

      <style>{`.tab-label-text { display: none; } @media (min-width: 420px) { .tab-label-text { display: inline; } }`}</style>
    </div>
  )
}

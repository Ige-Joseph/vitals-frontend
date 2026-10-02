import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { Button, Card, EmptyState, Skeleton, StatusBanner } from '@/components/ui'
import { ContextPhoto } from '@/components/ui/ContextPhoto'
import { Medication } from '@/components/medications/medication.types'
import { MedicationCard } from '@/components/medications/MedicationCard'
import { AddMedicationModal } from '@/components/medications/AddMedicationModal'


/* ── Medications page ───────────────────────────── */
// `embedded` prop kept for backwards compat when used inside MyCarePage tabs
export function MedicationsPage({ embedded }: { embedded?: boolean } = {}) {
  const [meds, setMeds]       = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [adding, setAdding]   = useState(false)
  const [success, setSuccess] = useState('')
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  const load = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await api.get<Medication[]>('/api/v1/medications')

    setMeds(prev => {
      const locallyCompletedIds = new Set(
        prev
          .filter(m => m.carePlan.status === 'COMPLETED')
          .map(m => m.carePlan.id)
      )

      const currentRemoved = removedIds // stabilize reference

      return data
        .filter(m => !currentRemoved.has(m.carePlan.id))
        .map(m =>
          locallyCompletedIds.has(m.carePlan.id)
            ? { ...m, carePlan: { ...m.carePlan, status: 'COMPLETED' } }
            : m
        )
    })
    } catch (requestError) {
      setLoadError(requestError instanceof ApiError ? requestError.message : 'Could not load your medications. Please try again.')
    }
    finally { setLoading(false) }
  }

  // Fetch once on mount — no unstable dependency loop
  useEffect(() => { load() }, [])


  const handleDeactivate = async (carePlanId: string) => {
    if (busyId) return
    setBusyId(carePlanId)
    setError('')

    try {
      await api.delete(`/api/v1/medications/${carePlanId}`)
      setRemovedIds(prev => new Set(prev).add(carePlanId))
      setMeds(prev => prev.filter(m => m.carePlan.id !== carePlanId))

      setTimeout(() => {
        window.dispatchEvent(new Event('vitals:refresh-timeline'))
      }, 100)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Could not stop this medication. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  const handleAddSuccess = (calendarSynced?: boolean) => {
    setAdding(false)
    setSuccess(
      calendarSynced
        ? 'Medication plan created and synced to Google Calendar.'
        : 'Medication plan created successfully.'
    )
    load()
    const t = setTimeout(() => setSuccess(''), 5000)
    return () => clearTimeout(t)
  }

  const active = meds.filter(m => m.carePlan.status === 'ACTIVE')
  const past   = meds.filter(m => m.carePlan.status !== 'ACTIVE')

  return (
    // No overflow:hidden on this container — modal uses a portal anyway, but belt-and-suspenders
    <div style={{ padding: embedded ? 0 : 'clamp(1rem, 4vw, 2rem)', maxWidth: 680, margin: '0 auto' }}>
      {!embedded && (
        <div className="medications-page-header animate-fade-up">
          <div>
            <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--on-surface)' }}>Medications</h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginTop: '0.2rem' }}>Track your doses and stay consistent.</p>
          </div>
          <ContextPhoto
            src="/images/contextual/medication-context.webp"
            srcSet="/images/contextual/medication-context-480.webp 320w, /images/contextual/medication-context.webp 683w"
            sizes="(max-width: 640px) calc(100vw - 2rem), 150px"
            width={683}
            height={1024}
            alt=""
            className="medications-header-photo"
          />
          <Button icon="add" onClick={() => setAdding(true)} size="sm">Add</Button>
        </div>
      )}

      {embedded && (
        <div className="medications-embedded-header">
          <ContextPhoto
            src="/images/contextual/medication-context.webp"
            srcSet="/images/contextual/medication-context-480.webp 320w, /images/contextual/medication-context.webp 683w"
            sizes="(max-width: 640px) calc(100vw - 2rem), 260px"
            width={683}
            height={1024}
            alt=""
            className="medications-header-photo"
          />
          <Button icon="add" onClick={() => setAdding(true)} size="sm">Add medication</Button>
        </div>
      )}

      {success && <div style={{ marginBottom: '1rem' }}><StatusBanner type="success" message={success} /></div>}
      {error && <div style={{ marginBottom: '1rem' }}><StatusBanner type="error" message={error} /></div>}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1,2,3].map(i => <Skeleton key={i} height={130} style={{ borderRadius: 'var(--radius-xl)' }} />)}
        </div>
      ) : loadError ? (
        <Card style={{ padding: '2.5rem 1.5rem' }}>
          <EmptyState
            icon="wifi_off"
            title="Couldn't load medications"
            description={loadError}
            action={<Button icon="refresh" onClick={() => void load()}>Try again</Button>}
          />
        </Card>
      ) : meds.length === 0 ? (
        <Card style={{ padding: '2.5rem 1.5rem' }}>
          <EmptyState
            icon="pill"
            title="No medications yet"
            description="Add your first medication plan and we'll send a reminder at every dose time."
            action={<Button icon="add" onClick={() => setAdding(true)}>Add medication</Button>}
          />
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Active ({active.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {active.map(m => <MedicationCard key={m.id} med={m} onDeactivate={handleDeactivate} busy={busyId === m.carePlan.id} disabled={busyId !== null && busyId !== m.carePlan.id} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Past ({past.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {past.map(m => <MedicationCard key={m.id} med={m} onDeactivate={handleDeactivate} busy={busyId === m.carePlan.id} disabled={busyId !== null && busyId !== m.carePlan.id} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Portal modal — rendered outside the DOM tree, never clipped */}
      {adding && (
      <AddMedicationModal
        onSuccess={handleAddSuccess}
        onCancel={() => setAdding(false)}
      />
       )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button, Card, EmptyState, Skeleton, StatusBanner } from '@/components/ui'
import { Medication } from '@/components/medications/medication.types'
import { MedicationCard } from '@/components/medications/MedicationCard'
import { AddMedicationModal } from '@/components/medications/AddMedicationModal'






/* ── Medications page ───────────────────────────── */
// `embedded` prop kept for backwards compat when used inside MyCarePage tabs
export function MedicationsPage({ embedded }: { embedded?: boolean } = {}) {
  const [meds, setMeds]       = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState(false)
  const [success, setSuccess] = useState('')
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.get<Medication[]>('/api/v1/medications')

    setMeds(prev => {
      const locallyCompletedIds = new Set(
        prev
          .filter(m => m.carePlan.status === 'COMPLETED')
          .map(m => m.carePlan.id)
      )

      const currentRemoved = removedIds // 👈 stabilize reference

      return data
        .filter(m => !currentRemoved.has(m.carePlan.id))
        .map(m =>
          locallyCompletedIds.has(m.carePlan.id)
            ? { ...m, carePlan: { ...m.carePlan, status: 'COMPLETED' } }
            : m
        )
    })
    } catch { /* silent — empty state handles it */ }
    finally { setLoading(false) }
  }

  // Fetch once on mount — no unstable dependency loop
  useEffect(() => { load() }, [])


  const handleDeactivate = async (carePlanId: string) => {
    const previous = meds

    setRemovedIds(prev => new Set(prev).add(carePlanId))

    setMeds(prev => prev.filter(m => m.carePlan.id !== carePlanId))

    try {
      await api.delete(`/api/v1/medications/${carePlanId}`)

      setTimeout(() => {
        window.dispatchEvent(new Event('vitals:refresh-timeline'))
      }, 100)
    } catch {
      setMeds(previous)
      setRemovedIds(prev => {
        const next = new Set(prev)
        next.delete(carePlanId)
        return next
      })
    }
  }

  const handleAddSuccess = () => {
    setAdding(false)
    setSuccess('Medication plan created — reminders have been scheduled.')
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }} className="animate-fade-up">
          <div>
            <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--on-surface)' }}>Medications</h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginTop: '0.2rem' }}>Track your doses and stay consistent.</p>
          </div>
          <Button icon="add" onClick={() => setAdding(true)} size="sm">Add</Button>
        </div>
      )}

      {embedded && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <Button icon="add" onClick={() => setAdding(true)} size="sm">Add medication</Button>
        </div>
      )}

      {success && <div style={{ marginBottom: '1rem' }}><StatusBanner type="success" message={success} /></div>}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1,2,3].map(i => <Skeleton key={i} height={130} style={{ borderRadius: 'var(--radius-xl)' }} />)}
        </div>
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
                {active.map(m => <MedicationCard key={m.id} med={m} onDeactivate={handleDeactivate} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Past ({past.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {past.map(m => <MedicationCard key={m.id} med={m} onDeactivate={handleDeactivate} />)}
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

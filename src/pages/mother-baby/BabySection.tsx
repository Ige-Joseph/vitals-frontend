import { createPortal } from 'react-dom'
import { useEffect, useState, type FormEvent } from 'react'
import { Badge, Button, Card, Input, Skeleton, StatusBanner } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import type { BabyPlan } from './mother-baby.types'

type BabySetupFormProps = {
  onSuccess: (plan: BabyPlan) => void
}

function BabySetupForm({ onSuccess }: BabySetupFormProps) {
  const [deliveryDate, setDeliveryDate] = useState('')
  const [babyName, setBabyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await api.post('/api/v1/mother-baby/baby-profile', {
        deliveryDate,
        babyName: babyName || undefined,
      })
      const plans = await api.get<BabyPlan[]>('/api/v1/mother-baby/baby-profile')
      if (plans[0]) onSuccess(plans[0])
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Failed to create the baby profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card style={{ padding: '2rem' }}>
      <h2 style={{ fontWeight: 700 }}>Create baby profile</h2>
      {error ? <div style={{ marginTop: '1rem' }}><StatusBanner type="error" message={error} /></div> : null}

      <form onSubmit={handleSubmit} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input
          label="Delivery date"
          type="date"
          value={deliveryDate}
          onChange={event => setDeliveryDate(event.target.value)}
          required
        />
        <Input
          label="Baby name (optional)"
          value={babyName}
          onChange={event => setBabyName(event.target.value)}
        />
        <Button type="submit" loading={loading}>Create vaccination schedule</Button>
      </form>
    </Card>
  )
}

function BabyTimeline({ plan, onReset }: { plan: BabyPlan; onReset: () => void }) {
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
        <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Baby profile</p>
        <h2 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.5rem', marginTop: '0.25rem' }}>
          {babyName}&apos;s vaccination journey
        </h2>
        {deliveryDate ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginTop: '0.35rem' }}>
            Born on {new Date(deliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        ) : null}
        <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'rgba(255,255,255,0.7)', borderRadius: 'var(--radius-xl)' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
            Vaccination reminders are scheduled before each due date to help you stay on track.
          </p>
        </div>
      </Card>

      <Card style={{ padding: '1.25rem' }}>
        <h3 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.125rem', marginBottom: '1.25rem' }}>Vaccination timeline</h3>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 17, top: 0, bottom: 0, width: 2, background: 'var(--outline-variant)' }} />
          {events.map(event => {
            const dueDate = new Date(event.scheduledFor)
            const isPast = dueDate.getTime() < Date.now()
            const vaccines = Array.isArray(event.metadata?.vaccines)
              ? event.metadata.vaccines.join(', ')
              : event.description

            return (
              <div key={event.id} style={{ display: 'flex', gap: '1rem', position: 'relative', marginBottom: '1rem' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: isPast ? 'var(--surface-container-high)' : 'var(--primary-fixed)',
                  border: '2px solid var(--outline-variant)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', zIndex: 1, flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined icon-sm" aria-hidden="true" style={{ color: isPast ? 'var(--outline)' : 'var(--primary)' }}>vaccines</span>
                </div>
                <div style={{ flex: 1, padding: '0.875rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem' }}>{event.metadata?.ageLabel ?? event.title}</p>
                    <Badge variant={isPast ? 'neutral' : 'primary'}>{event.status}</Badge>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>
                    {dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--on-surface)', marginTop: '0.5rem', lineHeight: 1.5 }}>{vaccines}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--outline)', marginTop: '0.5rem' }}>
                    Tip: Keep your baby&apos;s immunization card updated after this visit.
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
        <button type="button" onClick={onReset} style={{
          background: 'none', border: 'none', color: 'var(--outline)', fontSize: '0.8125rem',
          fontWeight: 600, cursor: 'pointer', opacity: 0.7,
        }}>
          Reset baby timeline
        </button>
      </div>
    </div>
  )
}

export function BabySection() {
  const [plans, setPlans] = useState<BabyPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void api.get<BabyPlan[]>('/api/v1/mother-baby/baby-profile')
      .then(setPlans)
      .catch(requestError => {
        setError(requestError instanceof ApiError ? requestError.message : 'Failed to load the baby profile.')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleReset = async () => {
    setResetting(true)
    setError('')
    try {
      await api.patch('/api/v1/mother-baby/baby-profile/cancel', {})
      setPlans([])
      setShowForm(true)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Failed to reset the baby timeline.')
    } finally {
      setResetting(false)
      setShowResetModal(false)
    }
  }

  if (loading) return <Skeleton height={200} />

  if (plans.length === 0 || showForm) {
    return (
      <>
        {error ? <div style={{ marginBottom: '1rem' }}><StatusBanner type="error" message={error} /></div> : null}
        <BabySetupForm onSuccess={plan => {
          setPlans([plan])
          setShowForm(false)
        }} />
      </>
    )
  }

  return (
    <>
      {error ? <div style={{ marginBottom: '1rem' }}><StatusBanner type="error" message={error} /></div> : null}
      <BabyTimeline plan={plans[0]} onReset={() => setShowResetModal(true)} />

      {showResetModal ? createPortal(
        <div role="presentation" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem',
        }}>
          <Card role="dialog" aria-modal="true" aria-labelledby="baby-reset-title" style={{ padding: '1.5rem', width: '90%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 id="baby-reset-title" style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, marginBottom: '0.5rem' }}>Reset baby timeline?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1.25rem' }}>
              This will clear the current vaccination schedule. You can create a new one afterwards.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setShowResetModal(false)} disabled={resetting}>Cancel</Button>
              <Button variant="danger" onClick={handleReset} loading={resetting} disabled={resetting}>Reset</Button>
            </div>
          </Card>
        </div>,
        document.body,
      ) : null}
    </>
  )
}

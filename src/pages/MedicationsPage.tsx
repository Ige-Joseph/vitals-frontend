import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { api, ApiError } from '@/lib/api'
import { Button, Input, Card, EmptyState, Badge, Skeleton, StatusBanner } from '@/components/ui'
import { usePushNotifications } from '@/hooks/usePushNotifications'

/* ── Types ─────────────────────────────────────── */
interface Medication {
  id: string; carePlanId: string; name: string; dosage: string
  frequency: string; startDate: string; endDate?: string
  instructions?: string
  carePlan: { id: string; status: string; title: string }
}

const FREQUENCIES = [
  { value: 'ONCE_DAILY', label: 'Once daily' },
  { value: 'TWICE_DAILY', label: 'Twice daily' },
  { value: 'THREE_TIMES_DAILY', label: 'Three times daily' },
]
const FREQ_LABELS = Object.fromEntries(FREQUENCIES.map(f => [f.value, f.label]))

/* ── Medication card ────────────────────────────── */
function MedCard({ med, onDeactivate }: { med: Medication; onDeactivate: (id: string) => void }) {
  const active = med.carePlan.status === 'ACTIVE'
  return (
    <div style={{
      background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)',
      padding: '1.25rem', boxShadow: 'var(--shadow-sm)', opacity: active ? 1 : 0.65,
      borderLeft: `3px solid ${active ? 'var(--primary)' : 'var(--outline-variant)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 20 }}>pill</span>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>{med.name}</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>{med.dosage}</p>
          </div>
        </div>
        <Badge variant={active ? 'primary' : 'neutral'}>{active ? 'Active' : 'Completed'}</Badge>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Frequency</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--on-surface)' }}>{FREQ_LABELS[med.frequency] ?? med.frequency}</p>
        </div>
        {med.startDate && (
          <div>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Started</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface)' }}>
              {new Date(med.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        )}
        {med.instructions && (
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Note</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{med.instructions}</p>
          </div>
        )}
      </div>

      {active && (
        <button onClick={() => onDeactivate(med.carePlan.id)} style={{
          marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--error)',
          background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0,
        }}>
          Stop medication
        </button>
      )}
    </div>
  )
}

/* ── Add medication modal ───────────────────────── */
// Rendered via ReactDOM.createPortal into document.body so position:fixed
// never gets clipped by a parent with overflow:hidden or overflow:auto.
function AddMedicationForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const { requestPermissionAndRegister, pushState } = usePushNotifications()
  const [form, setForm] = useState({
    name: '', dosage: '', frequency: 'ONCE_DAILY',
    startDate: new Date().toISOString().split('T')[0],
    durationDays: 7, instructions: '',
  })
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [pushRequested, setPushRequested] = useState(false)
  const [customTimes, setCustomTimes] = useState<string[]>(['08:00'])


    useEffect(() => {
    const defaults: Record<string, string[]> = {
      ONCE_DAILY: ['08:00'],
      TWICE_DAILY: ['08:00', '20:00'],
      THREE_TIMES_DAILY: ['08:00', '14:00', '20:00'],
    }

    setCustomTimes(defaults[form.frequency] ?? ['08:00'])
  }, [form.frequency])



  // Prevent body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const setField = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  //   const customTimesByFrequency: Record<string, string[]> = {
  //   ONCE_DAILY: ['08:00'],
  //   TWICE_DAILY: ['08:00', '20:00'],
  //   THREE_TIMES_DAILY: ['08:00', '14:00', '20:00'],
  // }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError('')
    if (!form.name.trim() || !form.dosage.trim()) {
      setError('Medication name and dosage are both required.')
      return
    }

    // Ask for push permission exactly here — user has chosen to set up reminders
    if (!pushRequested && pushState !== 'enabled') {
      setPushRequested(true)

      try {
        await requestPermissionAndRegister()
      } catch {
        // Do not block medication creation if push setup fails
      }
    }

    setLoading(true)
    try {
      await api.post('/api/v1/medications', {
        name: form.name.trim(),
        dosage: form.dosage.trim(),
        frequency: form.frequency,
        startDate: new Date(form.startDate).toISOString().split('T')[0],
        durationDays: Number(form.durationDays),

        // 👇 ADD THIS (VERY IMPORTANT)
        customTimes,

        instructions: form.instructions.trim() || undefined,
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create medication plan')
    } finally {
      setLoading(false)
    }
  }

  const modal = (
    // Overlay — sits in document.body via portal, never clipped
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(24,28,32,0.55)',
       display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      {/* Sheet */}
      <div
        style={{
          background: 'var(--surface-container-lowest)',
          borderRadius: 'var(--radius-2xl)',
          padding: '1.5rem',
          width: '100%', maxWidth: 520,
          maxHeight: '92dvh', overflowY: 'auto',
          animation: 'fadeUp 0.28s cubic-bezier(0.34,1.2,0.64,1)',
          // Ensure the sheet itself never clips its children
          willChange: 'transform',
        }}
        // Stop clicks inside the sheet from bubbling to the overlay
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--outline-variant)', margin: '0 auto 1.25rem' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--on-surface)' }}>
            Add medication
          </h2>
          <button onClick={onCancel} aria-label="Close" style={{
            background: 'var(--surface-container)', border: 'none', cursor: 'pointer',
            width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)',
          }}>
            <span className="material-symbols-outlined icon-sm">close</span>
          </button>
        </div>

        {/* Reminder opt-in info */}
        <div style={{ padding: '0.75rem 1rem', background: 'var(--primary-fixed)', borderRadius: 'var(--radius-lg)', marginBottom: '1.25rem', display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
          <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }}>notifications_active</span>
          <p style={{ fontSize: '0.8125rem', color: 'var(--on-primary-fixed-variant)', lineHeight: 1.55 }}>
            After saving, we'll ask for notification permission so you receive a reminder at each dose time.
          </p>
        </div>

        {error && <div style={{ marginBottom: '1rem' }}><StatusBanner type="error" message={error} /></div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Medication name"
            placeholder="e.g. Paracetamol, Folic Acid"
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Dosage"
            placeholder="e.g. 500mg, 1 tablet"
            value={form.dosage}
            onChange={e => setField('dosage', e.target.value)}
            required
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface-variant)', fontFamily: 'var(--font-headline)' }}>
              Frequency
            </label>
            <select
              className="input-base"
              value={form.frequency}
              onChange={e => setField('frequency', e.target.value)}
            >
              {FREQUENCIES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              Reminder times
            </label>

            <p style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>
              Set when you want to be reminded
            </p>

            {customTimes.map((time, i) => (
              <input
                key={i}
                type="time"
                value={time}
                onChange={(e) => {
                  const updated = [...customTimes]
                  updated[i] = e.target.value
                  setCustomTimes(updated)
                }}
                className="input-base"
              />
            ))}
          </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={e => setField('startDate', e.target.value)}
              required
            />
            <Input
              label="Duration (days)"
              type="number"
              min={1}
              max={365}
              value={form.durationDays}
              onChange={e => setField('durationDays', parseInt(e.target.value) || 1)}
              required
            />
          </div>

          <Input
            label="Instructions (optional)"
            placeholder="e.g. Take after food, with water"
            value={form.instructions}
            onChange={e => setField('instructions', e.target.value)}
          />

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.25rem', paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
            <Button type="button" variant="ghost" onClick={onCancel} style={{ flex: 1 }}>Cancel</Button>
            <Button type="submit" loading={loading} disabled={loading} style={{ flex: 2 }}> Save medication </Button>
          </div>
        </form>
      </div>
    </div>
  )

  // Portal: render modal as a direct child of document.body
  return ReactDOM.createPortal(modal, document.body)
}

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
                {active.map(m => <MedCard key={m.id} med={m} onDeactivate={handleDeactivate} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Past ({past.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {past.map(m => <MedCard key={m.id} med={m} onDeactivate={handleDeactivate} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Portal modal — rendered outside the DOM tree, never clipped */}
      {adding && <AddMedicationForm onSuccess={handleAddSuccess} onCancel={() => setAdding(false)} />}
    </div>
  )
}

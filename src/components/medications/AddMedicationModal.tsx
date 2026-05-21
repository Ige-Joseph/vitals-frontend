import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

import { api, ApiError } from '@/lib/api'
import { Button, Input, StatusBanner } from '@/components/ui'
import { usePushNotifications } from '@/hooks/usePushNotifications'

import { FREQUENCIES } from './medication.types'
import { AiMedicationAssistant } from './AiMedicationAssistant'

export function AddMedicationModal({
  onSuccess,
  onCancel,
}: {
  onSuccess: (calendarSynced?: boolean) => void
  onCancel: () => void
}) {
  const { requestPermissionAndRegister, pushState } = usePushNotifications()

  const [form, setForm] = useState({
    name: '',
    dosage: '',
    frequency: 'ONCE_DAILY',
    startDate: new Date().toISOString().split('T')[0],
    durationDays: 7,
    instructions: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pushRequested, setPushRequested] = useState(false)
  const [customTimes, setCustomTimes] = useState<string[]>(['08:00'])
  const [aiDraftId, setAiDraftId] = useState<string | null>(null)
  const [aiTranscript, setAiTranscript] = useState<string | null>(null)

  const submittingRef = useRef(false)

  useEffect(() => {
    const defaults: Record<string, string[]> = {
      ONCE_DAILY: ['08:00'],
      TWICE_DAILY: ['08:00', '20:00'],
      THREE_TIMES_DAILY: ['08:00', '14:00', '20:00'],
    }

    setCustomTimes(defaults[form.frequency] ?? ['08:00'])
  }, [form.frequency])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const setField = (key: string, value: string | number) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleAiDraftReady = (payload: {
    draftId: string
    draft: {
      name?: string
      dosage?: string
      frequency?: string
      startDate?: string
      durationDays?: number
      customTimes?: string[]
      instructions?: string | null
    }
    transcript?: string | null
  }) => {
    setAiDraftId(payload.draftId)
    setAiTranscript(payload.transcript ?? null)

    setForm((current) => ({
      ...current,
      name: payload.draft.name ?? current.name,
      dosage: payload.draft.dosage ?? current.dosage,
      frequency: payload.draft.frequency ?? current.frequency,
      startDate: payload.draft.startDate ?? current.startDate,
      durationDays: payload.draft.durationDays ?? current.durationDays,
      instructions: payload.draft.instructions ?? current.instructions,
    }))

    if (payload.draft.customTimes?.length) {
      setCustomTimes(payload.draft.customTimes)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (submittingRef.current || loading) return

    submittingRef.current = true
    setLoading(true)
    setError('')

    if (!form.name.trim() || !form.dosage.trim()) {
      setError('Medication name and dosage are both required.')
      setLoading(false)
      submittingRef.current = false
      return
    }

    if (!pushRequested && pushState !== 'enabled') {
      setPushRequested(true)

      try {
        await requestPermissionAndRegister()
      } catch {
        // Do not block medication creation if push setup fails
      }
    }

    try {
      const result = await api.post<any>('/api/v1/medications', {
        name: form.name.trim(),
        dosage: form.dosage.trim(),
        frequency: form.frequency,
        startDate: new Date(form.startDate).toISOString().split('T')[0],
        durationDays: Number(form.durationDays),
        customTimes,
        instructions: form.instructions.trim() || undefined,
        aiDraftId: aiDraftId ?? undefined,
      })

      const carePlanId = result?.carePlan?.id

      let calendarSynced = false

      if (carePlanId) {
        try {
          const syncResult = await api.post<any>(
            `/api/v1/calendar/care-plans/${carePlanId}/sync`,
            {},
          )

          calendarSynced = syncResult?.synced > 0 && syncResult?.failed === 0
        } catch {
          calendarSynced = false
        }
      }

      onSuccess(calendarSynced)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to create medication plan',
      )

      setLoading(false)
      submittingRef.current = false
    }
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontFamily: 'var(--font-headline)',
    fontWeight: 800,
    fontSize: '0.9rem',
    color: 'var(--on-surface)',
    marginBottom: '0.75rem',
  }

  const sectionStyle: React.CSSProperties = {
    background: 'var(--surface-container)',
    borderRadius: 'var(--radius-xl)',
    padding: '1rem',
    border: '1px solid var(--outline-variant)',
  }

  const fieldGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '0.875rem',
  }

  const modal = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(24,28,32,0.58)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(0.5rem, 2vw, 1.25rem)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel()
      }}
    >
      <div
        style={{
          background: 'var(--surface-container-lowest)',
          borderRadius: 'var(--radius-2xl)',
          width: '100%',
          maxWidth: 680,
          maxHeight: '94dvh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeUp 0.28s cubic-bezier(0.34,1.2,0.64,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '1rem 1.25rem 0.75rem',
            borderBottom: '1px solid var(--outline-variant)',
            background: 'var(--surface-container-lowest)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 38,
              height: 4,
              borderRadius: 999,
              background: 'var(--outline-variant)',
              margin: '0 auto 1rem',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--primary)',
                  marginBottom: '0.25rem',
                }}
              >
                Medication setup
              </p>

              <h2
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontWeight: 900,
                  fontSize: '1.35rem',
                  color: 'var(--on-surface)',
                  lineHeight: 1.15,
                }}
              >
                Add medication
              </h2>

              <p
                style={{
                  color: 'var(--on-surface-variant)',
                  fontSize: '0.85rem',
                  marginTop: '0.25rem',
                }}
              >
                Use AI or fill the details manually.
              </p>
            </div>

            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              aria-label="Close"
              style={{
                background: 'var(--surface-container)',
                border: '1px solid var(--outline-variant)',
                cursor: loading ? 'not-allowed' : 'pointer',
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--on-surface-variant)',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined icon-sm">close</span>
            </button>
          </div>
        </div>

        <div
          style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '1rem',
            paddingBottom: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'var(--primary-fixed)',
              borderRadius: 'var(--radius-xl)',
              display: 'flex',
              gap: '0.7rem',
              alignItems: 'flex-start',
              flexShrink: 0,
            }}
          >
            <span
              className="material-symbols-outlined icon-sm"
              style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }}
            >
              notifications_active
            </span>

            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--on-primary-fixed-variant)',
                lineHeight: 1.55,
              }}
            >
              After saving, we'll ask for notification permission so you can receive reminders at each dose time.
            </p>
          </div>

          {error && <StatusBanner type="error" message={error} />}

          <div style={{ overflow: 'visible' }}>
            <AiMedicationAssistant onDraftReady={handleAiDraftReady} />
          </div>

          {aiTranscript && (
            <div
              style={{
                background: 'var(--surface-container)',
                border: '1px solid var(--outline-variant)',
                borderRadius: 'var(--radius-xl)',
                padding: '0.9rem 1rem',
              }}
            >
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: 'var(--primary)',
                  marginBottom: '0.35rem',
                }}
              >
                Vitals heard
              </p>

              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--on-surface-variant)',
                  lineHeight: 1.55,
                }}
              >
                "{aiTranscript}"
              </p>
            </div>
          )}

          <form
            id="add-medication-form"
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={sectionStyle}>
              <p style={sectionTitleStyle}>Medication details</p>

              <div style={fieldGridStyle}>
                <Input
                  label="Medication name"
                  placeholder="e.g. Paracetamol"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  required
                  autoFocus
                />

                <Input
                  label="Dosage"
                  placeholder="e.g. 500mg, 1 tablet"
                  value={form.dosage}
                  onChange={(e) => setField('dosage', e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={sectionStyle}>
              <p style={sectionTitleStyle}>Schedule</p>

              <div style={fieldGridStyle}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'var(--on-surface-variant)',
                      fontFamily: 'var(--font-headline)',
                    }}
                  >
                    Frequency
                  </label>

                  <select
                    className="input-base"
                    value={form.frequency}
                    onChange={(e) => setField('frequency', e.target.value)}
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Duration"
                  type="number"
                  min={1}
                  max={365}
                  value={form.durationDays}
                  onChange={(e) => setField('durationDays', parseInt(e.target.value) || 1)}
                  required
                />

                <Input
                  label="Start date"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setField('startDate', e.target.value)}
                  required
                />
              </div>

              <div style={{ marginTop: '1rem' }}>
                <p
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: 'var(--on-surface)',
                    marginBottom: '0.25rem',
                  }}
                >
                  Reminder times
                </p>

                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--on-surface-variant)',
                    marginBottom: '0.75rem',
                  }}
                >
                  These are the times Vitals will use for reminders.
                </p>

                <div style={fieldGridStyle}>
                  {customTimes.map((time, index) => (
                    <input
                      key={index}
                      type="time"
                      value={time}
                      onChange={(e) => {
                        const updated = [...customTimes]
                        updated[index] = e.target.value
                        setCustomTimes(updated)
                      }}
                      className="input-base"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div style={sectionStyle}>
              <p style={sectionTitleStyle}>Additional instructions</p>

              <Input
                label="Instructions optional"
                placeholder="e.g. Take after food, with water"
                value={form.instructions}
                onChange={(e) => setField('instructions', e.target.value)}
              />
            </div>
          </form>
        </div>

        <div
          style={{
            padding: '0.9rem 1rem calc(0.9rem + env(safe-area-inset-bottom, 0px))',
            borderTop: '1px solid var(--outline-variant)',
            background: 'var(--surface-container-lowest)',
            display: 'flex',
            gap: '0.75rem',
            flexShrink: 0,
          }}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
            style={{ flex: 1 }}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            form="add-medication-form"
            loading={loading}
            disabled={loading || submittingRef.current}
            style={{ flex: 2 }}
          >
            Save medication
          </Button>
        </div>
      </div>
    </div>
  )

  return ReactDOM.createPortal(modal, document.body)
}
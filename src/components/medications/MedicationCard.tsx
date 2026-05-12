import { Badge } from '@/components/ui'
import { Medication, FREQ_LABELS } from './medication.types'

interface Props {
  med: Medication
  onDeactivate: (id: string) => void
}

export function MedicationCard({ med, onDeactivate }: Props) {
  const active = med.carePlan.status === 'ACTIVE'

  return (
    <div
      style={{
        background: 'var(--surface-container-lowest)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.25rem',
        boxShadow: 'var(--shadow-sm)',
        opacity: active ? 1 : 0.65,
        borderLeft: `3px solid ${
          active ? 'var(--primary)' : 'var(--outline-variant)'
        }`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-fixed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ color: 'var(--primary)', fontSize: 20 }}
            >
              pill
            </span>
          </div>

          <div>
            <p
              style={{
                fontFamily: 'var(--font-headline)',
                fontWeight: 700,
                fontSize: '0.9375rem',
                color: 'var(--on-surface)',
              }}
            >
              {med.name}
            </p>

            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--on-surface-variant)',
              }}
            >
              {med.dosage}
            </p>
          </div>
        </div>

        <Badge variant={active ? 'primary' : 'neutral'}>
          {active ? 'Active' : 'Completed'}
        </Badge>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div>
          <p
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--outline)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.2rem',
            }}
          >
            Frequency
          </p>

          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--on-surface)',
            }}
          >
            {FREQ_LABELS[med.frequency] ?? med.frequency}
          </p>
        </div>

        {med.startDate && (
          <div>
            <p
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--outline)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.2rem',
              }}
            >
              Started
            </p>

            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--on-surface)',
              }}
            >
              {new Date(med.startDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}
            </p>
          </div>
        )}

        {med.instructions && (
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--outline)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.2rem',
              }}
            >
              Note
            </p>

            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--on-surface-variant)',
              }}
            >
              {med.instructions}
            </p>
          </div>
        )}
      </div>

      {active && (
        <button
          onClick={() => onDeactivate(med.carePlan.id)}
          style={{
            marginTop: '1rem',
            fontSize: '0.8125rem',
            color: 'var(--error)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            padding: 0,
          }}
        >
          Stop medication
        </button>
      )}
    </div>
  )
}
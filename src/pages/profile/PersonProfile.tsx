import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { Button, StatusBanner } from '@/components/ui'
import {
  Field,
  Input,
  Select,
  SectionHeader,
  InfoRow,
  CollapsibleCard,
} from './ProfileControls'
import { GENDER_OPTIONS, BLOOD_GROUP_OPTIONS, GENOTYPE_OPTIONS } from './profile.utils'

/**
 * One person's record, opened from Family.
 *
 * This is a management interface, not impersonation. The caregiver stays
 * themselves: the header says whose record this is, the copy is in the third
 * person, and nothing here pretends the viewer has become the subject.
 *
 * Follows the Profile conventions — view/edit toggle, snapshot-based cancel,
 * skeleton while loading.
 */

interface PersonDetail {
  id: string
  displayName: string
  dateOfBirth: string | null
  gender: string | null
  origin: string
  claimedAt: string | null
  isSelf: boolean
}

interface PersonHealth {
  personId: string
  bloodGroup: string | null
  genotype: string | null
  heightCm: number | null
  weightKg: number | null
  allergies: string[]
  existingConditions: string[]
  currentMedications: string[]
  disabilities: string[]
  smokingStatus: string | null
  alcoholUse: string | null
}

interface PersonForm {
  displayName: string
  dateOfBirth: string
  gender: string
  bloodGroup: string
  genotype: string
  heightCm: string
  weightKg: string
  allergies: string
  existingConditions: string
  currentMedications: string
}

const EMPTY_FORM: PersonForm = {
  displayName: '', dateOfBirth: '', gender: '',
  bloodGroup: '', genotype: '', heightCm: '', weightKg: '',
  allergies: '', existingConditions: '', currentMedications: '',
}

const ORIGIN_LABEL: Record<string, string> = {
  DELIVERY: 'Added when you recorded the birth',
  BABY_PROFILE: 'Added as a baby profile',
  MANAGED: 'Added by you',
  SELF: 'Your own record',
}

const toForm = (person: PersonDetail, health: PersonHealth): PersonForm => ({
  displayName: person.displayName ?? '',
  dateOfBirth: person.dateOfBirth?.slice(0, 10) ?? '',
  gender: person.gender ?? '',
  bloodGroup: health.bloodGroup ?? '',
  genotype: health.genotype ?? '',
  heightCm: health.heightCm?.toString() ?? '',
  weightKg: health.weightKg?.toString() ?? '',
  allergies: health.allergies?.join(', ') ?? '',
  existingConditions: health.existingConditions?.join(', ') ?? '',
  currentMedications: health.currentMedications?.join(', ') ?? '',
})

const list = (value: string) =>
  value.split(',').map(v => v.trim()).filter(Boolean)

function PersonSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ height: 18, width: '35%', background: 'var(--surface-container-high)', borderRadius: 4 }} />
      <div style={{ height: 96, background: 'var(--surface-container-high)', borderRadius: 12 }} />
      <div style={{ height: 140, background: 'var(--surface-container-high)', borderRadius: 12 }} />
    </div>
  )
}

export function PersonProfile({
  personId,
  onBack,
}: {
  personId: string
  onBack: () => void
}) {
  const [person, setPerson] = useState<PersonDetail | null>(null)
  const [form, setForm] = useState<PersonForm>(EMPTY_FORM)
  // Snapshot taken when editing starts, so Cancel restores rather than reloads.
  const snapshot = useRef<PersonForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [openMedical, setOpenMedical] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [detail, health] = await Promise.all([
        api.get<PersonDetail>(`/api/v1/persons/${personId}`),
        api.get<PersonHealth>(`/api/v1/persons/${personId}/health`),
      ])
      setPerson(detail)
      setForm(toForm(detail, health))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this record')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [personId])

  const update = (field: keyof PersonForm, value: string) => {
    setSuccess('')
    setError('')
    setForm(previous => ({ ...previous, [field]: value }))
  }

  const startEditing = () => {
    snapshot.current = form
    setSuccess('')
    setError('')
    setEditing(true)
  }

  const cancelEditing = () => {
    if (snapshot.current) setForm(snapshot.current)
    setSuccess('')
    setError('')
    setEditing(false)
  }

  const save = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      // Demographics and clinical attributes are separate endpoints because
      // they are separate concerns on the backend.
      await api.patch(`/api/v1/persons/${personId}`, {
        displayName: form.displayName,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
      })

      await api.patch(`/api/v1/persons/${personId}/health`, {
        bloodGroup: form.bloodGroup || null,
        genotype: form.genotype || null,
        heightCm: form.heightCm ? Number(form.heightCm) : null,
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        allergies: list(form.allergies),
        existingConditions: list(form.existingConditions),
        currentMedications: list(form.currentMedications),
      })

      setSuccess('Record updated')
      setEditing(false)
      void load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update this record')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PersonSkeleton />

  if (!person) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <StatusBanner type="error" message={error || 'Record unavailable'} />
        <Button variant="secondary" icon="arrow_back" onClick={onBack}>Back to Family</Button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem', alignSelf: 'flex-start',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          color: 'var(--primary)', fontFamily: 'var(--font-headline)',
          fontWeight: 600, fontSize: '0.85rem',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
        Family
      </button>

      {/* Third person throughout: this is someone else's record being managed. */}
      <div>
        <h2 style={{
          fontFamily: 'var(--font-headline)', fontWeight: 800,
          fontSize: '1.25rem', color: 'var(--on-surface)',
        }}>
          {person.displayName}
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
          {ORIGIN_LABEL[person.origin] ?? person.origin}
          {person.claimedAt
            ? ' · has their own Vitals account'
            : ' · no Vitals account of their own'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <SectionHeader label="Details" />

        {editing ? (
          <>
            <Field label="Name">
              <Input value={form.displayName} onChange={v => update('displayName', v)} />
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={form.dateOfBirth} onChange={v => update('dateOfBirth', v)} />
            </Field>
            <Field label="Sex">
              <Select
                value={form.gender}
                onChange={v => update('gender', v)}
                options={GENDER_OPTIONS as unknown as { label: string; value: string }[]}
              />
            </Field>
          </>
        ) : (
          <>
            <InfoRow label="Name" value={person.displayName} />
            <InfoRow label="Date of birth" value={form.dateOfBirth || '—'} />
            <InfoRow label="Sex" value={form.gender || '—'} />
          </>
        )}
      </div>

      <CollapsibleCard
        title="Medical"
        open={openMedical}
        onToggle={() => setOpenMedical(o => !o)}
      >
        {editing ? (
          <>
            <Field label="Blood group">
              <Select value={form.bloodGroup} onChange={v => update('bloodGroup', v)} options={BLOOD_GROUP_OPTIONS} />
            </Field>
            <Field label="Genotype">
              <Select value={form.genotype} onChange={v => update('genotype', v)} options={GENOTYPE_OPTIONS} />
            </Field>
            <Field label="Height (cm)">
              <Input type="number" value={form.heightCm} onChange={v => update('heightCm', v)} />
            </Field>
            <Field label="Weight (kg)">
              <Input type="number" value={form.weightKg} onChange={v => update('weightKg', v)} />
            </Field>
            <Field label="Allergies">
              <Input value={form.allergies} onChange={v => update('allergies', v)} placeholder="Separate with commas" />
            </Field>
            <Field label="Existing conditions">
              <Input value={form.existingConditions} onChange={v => update('existingConditions', v)} placeholder="Separate with commas" />
            </Field>
            <Field label="Current medications">
              <Input value={form.currentMedications} onChange={v => update('currentMedications', v)} placeholder="Separate with commas" />
            </Field>
          </>
        ) : (
          <>
            <InfoRow label="Blood group" value={form.bloodGroup || '—'} />
            <InfoRow label="Genotype" value={form.genotype || '—'} />
            <InfoRow label="Height" value={form.heightCm ? `${form.heightCm} cm` : '—'} />
            <InfoRow label="Weight" value={form.weightKg ? `${form.weightKg} kg` : '—'} />
            <InfoRow label="Allergies" value={form.allergies || '—'} />
            <InfoRow label="Existing conditions" value={form.existingConditions || '—'} />
            <InfoRow label="Current medications" value={form.currentMedications || '—'} />
          </>
        )}
      </CollapsibleCard>

      {success ? <StatusBanner type="success" message={success} /> : null}
      {error ? <StatusBanner type="error" message={error} /> : null}

      {editing ? (
        <>
          <Button variant="primary" onClick={save} disabled={saving} style={{ width: '100%' }} icon={saving ? 'hourglass_top' : 'save'}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button variant="secondary" onClick={cancelEditing} disabled={saving} style={{ width: '100%' }} icon="close">
            Cancel
          </Button>
        </>
      ) : (
        <Button variant="primary" onClick={startEditing} style={{ width: '100%' }} icon="edit">
          Edit {person.displayName}'s details
        </Button>
      )}
    </div>
  )
}

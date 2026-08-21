import { Card } from '@/components/ui'
import {
  CollapsibleCard,
  Field,
  InfoRow,
  Input,
  SectionHeader,
  Select,
  Textarea,
} from './ProfileControls'
import type { OpenProfileSections, ProfileForm } from './profile.types'
import {
  ALCOHOL_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  formatAlcohol,
  formatDate,
  formatGender,
  formatJourney,
  formatSmoking,
  GENDER_OPTIONS,
  GENOTYPE_OPTIONS,
  SMOKING_OPTIONS,
  splitList,
} from './profile.utils'

interface ProfileDetailsProps {
  editing: boolean
  form: ProfileForm
  openSections: OpenProfileSections
  onChange: (field: keyof ProfileForm, value: string) => void
  onToggleMedical: () => void
  onToggleLifestyle: () => void
}

export function ProfileDetails({
  editing,
  form,
  openSections,
  onChange,
  onToggleMedical,
  onToggleLifestyle,
}: ProfileDetailsProps) {
  const set = (field: keyof ProfileForm) => (value: string) => onChange(field, value)

  if (!editing) {
    return (
      <>
        <Card style={{ padding: '1.25rem' }} className="animate-fade-up delay-400">
          <SectionHeader label="Basic Information" />
          <InfoRow label="First name" value={form.firstName} />
          <InfoRow label="Last name" value={form.lastName} />
          <InfoRow label="Gender" value={formatGender(form.gender)} />
          <InfoRow label="Date of birth" value={formatDate(form.dateOfBirth)} />
          <InfoRow label="Phone" value={form.phoneNumber} />
          <InfoRow label="Country" value={form.country} />
          <InfoRow label="City" value={form.city} />
          <InfoRow label="Timezone" value={form.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone} />
          <InfoRow label="Vitals journey" value={formatJourney(form.selectedJourney)} />
        </Card>

        <CollapsibleCard title="Medical Information" open={openSections.medical} onToggle={onToggleMedical} className="animate-fade-up delay-500">
          <InfoRow label="Blood group" value={form.bloodGroup} />
          <InfoRow label="Genotype" value={form.genotype} />
          <InfoRow label="Height" value={form.heightCm ? `${form.heightCm} cm` : undefined} />
          <InfoRow label="Weight" value={form.weightKg ? `${form.weightKg} kg` : undefined} />
          <InfoRow label="Allergies" value={splitList(form.allergies)} />
          <InfoRow label="Conditions" value={splitList(form.existingConditions)} />
          <InfoRow label="Medications" value={splitList(form.currentMedications)} />
          <InfoRow label="Disabilities" value={splitList(form.disabilities)} />
        </CollapsibleCard>

        <CollapsibleCard title="Lifestyle" open={openSections.lifestyle} onToggle={onToggleLifestyle} className="animate-fade-up delay-600">
          <InfoRow label="Smoking" value={formatSmoking(form.smokingStatus)} />
          <InfoRow label="Alcohol" value={formatAlcohol(form.alcoholUse)} />
        </CollapsibleCard>
      </>
    )
  }

  return (
    <>
      <Card style={{ padding: '1.25rem' }} className="animate-fade-up delay-400">
        <SectionHeader label="Basic Information" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.875rem' }}>
          <Field label="First name">
            <Input value={form.firstName} onChange={set('firstName')} placeholder="First name" autoComplete="given-name" />
          </Field>
          <Field label="Last name">
            <Input value={form.lastName} onChange={set('lastName')} placeholder="Last name" autoComplete="family-name" />
          </Field>
          <Field label="Gender">
            <Select value={form.gender} onChange={set('gender')} placeholder="Select gender" options={GENDER_OPTIONS} />
          </Field>
          <Field label="Date of birth">
            <Input value={form.dateOfBirth} onChange={set('dateOfBirth')} type="date" autoComplete="bday" />
          </Field>
          <Field label="Phone number">
            <Input value={form.phoneNumber} onChange={set('phoneNumber')} placeholder="+1 555 000 0000" type="tel" autoComplete="tel" />
          </Field>
          <Field label="Country">
            <Input value={form.country} onChange={set('country')} placeholder="Country" autoComplete="country-name" />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={set('city')} placeholder="City" autoComplete="address-level2" />
          </Field>
        </div>
      </Card>

      <CollapsibleCard title="Medical Information" open={openSections.medical} onToggle={onToggleMedical} className="animate-fade-up delay-500">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.875rem' }}>
            <Field label="Blood group">
              <Select value={form.bloodGroup} onChange={set('bloodGroup')} placeholder="Select" options={BLOOD_GROUP_OPTIONS} />
            </Field>
            <Field label="Genotype">
              <Select value={form.genotype} onChange={set('genotype')} placeholder="Select" options={GENOTYPE_OPTIONS} />
            </Field>
            <Field label="Height (cm)">
              <Input value={form.heightCm} onChange={set('heightCm')} type="number" step="0.1" placeholder="e.g. 170" autoComplete="off" />
            </Field>
            <Field label="Weight (kg)">
              <Input value={form.weightKg} onChange={set('weightKg')} type="number" step="0.1" placeholder="e.g. 65" autoComplete="off" />
            </Field>
          </div>
          <Field label="Allergies (comma-separated)">
            <Textarea value={form.allergies} onChange={set('allergies')} placeholder="e.g. Penicillin, Peanuts, Latex" />
          </Field>
          <Field label="Existing conditions (comma-separated)">
            <Textarea value={form.existingConditions} onChange={set('existingConditions')} placeholder="e.g. Hypertension, Diabetes type 2" />
          </Field>
          <Field label="Current medications (comma-separated)">
            <Textarea value={form.currentMedications} onChange={set('currentMedications')} placeholder="e.g. Metformin 500mg, Lisinopril 10mg" />
          </Field>
          <Field label="Disabilities (comma-separated)">
            <Textarea value={form.disabilities} onChange={set('disabilities')} placeholder="e.g. Hearing impairment" />
          </Field>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Lifestyle" open={openSections.lifestyle} onToggle={onToggleLifestyle} className="animate-fade-up delay-600">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.875rem' }}>
          <Field label="Smoking status">
            <Select value={form.smokingStatus} onChange={set('smokingStatus')} placeholder="Select" options={SMOKING_OPTIONS} />
          </Field>
          <Field label="Alcohol use">
            <Select value={form.alcoholUse} onChange={set('alcoholUse')} placeholder="Select" options={ALCOHOL_OPTIONS} />
          </Field>
        </div>
      </CollapsibleCard>
    </>
  )
}


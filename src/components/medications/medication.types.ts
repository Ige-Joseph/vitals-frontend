export interface Medication {
  id: string
  carePlanId: string
  name: string
  dosage: string
  frequency: string
  startDate: string
  endDate?: string
  instructions?: string

  carePlan: {
    id: string
    status: string
    title: string
  }
}

export const FREQUENCIES = [
  { value: 'ONCE_DAILY', label: 'Once daily' },
  { value: 'TWICE_DAILY', label: 'Twice daily' },
  { value: 'THREE_TIMES_DAILY', label: 'Three times daily' },
] as const

export const FREQ_LABELS: Record<string, string> = Object.fromEntries(
  FREQUENCIES.map((f) => [f.value, f.label]),
)

export interface MedicationFormState {
  name: string
  dosage: string
  frequency: string
  startDate: string
  durationDays: number
  instructions: string
  aiDraftId?: string | null
}
export interface Usage {
  symptomChecks: { used: number; limit: number }
  drugDetections: { used: number; limit: number }
}

export interface CalendarSyncSummary {
  connected: boolean
  failedSyncs: number
  accountEmail?: string | null
}

/** Canonical clinical attributes served for a Person. */
export interface PersonHealth {
  personId?: string
  bloodGroup?: string | null
  genotype?: string | null
  heightCm?: number | null
  weightKg?: number | null
  allergies?: string[]
  existingConditions?: string[]
  currentMedications?: string[]
  disabilities?: string[]
  smokingStatus?: string | null
  alcoholUse?: string | null
}

/** Canonical demographics for the account's own Person. */
export interface PersonBlock {
  personId: string
  displayName: string
  dateOfBirth?: string | null
  gender?: string | null
}

export interface UserProfile {
  firstName?: string
  lastName?: string
  email?: string
  /** Clinical keys in profile are compatibility mirrors; prefer health/person. */
  profile?: {
    gender?: string
    country?: string
    city?: string
    phoneNumber?: string
    dateOfBirth?: string
    bloodGroup?: string
    genotype?: string
    heightCm?: number
    weightKg?: number
    allergies?: string[]
    existingConditions?: string[]
    currentMedications?: string[]
    disabilities?: string[]
    smokingStatus?: string
    alcoholUse?: string
    timezone?: string
    selectedJourney?: string
  }
  health?: PersonHealth
  person?: PersonBlock | null
}

export interface ProfileForm {
  firstName: string
  lastName: string
  gender: string
  country: string
  city: string
  phoneNumber: string
  dateOfBirth: string
  bloodGroup: string
  genotype: string
  heightCm: string
  weightKg: string
  allergies: string
  existingConditions: string
  currentMedications: string
  disabilities: string
  smokingStatus: string
  alcoholUse: string
  timezone: string
  selectedJourney: string
}

export interface OpenProfileSections {
  plan: boolean
  report: boolean
  medical: boolean
  lifestyle: boolean
  notifications: boolean
  calendar: boolean
  usage: boolean
}

export type ProfileSectionKey = keyof OpenProfileSections

export const EMPTY_PROFILE_FORM: ProfileForm = {
  firstName: '',
  lastName: '',
  gender: '',
  country: '',
  city: '',
  phoneNumber: '',
  dateOfBirth: '',
  bloodGroup: '',
  genotype: '',
  heightCm: '',
  weightKg: '',
  allergies: '',
  existingConditions: '',
  currentMedications: '',
  disabilities: '',
  smokingStatus: '',
  alcoholUse: '',
  timezone: '',
  selectedJourney: '',
}

export const CLOSED_PROFILE_SECTIONS: OpenProfileSections = {
  plan: false,
  report: false,
  medical: false,
  lifestyle: false,
  notifications: false,
  calendar: false,
  usage: false,
}


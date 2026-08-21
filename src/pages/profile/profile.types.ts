export interface Usage {
  symptomChecks: { used: number; limit: number }
  drugDetections: { used: number; limit: number }
}

export interface CalendarSyncSummary {
  connected: boolean
  failedSyncs: number
  accountEmail?: string | null
}

export interface UserProfile {
  firstName?: string
  lastName?: string
  email?: string
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
  medical: false,
  lifestyle: false,
  notifications: false,
  calendar: false,
  usage: false,
}


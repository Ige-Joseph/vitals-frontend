import type { ProfileForm, UserProfile } from './profile.types'

export const GENDER_OPTIONS = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Non-binary', value: 'NON_BINARY' },
  { label: 'Prefer not to say', value: 'PREFER_NOT_TO_SAY' },
] as const

export const BLOOD_GROUP_OPTIONS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
].map(value => ({ label: value, value }))

export const GENOTYPE_OPTIONS = [
  'AA', 'AS', 'AC', 'SS', 'SC', 'CC',
].map(value => ({ label: value, value }))

export const SMOKING_OPTIONS = [
  { label: 'Never', value: 'never' },
  { label: 'Former', value: 'former' },
  { label: 'Occasional', value: 'occasional' },
  { label: 'Regular', value: 'regular' },
] as const

export const ALCOHOL_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Occasional', value: 'occasional' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Heavy', value: 'heavy' },
] as const

const COMPLETION_FIELDS: ReadonlyArray<keyof ProfileForm> = [
  'firstName',
  'lastName',
  'gender',
  'country',
  'city',
  'phoneNumber',
  'dateOfBirth',
  'bloodGroup',
  'genotype',
  'heightCm',
  'weightKg',
  'allergies',
  'existingConditions',
  'currentMedications',
  'disabilities',
  'smokingStatus',
  'alcoholUse',
]

const DISPLAY_VALUES = {
  gender: {
    MALE: 'Male',
    FEMALE: 'Female',
    NON_BINARY: 'Non-binary',
    PREFER_NOT_TO_SAY: 'Prefer not to say',
  },
  smoking: {
    never: 'Never',
    former: 'Former smoker',
    occasional: 'Occasional',
    regular: 'Regular',
  },
  alcohol: {
    none: 'None',
    occasional: 'Occasional',
    moderate: 'Moderate',
    heavy: 'Heavy',
  },
  journey: {
    MEDICATION: 'Medication',
    PREGNANCY: 'Pregnancy',
    VACCINATION: 'Vaccination',
  },
} as const

export const splitList = (value: string): string[] =>
  value.split(',').map(item => item.trim()).filter(Boolean)

export const profileToForm = (user: UserProfile): ProfileForm => ({
  firstName: user.firstName ?? '',
  lastName: user.lastName ?? '',
  gender: user.profile?.gender ?? '',
  country: user.profile?.country ?? '',
  city: user.profile?.city ?? '',
  phoneNumber: user.profile?.phoneNumber ?? '',
  dateOfBirth: user.profile?.dateOfBirth?.slice(0, 10) ?? '',
  bloodGroup: user.profile?.bloodGroup ?? '',
  genotype: user.profile?.genotype ?? '',
  heightCm: user.profile?.heightCm?.toString() ?? '',
  weightKg: user.profile?.weightKg?.toString() ?? '',
  allergies: user.profile?.allergies?.join(', ') ?? '',
  existingConditions: user.profile?.existingConditions?.join(', ') ?? '',
  currentMedications: user.profile?.currentMedications?.join(', ') ?? '',
  disabilities: user.profile?.disabilities?.join(', ') ?? '',
  smokingStatus: user.profile?.smokingStatus ?? '',
  alcoholUse: user.profile?.alcoholUse ?? '',
  timezone: user.profile?.timezone ?? '',
  selectedJourney: user.profile?.selectedJourney ?? '',
})

export const profileUpdatePayload = (form: ProfileForm) => ({
  firstName: form.firstName,
  lastName: form.lastName,
  gender: form.gender || undefined,
  country: form.country || undefined,
  city: form.city || undefined,
  phoneNumber: form.phoneNumber || undefined,
  dateOfBirth: form.dateOfBirth || undefined,
  bloodGroup: form.bloodGroup || undefined,
  genotype: form.genotype || undefined,
  heightCm: form.heightCm ? Number(form.heightCm) : undefined,
  weightKg: form.weightKg ? Number(form.weightKg) : undefined,
  allergies: splitList(form.allergies),
  existingConditions: splitList(form.existingConditions),
  currentMedications: splitList(form.currentMedications),
  disabilities: splitList(form.disabilities),
  smokingStatus: form.smokingStatus || undefined,
  alcoholUse: form.alcoholUse || undefined,
  timezone: form.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
})

export const calculateProfileCompletion = (form: ProfileForm): number => {
  const completed = COMPLETION_FIELDS.filter(field => form[field].trim() !== '').length
  return Math.round((completed / COMPLETION_FIELDS.length) * 100)
}

export const remainingProfileFields = (completion: number): number =>
  COMPLETION_FIELDS.length - Math.round(completion / 100 * COMPLETION_FIELDS.length)

const formatValue = (values: Record<string, string>, value: string): string | undefined =>
  value ? values[value] ?? value : undefined

export const formatGender = (value: string) => formatValue(DISPLAY_VALUES.gender, value)
export const formatSmoking = (value: string) => formatValue(DISPLAY_VALUES.smoking, value)
export const formatAlcohol = (value: string) => formatValue(DISPLAY_VALUES.alcohol, value)
export const formatJourney = (value: string) => formatValue(DISPLAY_VALUES.journey, value)

export const formatDate = (iso: string): string | undefined => {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}


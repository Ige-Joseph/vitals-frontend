/**
 * Invitations, as the API describes them.
 *
 * Two sides, and they see different things. The inviter sends an offer and can
 * withdraw it; the invitee reads the offer through a token and answers it. The
 * shapes below are kept apart for that reason rather than merged into one
 * "invitation" type that would carry fields neither side always has.
 */

export type PersonRole = 'OWNER' | 'CAREGIVER' | 'VIEWER'

export type InvitationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'REVOKED'
  /** Derived by the API when a PENDING offer has passed its expiry. */
  | 'EXPIRED'

/** What the link shows, before anyone signs in. */
export interface InvitationPreview {
  /** Which record. Lets the screen after acceptance link to it by name. */
  personId: string
  email: string
  role: PersonRole
  /**
   * Whether taking ownership is on offer at all.
   *
   * False is not explained to the invitee, ever. Whether the inviter marked a
   * record as being *about* the person they invited is a fact about the
   * inviter's intent, and the screen simply offers a connection instead —
   * with no empty space where an explanation would go.
   */
  claimable: boolean
  recordName: string
  inviterName: string
  status: InvitationStatus
  expiresAt: string
  /** Whether an account has to be created first, or signing in is enough. */
  requiresSignup: boolean
}

/** An offer addressed to the signed-in account. */
export interface ReceivedInvitation {
  invitationId: string
  personId: string
  recordName: string
  role: PersonRole
  claimable: boolean
  inviterName: string
  expiresAt: string
}

/** An offer this account made, on a record it manages. */
export interface SentInvitation {
  id: string
  email: string
  role: PersonRole
  claimable: boolean
  status: InvitationStatus
  expiresAt: string
  acceptedAt: string | null
  respondedAt: string | null
  createdAt: string
  /** Attached client-side; the API answers per record. */
  personId: string
  recordName: string
}

/** Someone whose access a claim removed, offered back one tap at a time. */
export interface RevokedManager {
  userId: string
  role: PersonRole
  name: string
}

export type RespondMode = 'connect' | 'claim' | 'decline'

export type RespondResult =
  | { outcome: 'connected' }
  | { outcome: 'declined' }
  | {
      outcome: 'claimed'
      personId: string
      supersededPersonId: string | null
      revoked: RevokedManager[]
    }
  | {
      /**
       * The claim could not be taken because the invitee's own record is not
       * empty. Not an error: the invitation was always a connection
       * invitation, and it is still open.
       */
      outcome: 'refused'
      /** The invitee's own signals, for the invitee's eyes. Never the inviter's. */
      blockedBy: Record<string, number>
      connectionStillAvailable: boolean
    }

export const ROLE_OFFER_LABEL: Record<'CAREGIVER' | 'VIEWER', string> = {
  CAREGIVER: 'View and update',
  VIEWER: 'View only',
}

export const ROLE_OFFER_HINT: Record<'CAREGIVER' | 'VIEWER', string> = {
  CAREGIVER: 'They can add medications, book appointments and mark doses taken.',
  VIEWER: 'They can read the record but change nothing in it.',
}

export const STATUS_LABEL: Record<InvitationStatus, string> = {
  PENDING: 'Waiting',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  REVOKED: 'Withdrawn',
  EXPIRED: 'Expired',
}

/**
 * What the invitee is told stopped their claim.
 *
 * Their own record's contents, described in their own terms. The API returns
 * raw signal counts; a reader needs a sentence, not `symptomLogs: 3`.
 */
export const BLOCKER_LABEL: Record<string, string> = {
  carePlans: 'medications and care plans',
  appointments: 'appointments',
  symptomLogs: 'symptom entries',
  moodLogs: 'mood entries',
  drugDetections: 'medicine scans',
  medicationDrafts: 'medication drafts',
  reportGenerations: 'health summaries',
  healthProfileFields: 'health profile details',
  sharedWithOtherAccounts: 'people you have shared it with',
}

export const describeBlockers = (blockedBy: Record<string, number>): string => {
  const parts = Object.entries(blockedBy)
    .filter(([, n]) => n > 0)
    .map(([key]) => BLOCKER_LABEL[key] ?? key)

  if (parts.length === 0) return 'information you have recorded'
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

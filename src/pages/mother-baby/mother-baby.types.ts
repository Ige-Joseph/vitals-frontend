export interface ANCVisit {
  id: string
  title: string
  scheduledFor: string
  status: string
}

export interface Milestone {
  weekNumber: number
  title: string
  description: string
  eventType: string
}

export interface PregnancyTimeline {
  currentWeek: number
  trimester: number
  expectedDeliveryDate: string
  lmpDate: string
  guidance: { trimester: number; summary: string; tips: string[] } | null
  upcomingANCVisits: ANCVisit[]
  allMilestones: Milestone[]
}

export type PregnancyTimelineState =
  | { status: 'loading' }
  | { status: 'setup' }
  | { status: 'ready'; data: PregnancyTimeline }
  | { status: 'error'; message: string }

export interface MoodOption {
  moods: string[]
  cravings: string[]
}

export interface MoodLog {
  id: string
  mood: string | null
  craving: string | null
  insight: string | null
  loggedAt: string
}

export interface BabyCareEvent {
  id: string
  title: string
  description: string
  scheduledFor: string
  status: string
  metadata?: {
    vaccines?: string[]
    ageLabel?: string
  }
}

export interface BabyPlan {
  id?: string
  metadata?: {
    babyName?: string
    deliveryDate?: string
  }
  careEvents?: BabyCareEvent[]
}

export type MotherBabyTab = 'timeline' | 'mood' | 'baby'

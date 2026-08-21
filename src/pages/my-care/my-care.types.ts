export interface SymptomEntry {
  id: string
  symptomsText: string
  severity: string | null
  aiResponse: {
    severity: string
    summary: string
    guidance: string
    disclaimer: string
    seekCareIf: string[]
    _fallback?: boolean
  } | null
  createdAt: string
}

export interface DrugEntry {
  id: string
  detectedDrug: string | null
  aiResponse: {
    drugName: string
    commonUsage: string
    sideEffects: string[]
    caution: string
    disclaimer: string
    confidence: string
    _fallback?: boolean
  } | null
  createdAt: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export type CareTab = 'timeline' | 'medications' | 'symptoms' | 'drug'

export interface Article {
  id: string
  title: string
  slug: string
  excerpt: string
  imageUrl: string | null
  category: string
  publishedAt: string | null
}
export interface ArticleDetail extends Article {
  content: string
}
export interface ArticleList {
  articles: Article[]
  pagination: { page: number; limit: number; total: number; pages: number }
}
export const CATEGORIES = [
  'ALL',
  'GENERAL',
  'PREGNANCY',
  'BABY_CARE',
  'MEDICATION',
  'NUTRITION',
  'MENTAL_HEALTH'
]
const LABELS: Record<string, string> = {
  ALL: 'All topics',
  GENERAL: 'General health',
  PREGNANCY: 'Pregnancy',
  BABY_CARE: 'Baby care',
  MEDICATION: 'Medication',
  NUTRITION: 'Nutrition',
  MENTAL_HEALTH: 'Mental wellbeing'
}
export const categoryLabel = (category: string) =>
  LABELS[category] ?? category.replace(/_/g, ' ').toLowerCase()
export function articleDate(value: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return null
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}
export function imageSource(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value, window.location.origin)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

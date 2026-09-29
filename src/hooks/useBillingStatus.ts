import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'

export type BillingTier = 'FREE' | 'PREMIUM'

export interface DailyUsage {
  symptomChecks: { used: number; limit: number }
  drugDetections: { used: number; limit: number }
}

export function useBillingTier(enabled = true) {
  const [tier, setTier] = useState<BillingTier | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const plan = await api.get<{ tier: BillingTier }>('/api/v1/billing/plan')
      setTier(plan.tier)
    } catch {
      setTier(null)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled) void reload()
  }, [enabled, reload])

  useEffect(() => {
    if (!enabled) return
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void reload()
    }
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [enabled, reload])

  return { tier, loading, error, reload }
}

export function useDailyUsage() {
  const [usage, setUsage] = useState<DailyUsage | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      setUsage(await api.get<DailyUsage>('/api/v1/usage'))
    } catch {
      setUsage(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void reload()
    }
    const timer = window.setInterval(refreshWhenVisible, 60_000)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [reload])

  return { usage, loading, reload }
}

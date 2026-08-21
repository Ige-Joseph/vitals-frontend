const SENSITIVE_CACHE_NAMES = ['api-cache'] as const

/**
 * Remove caches created by older service-worker versions that stored private
 * API responses. This is intentionally safe to call on every application boot.
 */
export async function clearLegacySensitiveCaches(): Promise<void> {
  if (!('caches' in window)) return

  await Promise.all(
    SENSITIVE_CACHE_NAMES.map((cacheName) => window.caches.delete(cacheName)),
  )
}

/**
 * Convert a notification destination to an application-local path. External,
 * malformed, and non-HTTP(S) destinations fall back to the dashboard.
 */
export function toSafeAppPath(
  candidate: string | undefined,
  fallback = '/dashboard',
): string {
  if (!candidate) return fallback

  try {
    const url = new URL(candidate, window.location.origin)
    if (url.origin !== window.location.origin) return fallback
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return fallback

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

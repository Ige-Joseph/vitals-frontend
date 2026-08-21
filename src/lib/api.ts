import {
  getAccessToken,
  notifySessionExpired,
  setAccessToken,
} from '@/lib/session'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const AUTH_TRANSPORT_HEADER = 'X-Auth-Transport'

const COOKIE_AUTH_PATHS = new Set([
  '/api/v1/auth/signup',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
])

const REFRESH_EXEMPT_PATHS = new Set([
  ...COOKIE_AUTH_PATHS,
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/verify-email',
])

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  message: string
  errorCode: string | null
}

interface RefreshResult {
  user: unknown
  accessToken: string
}

class ApiError extends Error {
  constructor(public message: string, public errorCode: string | null, public status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

const parseResponse = async <T>(res: Response): Promise<ApiResponse<T>> => {
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new ApiError('The server returned an unexpected response.', 'INVALID_RESPONSE', res.status)
  }

  try {
    return await res.json() as ApiResponse<T>
  } catch {
    throw new ApiError('The server returned invalid JSON.', 'INVALID_RESPONSE', res.status)
  }
}

const unwrapResponse = async <T>(res: Response): Promise<T> => {
  const body = await parseResponse<T>(res)
  if (!res.ok || !body.success) {
    throw new ApiError(body.message, body.errorCode, res.status)
  }

  return body.data as T
}

const buildHeaders = (
  path: string,
  options: RequestInit,
  isMultipart: boolean,
): Record<string, string> => {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  }

  if (!isMultipart) headers['Content-Type'] = 'application/json'
  if (COOKIE_AUTH_PATHS.has(path)) headers[AUTH_TRANSPORT_HEADER] = 'cookie'

  const token = getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  return headers
}

const performFetch = (
  path: string,
  options: RequestInit,
  isMultipart: boolean,
): Promise<Response> => fetch(`${API_URL}${path}`, {
  ...options,
  credentials: 'include',
  headers: buildHeaders(path, options, isMultipart),
})

let refreshPromise: Promise<RefreshResult | null> | null = null

const refreshAccessToken = async (
  legacyRefreshToken?: string,
): Promise<RefreshResult | null> => {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const res = await performFetch(
        '/api/v1/auth/refresh',
        {
          method: 'POST',
          body: JSON.stringify(
            legacyRefreshToken ? { refreshToken: legacyRefreshToken } : {},
          ),
        },
        false,
      )

      const data = await unwrapResponse<RefreshResult>(res)
      setAccessToken(data.accessToken)
      return data
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isMultipart = false,
): Promise<T> {
  const res = await performFetch(path, options, isMultipart)

  if (res.status === 401 && !REFRESH_EXEMPT_PATHS.has(path)) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      const retry = await performFetch(path, options, isMultipart)
      if (retry.status !== 401) return unwrapResponse<T>(retry)
    }

    notifySessionExpired()
    throw new ApiError('Session expired. Please log in again.', 'UNAUTHORIZED', 401)
  }

  return unwrapResponse<T>(res)
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  }),
  patch: <T>(path: string, body: unknown) => request<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, {
    method: 'DELETE',
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
  upload: <T>(path: string, formData: FormData) => request<T>(path, {
    method: 'POST',
    body: formData,
  }, true),
  refreshSession: async <TUser>(legacyRefreshToken?: string) => {
    const result = await refreshAccessToken(legacyRefreshToken)
    return result as { user: TUser; accessToken: string } | null
  },
}

export { ApiError }

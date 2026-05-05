const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  message: string
  errorCode: string | null
}

class ApiError extends Error {
  constructor(public message: string, public errorCode: string | null, public status: number) {
    super(message)
  }
}

const getToken = () => localStorage.getItem('accessToken')

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  // Handle token expiry
  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getToken()}`
      const retry = await fetch(`${API_URL}${path}`, { ...options, headers })
      const retryData: ApiResponse<T> = await retry.json()
      if (retryData.success && retryData.data !== null) return retryData.data
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    window.location.href = '/login'
    throw new ApiError('Session expired', 'UNAUTHORIZED', 401)
  }

  const data: ApiResponse<T> = await res.json()
  if (!data.success || data.data === null) {
    throw new ApiError(data.message, data.errorCode, res.status)
  }
  return data.data
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return false
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    const data: ApiResponse<{ accessToken: string; refreshToken: string }> = await res.json()
    if (data.success && data.data) {
      localStorage.setItem('accessToken', data.data.accessToken)
      localStorage.setItem('refreshToken', data.data.refreshToken)
      return true
    }
    return false
  } catch { return false }
}

// Upload helper (no JSON content-type — multipart)
async function upload<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  const data: ApiResponse<T> = await res.json()
  if (!data.success || data.data === null) {
    throw new ApiError(data.message, data.errorCode, res.status)
  }
  return data.data
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
  upload,
}

export { ApiError }

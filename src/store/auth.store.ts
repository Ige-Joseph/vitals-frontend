import { create } from 'zustand'
import { api } from '@/lib/api'
import {
  clearAccessToken,
  consumeLegacyRefreshToken,
  setAccessToken,
} from '@/lib/session'

export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  planType: string
  emailVerified: boolean
}

export interface SignupPayload {
  firstName: string
  lastName: string
  email: string
  password: string
  gender?: string
  country?: string
}

interface AuthResult {
  user: User
  accessToken: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  hasHydrated: boolean

  login: (email: string, password: string) => Promise<void>
  signup: (payload: SignupPayload) => Promise<void>
  logout: () => Promise<void>
  hydrateUser: () => Promise<void>
  clearSession: () => void
  setUser: (user: User) => void
}

const unauthenticatedState = {
  user: null,
  isAuthenticated: false,
} as const

export const useAuthStore = create<AuthState>((set) => ({
  ...unauthenticatedState,
  isLoading: false,
  hasHydrated: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const data = await api.post<AuthResult>('/api/v1/auth/login', { email, password })
      setAccessToken(data.accessToken)
      set({ user: data.user, isAuthenticated: true })
    } finally {
      set({ isLoading: false })
    }
  },

  signup: async (payload) => {
    set({ isLoading: true })
    try {
      const data = await api.post<AuthResult>('/api/v1/auth/signup', payload)
      setAccessToken(data.accessToken)
      set({ user: data.user, isAuthenticated: true })
    } finally {
      set({ isLoading: false })
    }
  },

  hydrateUser: async () => {
    const legacyRefreshToken = consumeLegacyRefreshToken()
    const session = await api.refreshSession<User>(legacyRefreshToken)

    if (session) {
      set({
        user: session.user,
        isAuthenticated: true,
        hasHydrated: true,
      })
      return
    }

    clearAccessToken()
    set({ ...unauthenticatedState, hasHydrated: true })
  },

  logout: async () => {
    try {
      await api.post('/api/v1/auth/logout')
    } catch {
      // Local logout must still complete when the API is unavailable.
    } finally {
      clearAccessToken()
      set(unauthenticatedState)
    }
  },

  clearSession: () => {
    clearAccessToken()
    set(unauthenticatedState)
  },

  setUser: (user) => set({ user, isAuthenticated: true }),
}))

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

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

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  hasHydrated: boolean

  login: (email: string, password: string) => Promise<void>
  signup: (payload: SignupPayload) => Promise<void>
  logout: () => Promise<void>
  hydrateUser: () => Promise<void>
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const data = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
            '/api/v1/auth/login',
            { email, password }
          )

          localStorage.setItem('accessToken', data.accessToken)
          localStorage.setItem('refreshToken', data.refreshToken)

          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
          })
        } finally {
          set({ isLoading: false })
        }
      },

      signup: async (payload) => {
        set({ isLoading: true })
        try {
          const data = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
            '/api/v1/auth/signup',
            payload
          )

          localStorage.setItem('accessToken', data.accessToken)
          localStorage.setItem('refreshToken', data.refreshToken)

          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
          })
        } finally {
          set({ isLoading: false })
        }
      },

      hydrateUser: async () => {
        const token = localStorage.getItem('accessToken')

        if (!token) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            hasHydrated: true,
          })
          return
        }

        try {
          const user = await api.get<User>('/api/v1/auth/me')

          set({
            user,
            accessToken: localStorage.getItem('accessToken'),
            refreshToken: localStorage.getItem('refreshToken'),
            isAuthenticated: true,
            hasHydrated: true,
          })
        } catch {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')

          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            hasHydrated: true,
          })
        }
      },

      logout: async () => {
        const { refreshToken } = get()

        if (refreshToken) {
          try {
            await api.post('/api/v1/auth/logout', { refreshToken })
          } catch {
            // silent logout
          }
        }

        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },

      setUser: (user) => set({ user, isAuthenticated: true }),
    }),
    {
      name: 'vitals-auth',
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
)
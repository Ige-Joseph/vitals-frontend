import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

// Auth pages
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'

// App pages
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { MyCarePage } from '@/pages/MyCarePage'
import { MotherBabyPage } from '@/pages/MotherBabyPage'
import { ArticlesPage } from '@/pages/ArticlesPage'
import { ProfilePage } from '@/pages/ProfilePage'

// Admin pages
import { AdminShell } from '@/admin/layout/AdminShell'
import { AdminOverviewPage } from '@/admin/pages/AdminOverviewPage'
import { AdminUsersPage } from '@/admin/pages/AdminUsersPage'
import { AdminArticlesPage } from '@/admin/pages/AdminArticlesPage'
import { AdminSymptomsPage } from '@/admin/pages/AdminSymptomsPage'
import { AdminDrugsPage } from '@/admin/pages/AdminDrugsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasHydrated } = useAuthStore()
  const location = useLocation()

  if (!hasHydrated) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, hasHydrated } = useAuthStore()
  const location = useLocation()

  if (!hasHydrated) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasHydrated } = useAuthStore()

  if (!hasHydrated) return null

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default function App() {
  const hydrateUser = useAuthStore((s) => s.hydrateUser)

  useEffect(() => {
    hydrateUser()
  }, [hydrateUser])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<RequireGuest><LoginPage /></RequireGuest>} />
        <Route path="/signup" element={<RequireGuest><SignupPage /></RequireGuest>} />

        <Route path="/" element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="care" element={<MyCarePage />} />
          <Route path="mother-baby" element={<MotherBabyPage />} />
          <Route path="articles" element={<ArticlesPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="/admin" element={<RequireAdmin><AdminShell /></RequireAdmin>}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="articles" element={<AdminArticlesPage />} />
          <Route path="symptoms" element={<AdminSymptomsPage />} />
          <Route path="drugs" element={<AdminDrugsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
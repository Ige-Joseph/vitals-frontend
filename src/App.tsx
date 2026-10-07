import React, { lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { SESSION_EXPIRED_EVENT } from '@/lib/session'
import { Spinner } from '@/components/ui'
import { AsyncRoute } from '@/components/routing/AsyncRoute'

// Auth pages
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'

// App pages
import { AppShell } from '@/components/layout/AppShell'
const AdminShell = lazy(() => import('@/admin/layout/AdminShell').then((module) => ({ default: module.AdminShell })))
const AdminOverviewPage = lazy(() => import('@/admin/pages/AdminOverviewPage').then((module) => ({ default: module.AdminOverviewPage })))
const AdminUsersPage = lazy(() => import('@/admin/pages/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })))
const AdminArticlesPage = lazy(() => import('@/admin/pages/AdminArticlesPage').then((module) => ({ default: module.AdminArticlesPage })))
const AdminSymptomsPage = lazy(() => import('@/admin/pages/AdminSymptomsPage').then((module) => ({ default: module.AdminSymptomsPage })))
const AdminDrugsPage = lazy(() => import('@/admin/pages/AdminDrugsPage').then((module) => ({ default: module.AdminDrugsPage })))

const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage').then((module) => ({ default: module.VerifyEmailPage })))
const BillingPage = lazy(() => import('@/pages/BillingPage').then((module) => ({ default: module.BillingPage })))
const GoogleCallbackPage = lazy(() => import('@/pages/GoogleCallbackPage').then((module) => ({ default: module.GoogleCallbackPage })))
const CompleteProfilePage = lazy(() => import('@/pages/CompleteProfilePage').then((module) => ({ default: module.CompleteProfilePage })))
const InvitationPage = lazy(() => import('@/pages/InvitationPage').then((module) => ({ default: module.InvitationPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const MyCarePage = lazy(() => import('@/pages/my-care/MyCarePage').then((module) => ({ default: module.MyCarePage })))
const MotherBabyPage = lazy(() => import('@/pages/mother-baby/MotherBabyPage').then((module) => ({ default: module.MotherBabyPage })))
const ArticlesPage = lazy(() => import('@/pages/ArticlesPage').then((module) => ({ default: module.ArticlesPage })))
const FamilyPage = lazy(() => import('@/pages/family/FamilyPage').then(module => ({ default: module.FamilyPage })))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage').then((module) => ({ default: module.ProfilePage })))



function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasHydrated } = useAuthStore()
  const location = useLocation()

  if (!hasHydrated) return <AuthPending />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, hasHydrated } = useAuthStore()
  const location = useLocation()

  if (!hasHydrated) return <AuthPending />

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

  if (!hasHydrated) return <AuthPending />

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function AuthPending() {
  return (
    <main role="status" aria-live="polite" style={{ minHeight: '100dvh', display: 'grid', placeContent: 'center', gap: '0.75rem', justifyItems: 'center', color: 'var(--on-surface-variant)' }}>
      <Spinner size={28} color="var(--primary)" />
      <span>Checking your session…</span>
    </main>
  )
}

export default function App() {
  const hydrateUser = useAuthStore((s) => s.hydrateUser)
  const clearSession = useAuthStore((s) => s.clearSession)

  useEffect(() => {
    void hydrateUser()
  }, [hydrateUser])

  useEffect(() => {
    const handleSessionExpired = () => clearSession()
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [clearSession])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<RequireGuest><LoginPage /></RequireGuest>} />
        <Route path="/signup" element={<RequireGuest><SignupPage /></RequireGuest>} />
        <Route path="/forgot-password" element={<RequireGuest><ForgotPasswordPage /></RequireGuest>} />
        <Route path="/reset-password" element={<RequireGuest><ResetPasswordPage /></RequireGuest>} />
        <Route path="/verify-email" element={<AsyncRoute label="email verification"><VerifyEmailPage /></AsyncRoute>} />
        <Route path="/auth/google" element={<AsyncRoute label="Google sign-in"><GoogleCallbackPage /></AsyncRoute>} />
        <Route path="/complete-profile" element={<RequireAuth><AsyncRoute label="profile setup"><CompleteProfilePage /></AsyncRoute></RequireAuth>} />
        <Route path="/billing" element={<AsyncRoute label="billing"><BillingPage /></AsyncRoute>} />
        <Route path="/invitations/:token" element={<AsyncRoute label="invitation"><InvitationPage /></AsyncRoute>} />
        <Route path="/invitations/by-id/:invitationId" element={<RequireAuth><AsyncRoute label="invitation"><InvitationPage /></AsyncRoute></RequireAuth>} />
        
        <Route path="/" element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<AsyncRoute label="dashboard"><DashboardPage /></AsyncRoute>} />
          <Route path="care" element={<AsyncRoute label="care"><MyCarePage /></AsyncRoute>} />
          <Route path="mother-baby" element={<AsyncRoute label="Mother & Baby"><MotherBabyPage /></AsyncRoute>} />
          <Route path="articles" element={<AsyncRoute label="articles" preserveOnSearch><ArticlesPage /></AsyncRoute>} />
          <Route path="family" element={<AsyncRoute label="family"><FamilyPage /></AsyncRoute>} />
          <Route path="profile" element={<AsyncRoute label="profile"><ProfilePage /></AsyncRoute>} />
        </Route>

        <Route path="/admin" element={<RequireAdmin><AsyncRoute label="admin"><AdminShell /></AsyncRoute></RequireAdmin>}>
          <Route index element={<AsyncRoute label="admin overview"><AdminOverviewPage /></AsyncRoute>} />
          <Route path="users" element={<AsyncRoute label="users"><AdminUsersPage /></AsyncRoute>} />
          <Route path="articles" element={<AsyncRoute label="articles"><AdminArticlesPage /></AsyncRoute>} />
          <Route path="symptoms" element={<AsyncRoute label="symptoms"><AdminSymptomsPage /></AsyncRoute>} />
          <Route path="drugs" element={<AsyncRoute label="drug library"><AdminDrugsPage /></AsyncRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

import React, { useEffect, useState, useCallback } from 'react'
import { api, ApiError } from '@/lib/api'
import { Button, Badge, Skeleton, StatusBanner } from '@/components/ui'

interface AdminUser {
  id: string; email: string; role: string; planType: string
  emailVerified: boolean; isActive: boolean; createdAt: string
}
interface Pagination { page: number; limit: number; total: number; pages: number }

const ROLE_BADGE = { ADMIN: 'warning' as const, USER: 'neutral' as const }
const PLAN_BADGE = { PREMIUM: 'primary' as const, FREE: 'neutral' as const }

export function AdminUsersPage() {
  const [users, setUsers]           = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [actionId, setActionId]     = useState<string | null>(null)
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [search, setSearch]         = useState('')

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const r = await api.get<{ users: AdminUser[]; pagination: Pagination }>(
        `/api/v1/users?page=${p}&limit=20`
      )
      setUsers(r.users)
      setPagination(r.pagination)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page) }, [load, page])

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const toggleActive = async (user: AdminUser) => {
    setActionId(user.id)
    try {
      const endpoint = user.isActive ? 'deactivate' : 'reactivate'
      await api.patch(`/api/v1/users/${user.id}/${endpoint}`, {})
      setUsers(us => us.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u))
      showToast('success', `User ${user.isActive ? 'deactivated' : 'reactivated'} successfully.`)
    } catch (e) {
      showToast('error', e instanceof ApiError ? e.message : 'Action failed')
    } finally {
      setActionId(null)
    }
  }

  const filtered = search.trim()
    ? users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()))
    : users

  return (
    <div style={{ padding: 'clamp(1.5rem, 4vw, 2.5rem)', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--on-surface)' }}>Users</h1>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {pagination ? `${pagination.total} total users` : 'Loading…'}
        </p>
      </div>

      {toast && (
        <div style={{ marginBottom: '1.25rem' }}>
          <StatusBanner type={toast.type} message={toast.msg} />
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <span className="material-symbols-outlined icon-sm" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--outline)', pointerEvents: 'none' }}>search</span>
        <input
          className="input-base"
          placeholder="Search by email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '2.5rem' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {[1,2,3,4,5].map(i => <Skeleton key={i} height={64} style={{ borderRadius: 'var(--radius-xl)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--outline)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48 }}>person_search</span>
          <p style={{ marginTop: '0.75rem' }}>No users found.</p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 80px 110px', gap: '0.75rem', padding: '0.5rem 1rem', marginBottom: '0.375rem' }}>
            {['Email', 'Role', 'Plan', 'Status', 'Action'].map(h => (
              <p key={h} style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</p>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map(user => (
              <div key={user.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 90px 80px 80px 110px',
                gap: '0.75rem', alignItems: 'center',
                padding: '0.875rem 1rem', background: 'var(--surface-container-lowest)',
                borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)',
                opacity: user.isActive ? 1 : 0.65,
              }}>
                {/* Email + verified */}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.2rem' }}>
                    <span className="material-symbols-outlined icon-filled" style={{ fontSize: 12, color: user.emailVerified ? '#16a34a' : 'var(--tertiary)' }}>
                      {user.emailVerified ? 'verified' : 'pending'}
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--outline)' }}>
                      {user.emailVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                </div>

                <Badge variant={ROLE_BADGE[user.role as keyof typeof ROLE_BADGE] ?? 'neutral'}>{user.role}</Badge>
                <Badge variant={PLAN_BADGE[user.planType as keyof typeof PLAN_BADGE] ?? 'neutral'}>{user.planType}</Badge>
                <Badge variant={user.isActive ? 'success' : 'error'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>

                <Button
                  size="sm"
                  variant={user.isActive ? 'danger' : 'secondary'}
                  loading={actionId === user.id}
                  onClick={() => toggleActive(user)}
                  style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                >
                  {user.isActive ? 'Deactivate' : 'Reactivate'}
                </Button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', paddingTop: '1.5rem' }}>
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>Page {page} of {pagination.pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, Skeleton } from '@/components/ui'

interface Stats {
  users: { total: number; active: number; unverified: number }
  articles: { total: number; published: number; drafts: number }
  usage: { symptomChecks: number; drugDetections: number }
}

function StatCard({
  label, value, sub, icon, color, bg, onClick
}: {
  label: string; value: number | string; sub?: string
  icon: string; color: string; bg: string; onClick?: () => void
}) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)',
      padding: '1.375rem', boxShadow: 'var(--shadow-sm)',
      cursor: onClick ? 'pointer' : 'default', transition: 'all 0.15s',
      display: 'flex', alignItems: 'flex-start', gap: '1rem',
    }}
      onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)' } }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)' }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="material-symbols-outlined icon-filled" style={{ color, fontSize: 22 }}>{icon}</span>
      </div>
      <div>
        <p style={{ fontSize: '1.625rem', fontFamily: 'var(--font-headline)', fontWeight: 800, color: 'var(--on-surface)', lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>{label}</p>
        {sub && <p style={{ fontSize: '0.75rem', color: 'var(--outline)', marginTop: '0.2rem' }}>{sub}</p>}
      </div>
    </div>
  )
}

export function AdminOverviewPage() {
  const nav = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Fetch users and articles in parallel — no dedicated stats endpoint needed
        const [usersRes, articlesRes, usageRes] = await Promise.allSettled([
          api.get<{ users: any[]; pagination: { total: number } }>('/api/v1/users?limit=1'),
          api.get<{ articles: any[]; pagination: { total: number } }>('/api/v1/articles/admin/list?limit=1'),
          // Usage endpoint returns today's totals — we'll show a placeholder if unavailable
          Promise.resolve({ symptomChecks: { used: 0 }, drugDetections: { used: 0 } }),
        ])

        if (cancelled) return

        const totalUsers = usersRes.status === 'fulfilled' ? usersRes.value.pagination.total : 0
        const totalArticles = articlesRes.status === 'fulfilled' ? articlesRes.value.pagination.total : 0

        // Fetch a larger page to count active/unverified
        const usersDetail = await api.get<{ users: any[]; pagination: { total: number } }>('/api/v1/users?limit=100')
        const activeUsers = usersDetail.users.filter(u => u.isActive).length
        const unverified  = usersDetail.users.filter(u => !u.emailVerified).length

        // Articles: count published vs draft from second fetch
        const articlesDetail = await api.get<{ articles: any[]; pagination: { total: number } }>('/api/v1/articles/admin/list?limit=100')
        const published = articlesDetail.articles.filter((a: any) => a.isPublished).length
        const drafts    = articlesDetail.articles.filter((a: any) => !a.isPublished).length

        if (!cancelled) {
          setStats({
            users:    { total: usersDetail.pagination.total, active: activeUsers, unverified },
            articles: { total: articlesDetail.pagination.total, published, drafts },
            usage:    { symptomChecks: 0, drugDetections: 0 },
          })
        }
      } catch { /* show skeleton */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ padding: 'clamp(1.5rem, 4vw, 2.5rem)', maxWidth: 960, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{today}</p>
        <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--on-surface)' }}>Admin Overview</h1>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', marginTop: '0.25rem' }}>Platform health at a glance.</p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} height={100} style={{ borderRadius: 'var(--radius-xl)' }} />)}
        </div>
      ) : stats ? (
        <>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
            <StatCard label="Total users"    value={stats.users.total}        icon="group"         color="var(--primary)"  bg="var(--primary-fixed)"    onClick={() => nav('/admin/users')}    />
            <StatCard label="Active users"   value={stats.users.active}       sub={`${stats.users.unverified} unverified`} icon="person_check"  color="#16a34a" bg="#dcfce7"           onClick={() => nav('/admin/users')}    />
            <StatCard label="Articles"       value={stats.articles.total}     sub={`${stats.articles.published} published`} icon="library_books" color="var(--secondary)" bg="var(--secondary-fixed)" onClick={() => nav('/admin/articles')} />
            <StatCard label="Drafts"         value={stats.articles.drafts}    icon="edit_note"     color="var(--tertiary)" bg="var(--tertiary-fixed)"  onClick={() => nav('/admin/articles')} />
            <StatCard label="Symptom logs"   value="View all"                 icon="psychology"    color="#7c3aed"         bg="#ede9fe"                 onClick={() => nav('/admin/symptoms')} />
            <StatCard label="Drug scans"     value="View all"                 icon="biotech"       color="var(--tertiary)" bg="var(--tertiary-fixed)"  onClick={() => nav('/admin/drugs')}    />
          </div>

          {/* Quick links */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Card style={{ padding: '1.25rem' }}>
              <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Quick actions</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {[
                  { label: 'Create article',   icon: 'add_circle', action: () => nav('/admin/articles?new=1')   },
                  { label: 'Manage users',     icon: 'manage_accounts', action: () => nav('/admin/users')       },
                  { label: 'View symptom logs',icon: 'psychology',  action: () => nav('/admin/symptoms')        },
                  { label: 'View drug scans',  icon: 'biotech',     action: () => nav('/admin/drugs')           },
                ].map(({ label, icon, action }) => (
                  <button key={label} onClick={action} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem',
                    background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)',
                    border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                    fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--on-surface)',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-fixed)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-container-low)')}
                  >
                    <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--primary)' }}>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </Card>

            <Card style={{ padding: '1.25rem' }}>
              <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Platform health</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'User verification rate', value: stats.users.total ? `${Math.round((stats.users.total - stats.users.unverified) / stats.users.total * 100)}%` : '—', good: true },
                  { label: 'Articles published',     value: stats.articles.total ? `${Math.round(stats.articles.published / stats.articles.total * 100)}%` : '—', good: stats.articles.published > 0 },
                  { label: 'Active user rate',       value: stats.users.total ? `${Math.round(stats.users.active / stats.users.total * 100)}%` : '—', good: true },
                ].map(({ label, value, good }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{label}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: good ? '#16a34a' : 'var(--tertiary)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--outline)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: '1rem' }}>error_outline</span>
          <p>Failed to load stats. Check your connection and refresh.</p>
        </div>
      )}
    </div>
  )
}

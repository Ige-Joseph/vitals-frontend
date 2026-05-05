import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

const ADMIN_NAV = [
  { to: '/admin',          icon: 'dashboard',      label: 'Overview',  end: true },
  { to: '/admin/users',    icon: 'group',           label: 'Users'               },
  { to: '/admin/articles', icon: 'library_books',   label: 'Articles'            },
  { to: '/admin/symptoms', icon: 'psychology',      label: 'Symptom Logs'        },
  { to: '/admin/drugs',    icon: 'biotech',         label: 'Drug Scans'          },
]

export function AdminShell() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--surface)' }}>

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: 'var(--inverse-surface)',
        display: 'flex', flexDirection: 'column',
        padding: '1.25rem 0.75rem',
        position: 'sticky', top: 0, height: '100dvh', overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0 0.5rem', marginBottom: '0.5rem' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined icon-filled" style={{ color: 'white', fontSize: 18 }}>health_and_safety</span>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1rem', color: 'var(--inverse-on-surface)' }}>Vitals</p>
            <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0.75rem 0.5rem 1rem' }} />

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1 }}>
          {ADMIN_NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-lg)',
                  background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: isActive ? 'var(--inverse-on-surface)' : 'rgba(255,255,255,0.55)',
                  fontFamily: 'var(--font-headline)', fontWeight: isActive ? 700 : 500,
                  fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
                  borderLeft: isActive ? '3px solid var(--primary-fixed-dim)' : '3px solid transparent',
                }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span className={`material-symbols-outlined ${isActive ? 'icon-filled' : ''}`} style={{ fontSize: 20 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom — user + sign out */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.875rem', marginBottom: '0.5rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8125rem', fontWeight: 700, flexShrink: 0 }}>
              {user?.email?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--inverse-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email?.split('@')[0] ?? 'Admin'}
              </p>
              <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>Administrator</p>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.5625rem 0.875rem', borderRadius: 'var(--radius-lg)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-headline)',
            fontWeight: 500, fontSize: '0.875rem', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(186,26,26,0.25)'; (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: 'var(--surface)' }}>
        <Outlet />
      </main>
    </div>
  )
}

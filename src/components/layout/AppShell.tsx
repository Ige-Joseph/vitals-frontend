import React, { useState } from 'react'
import { NavLink, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

const NAV_ITEMS = [
  { to: '/dashboard',    icon: 'dashboard',         label: 'Dashboard'     },
  { to: '/care',         icon: 'medical_services',  label: 'My Care'       },
  { to: '/mother-baby',  icon: 'child_care',        label: 'Mother & Baby' },
  { to: '/articles',     icon: 'library_books',     label: 'Articles'      },
  { to: '/profile',      icon: 'account_circle',    label: 'Profile'       },
]

function NavItem({ to, icon, label, collapsed, onClick }: {
  to: string; icon: string; label: string; collapsed?: boolean; onClick?: () => void
}) {
  return (
    <NavLink to={to} onClick={onClick} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <div style={{
          display: 'flex', alignItems: 'center', gap: collapsed ? 0 : '0.75rem',
          padding: collapsed ? '0.75rem' : '0.6875rem 1rem',
          borderRadius: 'var(--radius-lg)',
          background: isActive ? 'var(--primary-fixed)' : 'transparent',
          color: isActive ? 'var(--primary)' : 'var(--on-surface-variant)',
          fontFamily: 'var(--font-headline)', fontWeight: isActive ? 700 : 500,
          fontSize: '0.9rem', transition: 'all 0.15s ease',
          justifyContent: collapsed ? 'center' : undefined,
          cursor: 'pointer',
        }}
          onMouseEnter={e => { if (!e.currentTarget.style.background.includes('primary-fixed')) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-container)' }}
          onMouseLeave={e => { if (!e.currentTarget.style.background.includes('primary-fixed')) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
        >
          <span className={`material-symbols-outlined ${isActive ? 'icon-filled' : ''}`}
            style={{ fontSize: 22 }}>{icon}</span>
          {!collapsed && <span>{label}</span>}
        </div>
      )}
    </NavLink>
  )
}

export function AppShell() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const pageTitle = NAV_ITEMS.find(n => location.pathname.startsWith(n.to))?.label ?? 'Vitals'

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--surface)' }}>

      {/* ── Sidebar (desktop) ─────────────────────────────── */}
      <aside style={{
        width: 'var(--sidebar-width)', flexShrink: 0,
        background: 'var(--surface-container-low)',
        borderRight: '1px solid var(--outline-variant)',
        height: '100dvh', position: 'sticky', top: 0,
        display: 'flex', flexDirection: 'column', padding: '1.25rem 0.875rem',
        gap: '0.25rem', overflowY: 'auto',
        ['@media (max-width: 768px)' as any]: { display: 'none' }
      }} className="sidebar-desktop">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0 0.5rem', marginBottom: '1.75rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-lg)',
            background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span className="material-symbols-outlined icon-sm" style={{ color: 'white' }}>health_and_safety</span>
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', letterSpacing: '-0.02em' }}>Vitals</h1>
            <p style={{ fontSize: '0.6rem', color: 'var(--outline)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Health Companion</p>
          </div>
        </div>

        {/* User chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          padding: '0.625rem 0.75rem', background: 'var(--surface-container)',
          borderRadius: 'var(--radius-xl)', marginBottom: '1.25rem'
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.8125rem', flexShrink: 0
          }}>
            {user?.email?.[0]?.toUpperCase() ?? 'V'}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email?.split('@')[0] ?? 'User'}
            </p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--outline)', textTransform: 'capitalize' }}>{user?.planType?.toLowerCase() ?? 'free'} plan</p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1 }}>
          {NAV_ITEMS.map(item => <NavItem key={item.to} {...item} />)}
        </nav>

        {/* Logout */}
        <button onClick={logout} style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6875rem 1rem',
          borderRadius: 'var(--radius-lg)', border: 'none', background: 'transparent',
          color: 'var(--on-surface-variant)', cursor: 'pointer', fontFamily: 'var(--font-headline)',
          fontWeight: 500, fontSize: '0.9rem', width: '100%', transition: 'background 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--error-container)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>logout</span>
          <span>Sign out</span>
        </button>
      </aside>

      {/* ── Main content ──────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100dvh' }}>

        {/* Top bar (mobile only) */}
        <header className="topbar-mobile" style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'rgba(247,249,255,0.85)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--outline-variant)',
          padding: '0 1rem', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'white' }}>health_and_safety</span>
            </div>
            <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>Vitals</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <button style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', borderRadius: 'var(--radius-md)' }}>
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '0.75rem', fontWeight: 700, marginLeft: '0.25rem'
            }}>
              {user?.email?.[0]?.toUpperCase() ?? 'V'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          paddingBottom: 'var(--nav-height-mobile)',
        }} className="main-content">
          <Outlet />
        </main>

        {/* Bottom nav (mobile) */}
        <nav className="bottom-nav" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(247,249,255,0.95)', backdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--outline-variant)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          height: 'var(--nav-height-mobile)', padding: '0.25rem 0.5rem 0.75rem',
          zIndex: 50,
        }}>
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} style={{ textDecoration: 'none', flex: 1 }}>
              {({ isActive }) => (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem' }}>
                  <div style={{
                    width: 40, height: 28, borderRadius: 'var(--radius-full)',
                    background: isActive ? 'var(--primary-fixed)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}>
                    <span className={`material-symbols-outlined ${isActive ? 'icon-filled' : ''}`}
                      style={{ fontSize: 22, color: isActive ? 'var(--primary)' : 'var(--on-surface-variant)' }}>{icon}</span>
                  </div>
                  <span style={{
                    fontSize: '0.625rem', fontWeight: isActive ? 700 : 500, letterSpacing: '0.02em',
                    color: isActive ? 'var(--primary)' : 'var(--on-surface-variant)',
                    fontFamily: 'var(--font-headline)',
                  }}>{label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <style>{`
        @media (min-width: 769px) {
          .sidebar-desktop { display: flex !important; }
          .topbar-mobile { display: none !important; }
          .bottom-nav { display: none !important; }
          .main-content { padding-bottom: 0 !important; }
        }
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .topbar-mobile { display: flex !important; }
          .bottom-nav { display: flex !important; }
        }
      `}</style>
    </div>
  )
}

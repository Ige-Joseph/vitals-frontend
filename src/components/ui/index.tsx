import React from 'react'

// ─── Spinner ────────────────────────────────────────────────
export const Spinner = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg
    width={size} height={size}
    viewBox="0 0 24 24" fill="none"
    style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}
  >
    <circle cx="12" cy="12" r="10" stroke={color} strokeOpacity="0.2" strokeWidth="3" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
  </svg>
)

// ─── Button ─────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: string
}

export const Button = ({
  variant = 'primary', size = 'md', loading = false,
  children, icon, disabled, style, ...props
}: BtnProps) => {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: '0.5rem', border: 'none', cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-headline)', fontWeight: 600, whiteSpace: 'nowrap',
    transition: 'all 0.15s ease', outline: 'none', position: 'relative',
    ...(size === 'sm' && { padding: '0.375rem 0.875rem', fontSize: '0.8125rem', borderRadius: 'var(--radius-full)' }),
    ...(size === 'md' && { padding: '0.6875rem 1.25rem', fontSize: '0.9375rem', borderRadius: 'var(--radius-full)' }),
    ...(size === 'lg' && { padding: '0.875rem 1.75rem', fontSize: '1rem', borderRadius: 'var(--radius-full)' }),
    ...(variant === 'primary' && { background: 'var(--gradient-primary)', color: 'var(--on-primary)', boxShadow: '0 4px 12px rgba(0,91,191,0.25)' }),
    ...(variant === 'secondary' && { background: 'var(--primary-fixed)', color: 'var(--on-primary-fixed-variant)' }),
    ...(variant === 'ghost' && { background: 'transparent', color: 'var(--primary)' }),
    ...(variant === 'outline' && { background: 'transparent', color: 'var(--primary)', border: '1.5px solid var(--primary)' }),
    ...(variant === 'danger' && { background: 'var(--error-container)', color: 'var(--on-error-container)' }),
    opacity: disabled || loading ? 0.6 : 1,
    ...style,
  }
  return (
    <button style={base} disabled={disabled || loading} {...props}>
      {loading ? <Spinner size={16} /> : icon ? <span className="material-symbols-outlined icon-sm">{icon}</span> : null}
      {children}
    </button>
  )
}

// ─── Input ───────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: string
  rightElement?: React.ReactNode
}

export const Input = ({ label, error, icon, rightElement, style, ...props }: InputProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
    {label && (
      <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface-variant)', fontFamily: 'var(--font-headline)' }}>
        {label}
      </label>
    )}
    <div style={{ position: 'relative' }}>
      {icon && (
        <span className="material-symbols-outlined icon-sm" style={{
          position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--outline)', pointerEvents: 'none'
        }}>{icon}</span>
      )}
      <input
        className="input-base"
        style={{ paddingLeft: icon ? '2.5rem' : undefined, paddingRight: rightElement ? '3rem' : undefined, ...style }}
        {...props}
      />
      {rightElement && (
        <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
          {rightElement}
        </div>
      )}
    </div>
    {error && <p style={{ fontSize: '0.8125rem', color: 'var(--error)', marginTop: '0.125rem' }}>{error}</p>}
  </div>
)

// ─── Badge ───────────────────────────────────────────────────
type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'info'
export const Badge = ({ variant = 'neutral', children }: { variant?: BadgeVariant; children: React.ReactNode }) => {
  const colors: Record<BadgeVariant, { bg: string; color: string }> = {
    primary: { bg: 'var(--primary-fixed)', color: 'var(--on-primary-fixed-variant)' },
    success: { bg: '#dcfce7', color: '#166534' },
    warning: { bg: 'var(--tertiary-fixed)', color: 'var(--tertiary)' },
    error:   { bg: 'var(--error-container)', color: 'var(--on-error-container)' },
    neutral: { bg: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' },
    info:    { bg: 'var(--secondary-fixed)', color: 'var(--on-secondary-container)' },
  }
  const c = colors[variant]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.1875rem 0.625rem', borderRadius: 'var(--radius-full)',
      fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
      fontFamily: 'var(--font-headline)', background: c.bg, color: c.color,
    }}>{children}</span>
  )
}

// ─── Card ────────────────────────────────────────────────────
export const Card = ({ children, style, onClick, className }: {
  children: React.ReactNode; style?: React.CSSProperties
  onClick?: () => void; className?: string
}) => (
  <div
    className={className}
    onClick={onClick}
    style={{
      background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-md)', overflow: 'hidden',
      cursor: onClick ? 'pointer' : undefined,
      transition: onClick ? 'transform 0.15s, box-shadow 0.15s' : undefined,
      ...style
    }}
    onMouseEnter={onClick ? (e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-lg)' } : undefined}
    onMouseLeave={onClick ? (e) => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)' } : undefined}
  >{children}</div>
)

// ─── Empty State ─────────────────────────────────────────────
export const EmptyState = ({ icon, title, description, action }: {
  icon: string; title: string; description?: string; action?: React.ReactNode
}) => (
  <div style={{ textAlign: 'center', padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="material-symbols-outlined icon-lg" style={{ color: 'var(--primary)' }}>{icon}</span>
    </div>
    <div>
      <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--on-surface)' }}>{title}</p>
      {description && <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginTop: '0.375rem' }}>{description}</p>}
    </div>
    {action}
  </div>
)

// ─── Skeleton ────────────────────────────────────────────────
export const Skeleton = ({ width = '100%', height = 20, style }: { width?: string | number; height?: number; style?: React.CSSProperties }) => (
  <div className="skeleton" style={{ width, height, ...style }} />
)

// ─── Toast ───────────────────────────────────────────────────
export const StatusBanner = ({ type, message }: { type: 'success' | 'error' | 'info' | 'warning'; message: string }) => {
  const config = {
    success: { bg: '#dcfce7', color: '#166534', icon: 'check_circle' },
    error:   { bg: 'var(--error-container)', color: 'var(--on-error-container)', icon: 'error' },
    info:    { bg: 'var(--primary-fixed)', color: 'var(--on-primary-fixed-variant)', icon: 'info' },
    warning: { bg: 'var(--tertiary-fixed)', color: 'var(--tertiary)', icon: 'warning' },
  }[type]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', background: config.bg, color: config.color }}>
      <span className="material-symbols-outlined icon-sm icon-filled">{config.icon}</span>
      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{message}</span>
    </div>
  )
}

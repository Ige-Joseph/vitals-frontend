import type { CSSProperties, ReactNode } from 'react'
import { Card } from '@/components/ui'

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  fontSize: '0.9rem',
  color: 'var(--on-surface)',
  background: 'var(--surface-container)',
  border: '1px solid var(--outline-variant)',
  borderRadius: 'var(--radius-lg)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
}

const focusInput = (element: HTMLElement) => {
  element.style.borderColor = 'var(--primary)'
  element.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)'
}

const blurInput = (element: HTMLElement) => {
  element.style.borderColor = 'var(--outline-variant)'
  element.style.boxShadow = 'none'
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface-variant)', letterSpacing: '0.01em' }}>
        {label}
      </span>
      {children}
    </label>
  )
}

export function Input({
  value,
  onChange,
  type = 'text',
  placeholder,
  step,
  autoComplete,
}: {
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  step?: string
  autoComplete?: string
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      step={step}
      autoComplete={autoComplete}
      onChange={event => onChange(event.target.value)}
      onFocus={event => focusInput(event.currentTarget)}
      onBlur={event => blurInput(event.currentTarget)}
      style={inputStyle}
    />
  )
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  options: ReadonlyArray<{ label: string; value: string }>
  placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      onFocus={event => focusInput(event.currentTarget)}
      onBlur={event => blurInput(event.currentTarget)}
      style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
    >
      {placeholder ? <option value="" disabled>{placeholder}</option> : null}
      {options.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  )
}

export function Textarea({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={event => onChange(event.target.value)}
      onFocus={event => focusInput(event.currentTarget)}
      onBlur={event => blurInput(event.currentTarget)}
      rows={2}
      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
    />
  )
}

export function SectionHeader({ label }: { label: string }) {
  return (
    <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '1rem' }}>
      {label}
    </p>
  )
}

export function InfoRow({
  label,
  value,
}: {
  label: string
  value?: string | number | string[]
}) {
  const display = Array.isArray(value)
    ? value.length > 0 ? value.join(', ') : '—'
    : value || '—'

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.625rem 0', borderBottom: '1px solid var(--outline-variant)' }}>
      <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)', textAlign: 'right', wordBreak: 'break-word' }}>
        {display}
      </span>
    </div>
  )
}

export function CollapsibleCard({
  title,
  open,
  onToggle,
  children,
  className,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <Card style={{ padding: '1.25rem' }} className={className}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        style={{ width: '100%', background: 'none', border: 'none', padding: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: open ? '1rem' : 0 }}
      >
        <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {title}
        </span>
        <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)', fontSize: '1.25rem' }}>
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      {open ? <div>{children}</div> : null}
    </Card>
  )
}

function Skeleton({ width = '100%', height = '1rem', radius = 'var(--radius-lg)' }: {
  width?: string | number
  height?: string | number
  radius?: string
}) {
  return <div style={{ width, height, borderRadius: radius, background: 'var(--surface-container-high)', animation: 'skeleton-pulse 1.6s ease-in-out infinite' }} />
}

export function ProfilePageSkeleton() {
  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <style>{`@keyframes skeleton-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <Card style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Skeleton width={56} height={56} radius="50%" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Skeleton width="50%" />
            <Skeleton width="70%" height="0.875rem" />
            <Skeleton width="30%" height="1.25rem" radius="999px" />
          </div>
        </div>
      </Card>
      {[2, 7, 4].map(rows => (
        <Card key={rows} style={{ padding: '1.25rem' }}>
          <Skeleton width="35%" height="0.75rem" />
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: rows }).map((_, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Skeleton width="35%" height="0.875rem" />
                <Skeleton width="40%" height="0.875rem" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}


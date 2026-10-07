import React, { Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, Spinner } from '@/components/ui'

function RouteLoading({ label }: { label: string }) {
  return (
    <main role="status" aria-live="polite" aria-busy="true" style={{ minHeight: 'min(55vh, 28rem)', display: 'grid', placeContent: 'center', justifyItems: 'center', gap: '0.75rem', color: 'var(--on-surface-variant)' }}>
      <Spinner size={28} color="var(--primary)" />
      <span>Loading {label}…</span>
    </main>
  )
}

class RouteChunkBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <main role="alert" style={{ minHeight: 'min(55vh, 28rem)', display: 'grid', placeContent: 'center', justifyItems: 'center', gap: '0.75rem', padding: '1.5rem', textAlign: 'center', color: 'var(--on-surface)' }}>
          <h1 style={{ fontSize: '1.25rem' }}>This section couldn’t load</h1>
          <p style={{ maxWidth: '28rem', color: 'var(--on-surface-variant)' }}>Check your connection, then reload Vitals to try again.</p>
          <Button type="button" onClick={() => window.location.reload()}>Reload Vitals</Button>
        </main>
      )
    }
    return this.props.children
  }
}

export function AsyncRoute({ children, label, preserveOnSearch = false }: { children: React.ReactNode; label: string; preserveOnSearch?: boolean }) {
  const location = useLocation()

  return (
    <RouteChunkBoundary key={preserveOnSearch ? location.pathname : location.pathname + location.search}>
      <Suspense fallback={<RouteLoading label={label} />}>{children}</Suspense>
    </RouteChunkBoundary>
  )
}

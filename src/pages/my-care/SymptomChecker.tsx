import { useCallback, useEffect, useState } from 'react'
import { Button, Card, EmptyState, Skeleton, StatusBanner } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import type { Pagination, SymptomEntry } from './my-care.types'

const SEVERITY_CONFIG = {
  low: { color: '#16a34a', bg: '#dcfce7', label: 'Low', icon: 'check_circle' },
  moderate: { color: 'var(--tertiary)', bg: 'var(--tertiary-fixed)', label: 'Moderate', icon: 'warning' },
  high: { color: 'var(--error)', bg: 'var(--error-container)', label: 'High', icon: 'error' },
  emergency: { color: '#7f1d1d', bg: '#fee2e2', label: 'Emergency', icon: 'emergency' },
} as const

type SymptomResult = {
  id: string
  severity: string
  summary: string
  guidance: string
  disclaimer: string
  seekCareIf: string[]
}

function SeverityBadge({ severity }: { severity: string }) {
  const config = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG]
  if (!config) return null

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.1875rem 0.625rem', borderRadius: 'var(--radius-full)',
      fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em',
      textTransform: 'uppercase', fontFamily: 'var(--font-headline)',
      background: config.bg, color: config.color,
    }}>
      {config.label}
    </span>
  )
}

function SymptomHistory() {
  const [entries, setEntries] = useState<SymptomEntry[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async (requestedPage: number) => {
    setLoading(true)
    try {
      const response = await api.get<{ entries: SymptomEntry[]; pagination: Pagination }>(
        `/api/v1/symptoms/history?page=${requestedPage}&limit=10`,
      )
      setEntries(response.entries)
      setPagination(response.pagination)
    } catch {
      // The empty state remains usable when history cannot be loaded.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(page)
  }, [load, page])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[1, 2, 3].map(item => <Skeleton key={item} height={80} style={{ borderRadius: 'var(--radius-xl)' }} />)}
      </div>
    )
  }

  if (entries.length === 0) {
    return <EmptyState icon="history" title="No symptom checks yet" description="Your past AI symptom checks will appear here." />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {entries.map(entry => {
        const result = entry.aiResponse
        const isExpanded = expanded === entry.id
        const isFallback = result?._fallback === true

        return (
          <div key={entry.id} style={{
            background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)',
            overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
          }}>
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() => setExpanded(isExpanded ? null : entry.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                padding: '1rem 1.125rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--primary)' }} aria-hidden="true">psychology</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--on-surface)', lineHeight: 1.4, marginBottom: '0.375rem' }}>
                  {entry.symptomsText.slice(0, 100)}{entry.symptomsText.length > 100 ? '…' : ''}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {entry.severity && !isFallback ? <SeverityBadge severity={entry.severity} /> : null}
                  {isFallback ? (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--outline)', background: 'var(--surface-container-high)', padding: '0.1875rem 0.5rem', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Service unavailable
                    </span>
                  ) : null}
                  <span style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>
                    {new Date(entry.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                    {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined icon-sm" aria-hidden="true" style={{ color: 'var(--outline)', flexShrink: 0, marginTop: 4, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                expand_more
              </span>
            </button>

            {isExpanded && result && !isFallback ? (
              <div style={{ padding: '0 1.125rem 1rem', borderTop: '1px solid var(--outline-variant)' }}>
                <div style={{ paddingTop: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Guidance</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--on-surface)', lineHeight: 1.6 }}>{result.guidance}</p>
                  </div>
                  {result.seekCareIf.length > 0 ? (
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--error)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Seek care if</p>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {result.seekCareIf.map((condition, index) => (
                          <li key={`${condition}-${index}`} style={{ fontSize: '0.8125rem', color: 'var(--on-surface)', lineHeight: 1.5, display: 'flex', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--error)', fontWeight: 700 }}>•</span>{condition}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p style={{ fontSize: '0.75rem', color: 'var(--outline)', lineHeight: 1.5, borderTop: '1px solid var(--outline-variant)', paddingTop: '0.625rem' }}>
                    {result.disclaimer}
                  </p>
                </div>
              </div>
            ) : null}

            {isExpanded && isFallback ? (
              <div style={{ padding: '0 1.125rem 1rem', borderTop: '1px solid var(--outline-variant)' }}>
                <p style={{ paddingTop: '0.875rem', fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                  {result?.guidance ?? 'AI analysis was unavailable at the time of this check. Please try again or consult a qualified healthcare professional.'}
                </p>
              </div>
            ) : null}
          </div>
        )
      })}

      {pagination && pagination.pages > 1 ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Previous</Button>
          <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{page} / {pagination.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(current => current + 1)}>Next</Button>
        </div>
      ) : null}
    </div>
  )
}

export function SymptomChecker() {
  const [view, setView] = useState<'check' | 'history'>('check')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SymptomResult | null>(null)
  const [error, setError] = useState('')

  const handleCheck = async () => {
    if (!text.trim()) return

    setLoading(true)
    setError('')
    setResult(null)
    try {
      const response = await api.post<SymptomResult>('/api/v1/symptoms/check', { symptomsText: text })
      setResult(response)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Symptom check failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const severityConfig = result
    ? SEVERITY_CONFIG[result.severity as keyof typeof SEVERITY_CONFIG]
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div role="tablist" aria-label="Symptom checker views" style={{ display: 'flex', gap: '0.375rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)', padding: '0.25rem' }}>
        {(['check', 'history'] as const).map(option => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={view === option}
            onClick={() => setView(option)}
            style={{
              flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-lg)', border: 'none',
              background: view === option ? 'var(--surface-container-lowest)' : 'transparent',
              color: view === option ? 'var(--primary)' : 'var(--on-surface-variant)',
              fontFamily: 'var(--font-headline)', fontWeight: view === option ? 700 : 500,
              fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: view === option ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {option === 'check' ? 'New check' : 'History'}
          </button>
        ))}
      </div>

      {view === 'check' ? (
        <>
          <Card style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)' }}>
              <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--tertiary)' }} aria-hidden="true">info</span>
              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>General guidance only — not a diagnosis. Always consult a qualified doctor for medical advice.</p>
            </div>
            <textarea
              value={text}
              onChange={event => setText(event.target.value)}
              placeholder="Describe your symptoms… e.g. I've had a headache and mild fever for 2 days"
              style={{
                width: '100%', minHeight: 120, padding: '0.875rem 1rem',
                background: 'var(--surface-container-low)', border: '1.5px solid var(--outline-variant)',
                borderRadius: 'var(--radius-lg)', fontFamily: 'var(--font-body)', fontSize: '0.9375rem',
                color: 'var(--on-surface)', resize: 'vertical', outline: 'none', lineHeight: 1.6,
                transition: 'border-color 0.2s',
              }}
              onFocus={event => (event.target.style.borderColor = 'var(--primary)')}
              onBlur={event => (event.target.style.borderColor = 'var(--outline-variant)')}
            />
            {error ? <div style={{ marginTop: '0.75rem' }}><StatusBanner type="error" message={error} /></div> : null}
            <Button onClick={handleCheck} loading={loading} style={{ width: '100%', marginTop: '1rem' }} disabled={!text.trim()} icon="psychology">
              {loading ? 'Analysing…' : 'Check symptoms'}
            </Button>
          </Card>

          {loading ? (
            <Card style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem' }}>
                <span className="material-symbols-outlined animate-pulse" style={{ color: 'var(--primary)' }} aria-hidden="true">psychology</span>
              </div>
              <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700 }}>Analysing symptoms…</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>This usually takes a few seconds.</p>
            </Card>
          ) : null}

          {result && severityConfig ? (
            <div className="animate-scale-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ padding: '1rem 1.25rem', background: severityConfig.bg, borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="material-symbols-outlined icon-filled" style={{ color: severityConfig.color }} aria-hidden="true">{severityConfig.icon}</span>
                <div>
                  <p style={{ fontWeight: 700, color: severityConfig.color, fontSize: '0.9375rem', fontFamily: 'var(--font-headline)' }}>Severity: {severityConfig.label}</p>
                  <p style={{ fontSize: '0.8125rem', color: severityConfig.color, opacity: 0.85 }}>{result.summary}</p>
                </div>
              </div>
              <Card style={{ padding: '1.25rem' }}>
                <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>Guidance</p>
                <p style={{ fontSize: '0.9375rem', color: 'var(--on-surface)', lineHeight: 1.65 }}>{result.guidance}</p>
              </Card>
              {result.seekCareIf.length > 0 ? (
                <Card style={{ padding: '1.25rem' }}>
                  <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--error)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>Seek care if</p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {result.seekCareIf.map((condition, index) => (
                      <li key={`${condition}-${index}`} style={{ display: 'flex', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--on-surface)', lineHeight: 1.5 }}>
                        <span style={{ color: 'var(--error)', fontWeight: 700, flexShrink: 0 }}>•</span>{condition}
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
              <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-lg)' }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--outline)', lineHeight: 1.5 }}>{result.disclaimer}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setView('history')} icon="history">View past checks</Button>
            </div>
          ) : null}
        </>
      ) : (
        <SymptomHistory />
      )}
    </div>
  )
}

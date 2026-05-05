import React, { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { Skeleton, Card, EmptyState, Button } from '@/components/ui'

interface SymptomLog {
  id: string
  userId: string
  symptomsText: string
  severity: string | null
  aiResponse: {
    severity: string; summary: string; guidance: string
    disclaimer: string; seekCareIf: string[]; _fallback?: boolean
  } | null
  createdAt: string
}
interface Pagination { page: number; limit: number; total: number; pages: number }

const SEVERITY_CONFIG = {
  low:       { color: '#16a34a', bg: '#dcfce7',                        label: 'Low',       icon: 'check_circle' },
  moderate:  { color: 'var(--tertiary)',  bg: 'var(--tertiary-fixed)', label: 'Moderate',  icon: 'warning'      },
  high:      { color: 'var(--error)',     bg: 'var(--error-container)',label: 'High',      icon: 'error'        },
  emergency: { color: '#7f1d1d',          bg: '#fee2e2',               label: 'Emergency', icon: 'emergency'    },
} as const

export function AdminSymptomsPage() {
  const [logs, setLogs]             = useState<SymptomLog[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [severity, setSeverity]     = useState('ALL')

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      // Admin sees all symptom logs — uses the same endpoint with no userId filter
      // Backend already scopes to authenticated user; for admin we may need a dedicated
      // endpoint. For MVP we display via the existing history endpoint.
      // TODO: Add GET /api/v1/admin/symptoms when backend admin endpoints are extended.
      const r = await api.get<{ entries: SymptomLog[]; pagination: Pagination }>(
        `/api/v1/symptoms/history?page=${p}&limit=25`
      )
      setLogs(r.entries)
      setPagination(r.pagination)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page) }, [load, page])

  const filtered = severity === 'ALL'
    ? logs
    : logs.filter(l => l.severity === severity.toLowerCase())

  const severities = ['ALL', 'LOW', 'MODERATE', 'HIGH', 'EMERGENCY']

  return (
    <div style={{ padding: 'clamp(1.5rem, 4vw, 2.5rem)', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--on-surface)' }}>Symptom Logs</h1>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {pagination ? `${pagination.total} total symptom checks` : 'Loading…'}
        </p>
      </div>

      {/* Severity filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {severities.map(s => (
          <button key={s} onClick={() => setSeverity(s)} style={{
            padding: '0.375rem 0.875rem', borderRadius: 'var(--radius-full)',
            border: `1.5px solid ${severity === s ? 'var(--primary)' : 'var(--outline-variant)'}`,
            background: severity === s ? 'var(--primary-fixed)' : 'transparent',
            color: severity === s ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontFamily: 'var(--font-headline)', fontWeight: 600, fontSize: '0.8125rem',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>{s.charAt(0) + s.slice(1).toLowerCase()}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {[1,2,3,4,5].map(i => <Skeleton key={i} height={72} style={{ borderRadius: 'var(--radius-xl)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: '3rem' }}>
          <EmptyState icon="psychology" title="No symptom logs" description="Symptom checks will appear here as users submit them." />
        </Card>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map(log => {
              const r = log.aiResponse
              const cfg = r?.severity ? SEVERITY_CONFIG[r.severity as keyof typeof SEVERITY_CONFIG] : null
              const isFallback = r?._fallback === true
              const isExpanded = expanded === log.id

              return (
                <div key={log.id} style={{
                  background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
                }}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : log.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem 1.125rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    {/* Severity indicator */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-md)', flexShrink: 0, marginTop: 2,
                      background: cfg ? cfg.bg : 'var(--surface-container)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="material-symbols-outlined icon-filled" style={{ fontSize: 18, color: cfg ? cfg.color : 'var(--outline)' }}>
                        {cfg ? cfg.icon : 'psychology'}
                      </span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontFamily: 'var(--font-headline)', fontWeight: 600, fontSize: '0.875rem',
                        color: 'var(--on-surface)', lineHeight: 1.4, marginBottom: '0.375rem',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {log.symptomsText}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {cfg && !isFallback && (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {cfg.label}
                          </span>
                        )}
                        {isFallback && (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--outline)', background: 'var(--surface-container-high)', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            AI unavailable
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>
                          {new Date(log.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {' · '}
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--outline)', flexShrink: 0, marginTop: 4, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                      expand_more
                    </span>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '0 1.125rem 1rem', borderTop: '1px solid var(--outline-variant)' }}>
                      {r && !isFallback ? (
                        <div style={{ paddingTop: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>AI Summary</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface)', lineHeight: 1.6 }}>{r.summary}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Guidance given</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface)', lineHeight: 1.6 }}>{r.guidance}</p>
                          </div>
                          {r.seekCareIf?.length > 0 && (
                            <div>
                              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--error)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Seek care if</p>
                              {r.seekCareIf.map((s, i) => (
                                <p key={i} style={{ fontSize: '0.8125rem', color: 'var(--on-surface)', lineHeight: 1.5 }}>• {s}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p style={{ paddingTop: '0.875rem', fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                          AI analysis was unavailable at the time of this check.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

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

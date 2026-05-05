import React, { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { Skeleton, Card, EmptyState, Button } from '@/components/ui'

interface DrugScan {
  id: string
  detectedDrug: string | null
  aiResponse: {
    drugName: string; commonUsage: string; sideEffects: string[]
    caution: string; disclaimer: string; confidence: string; _fallback?: boolean
  } | null
  createdAt: string
}
interface Pagination { page: number; limit: number; total: number; pages: number }

const CONFIDENCE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  high:               { color: '#16a34a',          bg: '#dcfce7',                        label: 'High confidence'  },
  moderate:           { color: 'var(--tertiary)',  bg: 'var(--tertiary-fixed)',           label: 'Moderate'         },
  low:                { color: 'var(--error)',      bg: 'var(--error-container)',          label: 'Low confidence'   },
  unable_to_identify: { color: 'var(--outline)',    bg: 'var(--surface-container-high)',  label: 'Unable to identify' },
}

export function AdminDrugsPage() {
  const [scans, setScans]           = useState<DrugScan[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [confidence, setConfidence] = useState('ALL')

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const r = await api.get<{ entries: DrugScan[]; pagination: Pagination }>(
        `/api/v1/drug-detection/history?page=${p}&limit=25`
      )
      setScans(r.entries)
      setPagination(r.pagination)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page) }, [load, page])

  const CONFIDENCE_FILTERS = ['ALL', 'HIGH', 'MODERATE', 'LOW', 'UNABLE_TO_IDENTIFY']

  const filtered = confidence === 'ALL'
    ? scans
    : scans.filter(s => (s.aiResponse?.confidence ?? 'unable_to_identify').toUpperCase() === confidence)

  return (
    <div style={{ padding: 'clamp(1.5rem, 4vw, 2.5rem)', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--on-surface)' }}>Drug Scans</h1>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {pagination ? `${pagination.total} total drug identification requests` : 'Loading…'}
        </p>
      </div>

      {/* Confidence filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {CONFIDENCE_FILTERS.map(c => (
          <button key={c} onClick={() => setConfidence(c)} style={{
            padding: '0.375rem 0.875rem', borderRadius: 'var(--radius-full)',
            border: `1.5px solid ${confidence === c ? 'var(--primary)' : 'var(--outline-variant)'}`,
            background: confidence === c ? 'var(--primary-fixed)' : 'transparent',
            color: confidence === c ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontFamily: 'var(--font-headline)', fontWeight: 600, fontSize: '0.8125rem',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {c === 'ALL' ? 'All' : c === 'UNABLE_TO_IDENTIFY' ? 'Unable to ID' : c.charAt(0) + c.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {[1,2,3,4,5].map(i => <Skeleton key={i} height={72} style={{ borderRadius: 'var(--radius-xl)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: '3rem' }}>
          <EmptyState icon="biotech" title="No drug scans" description="Drug identification requests will appear here as users submit images." />
        </Card>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map(scan => {
              const r = scan.aiResponse
              const isFallback = r?._fallback === true
              const drugName = r?.drugName ?? scan.detectedDrug ?? 'Unknown'
              const cfgKey = r?.confidence ?? 'unable_to_identify'
              const cfg = CONFIDENCE_CONFIG[cfgKey] ?? CONFIDENCE_CONFIG.unable_to_identify
              const isExpanded = expanded === scan.id

              return (
                <div key={scan.id} style={{
                  background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
                }}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : scan.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.125rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    {/* Icon */}
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined icon-sm icon-filled" style={{ color: cfg.color }}>biotech</span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
                        {drugName}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {isFallback ? (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--outline)', background: 'var(--surface-container-high)', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Image unclear
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {cfg.label}
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>
                          {new Date(scan.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {' · '}
                          {new Date(scan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--outline)', flexShrink: 0, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                      expand_more
                    </span>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: '0 1.125rem 1rem', borderTop: '1px solid var(--outline-variant)' }}>
                      {r && !isFallback ? (
                        <div style={{ paddingTop: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Common usage</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface)', lineHeight: 1.6 }}>{r.commonUsage}</p>
                          </div>
                          {r.sideEffects?.length > 0 && (
                            <div>
                              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Side effects reported</p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                                {r.sideEffects.map((s, i) => (
                                  <span key={i} style={{ padding: '0.25rem 0.625rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>{s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {r.caution && (
                            <div style={{ padding: '0.75rem', background: 'var(--error-container)', borderRadius: 'var(--radius-lg)' }}>
                              <p style={{ fontSize: '0.8125rem', color: 'var(--on-error-container)', lineHeight: 1.5 }}>⚠️ {r.caution}</p>
                            </div>
                          )}
                          <p style={{ fontSize: '0.75rem', color: 'var(--outline)', lineHeight: 1.5, borderTop: '1px solid var(--outline-variant)', paddingTop: '0.625rem' }}>
                            {r.disclaimer}
                          </p>
                        </div>
                      ) : (
                        <p style={{ paddingTop: '0.875rem', fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                          {r?.disclaimer ?? 'The image could not be analysed clearly. The user was advised to retry with a clearer photo.'}
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

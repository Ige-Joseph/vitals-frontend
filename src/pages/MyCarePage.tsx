import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, ApiError } from '@/lib/api'
import { Button, Card, EmptyState, Skeleton, StatusBanner } from '@/components/ui'
import { MedicationsPage } from './MedicationsPage'
import { CareTimeline } from '@/components/care/CareTimeline'


/* ── Types ─────────────────────────────────────── */
interface SymptomEntry {
  id: string
  symptomsText: string
  severity: string | null
  aiResponse: {
    severity: string; summary: string; guidance: string
    disclaimer: string; seekCareIf: string[]
    _fallback?: boolean
  } | null
  createdAt: string
}
interface DrugEntry {
  id: string
  detectedDrug: string | null
  aiResponse: {
    drugName: string; commonUsage: string; sideEffects: string[]
    caution: string; disclaimer: string; confidence: string
    _fallback?: boolean
  } | null
  createdAt: string
}
interface Pagination { page: number; limit: number; total: number; pages: number }

/* ── Shared severity badge ──────────────────────── */
const SEVERITY_CONFIG = {
  low:       { color: '#16a34a', bg: '#dcfce7',               label: 'Low',       icon: 'check_circle' },
  moderate:  { color: 'var(--tertiary)', bg: 'var(--tertiary-fixed)', label: 'Moderate',  icon: 'warning'      },
  high:      { color: 'var(--error)',    bg: 'var(--error-container)', label: 'High',      icon: 'error'        },
  emergency: { color: '#7f1d1d', bg: '#fee2e2',               label: 'Emergency', icon: 'emergency'    },
} as const

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG]
  if (!cfg) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.1875rem 0.625rem', borderRadius: 'var(--radius-full)',
      fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em',
      textTransform: 'uppercase', fontFamily: 'var(--font-headline)',
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  )
}

/* ── Symptom history list ───────────────────────── */
function SymptomHistory() {
  const [entries, setEntries] = useState<SymptomEntry[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const r = await api.get<{ entries: SymptomEntry[]; pagination: Pagination }>(
        `/api/v1/symptoms/history?page=${p}&limit=10`
      )
      setEntries(r.entries)
      setPagination(r.pagination)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page) }, [load, page])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {[1, 2, 3].map(i => <Skeleton key={i} height={80} style={{ borderRadius: 'var(--radius-xl)' }} />)}
    </div>
  )

  if (!entries.length) return (
    <EmptyState icon="history" title="No symptom checks yet"
      description="Your past AI symptom checks will appear here." />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {entries.map(entry => {
        const r = entry.aiResponse
        const isExpanded = expanded === entry.id
        const isFallback = r?._fallback === true
        return (
          <div key={entry.id} style={{
            background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)',
            overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
          }}>
            {/* Header row — always visible */}
            <button onClick={() => setExpanded(isExpanded ? null : entry.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                padding: '1rem 1.125rem', background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left',
              }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--primary)' }}>psychology</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--on-surface)', lineHeight: 1.4, marginBottom: '0.375rem' }}>
                  {entry.symptomsText.slice(0, 100)}{entry.symptomsText.length > 100 ? '…' : ''}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {entry.severity && !isFallback && <SeverityBadge severity={entry.severity} />}
                  {isFallback && (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--outline)', background: 'var(--surface-container-high)', padding: '0.1875rem 0.5rem', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Service unavailable
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>
                    {new Date(entry.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                    {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--outline)', flexShrink: 0, marginTop: 4, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                expand_more
              </span>
            </button>

            {/* Expanded detail */}
            {isExpanded && r && !isFallback && (
              <div style={{ padding: '0 1.125rem 1rem', borderTop: '1px solid var(--outline-variant)' }}>
                <div style={{ paddingTop: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Guidance</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--on-surface)', lineHeight: 1.6 }}>{r.guidance}</p>
                  </div>
                  {r.seekCareIf?.length > 0 && (
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--error)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Seek care if</p>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {r.seekCareIf.map((s, i) => (
                          <li key={i} style={{ fontSize: '0.8125rem', color: 'var(--on-surface)', lineHeight: 1.5, display: 'flex', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--error)', fontWeight: 700 }}>•</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p style={{ fontSize: '0.75rem', color: 'var(--outline)', lineHeight: 1.5, borderTop: '1px solid var(--outline-variant)', paddingTop: '0.625rem' }}>
                    {r.disclaimer}
                  </p>
                </div>
              </div>
            )}

            {isExpanded && isFallback && (
              <div style={{ padding: '0 1.125rem 1rem', borderTop: '1px solid var(--outline-variant)' }}>
                <p style={{ paddingTop: '0.875rem', fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                  {r?.guidance ?? 'AI analysis was unavailable at the time of this check. Please try again or consult a qualified healthcare professional.'}
                </p>
              </div>
            )}
          </div>
        )
      })}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
            {page} / {pagination.pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}

/* ── Drug detection history list ────────────────── */
function DrugHistory() {
  const [entries, setEntries] = useState<DrugEntry[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const CONFIDENCE_COLORS: Record<string, { color: string; bg: string }> = {
    high:               { color: '#16a34a', bg: '#dcfce7'               },
    moderate:           { color: 'var(--tertiary)',  bg: 'var(--tertiary-fixed)' },
    low:                { color: 'var(--error)',     bg: 'var(--error-container)' },
    unable_to_identify: { color: 'var(--outline)',   bg: 'var(--surface-container-high)' },
  }

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const r = await api.get<{ entries: DrugEntry[]; pagination: Pagination }>(
        `/api/v1/drug-detection/history?page=${p}&limit=10`
      )
      setEntries(r.entries)
      setPagination(r.pagination)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page) }, [load, page])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {[1, 2, 3].map(i => <Skeleton key={i} height={80} style={{ borderRadius: 'var(--radius-xl)' }} />)}
    </div>
  )

  if (!entries.length) return (
    <EmptyState icon="history" title="No drug scans yet"
      description="Your past AI medication identification results will appear here." />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {entries.map(entry => {
        const r = entry.aiResponse
        const isExpanded = expanded === entry.id
        const isFallback = r?._fallback === true
        const drugName = r?.drugName ?? entry.detectedDrug ?? 'Unknown'
        const cc = CONFIDENCE_COLORS[r?.confidence ?? 'unable_to_identify']
        return (
          <div key={entry.id} style={{
            background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)',
            overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
          }}>
            <button onClick={() => setExpanded(isExpanded ? null : entry.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem 1.125rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--primary)' }}>biotech</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)', marginBottom: '0.25rem' }}>{drugName}</p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {!isFallback && r?.confidence && (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: cc.color, background: cc.bg, padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {r.confidence.replace('_', ' ')}
                    </span>
                  )}
                  {isFallback && (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--outline)', background: 'var(--surface-container-high)', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Image unclear
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>
                    {new Date(entry.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--outline)', flexShrink: 0, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                expand_more
              </span>
            </button>

            {isExpanded && r && !isFallback && (
              <div style={{ padding: '0 1.125rem 1rem', borderTop: '1px solid var(--outline-variant)' }}>
                <div style={{ paddingTop: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Common usage</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--on-surface)', lineHeight: 1.6 }}>{r.commonUsage}</p>
                  </div>
                  {r.sideEffects?.length > 0 && (
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Side effects</p>
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
                  <p style={{ fontSize: '0.75rem', color: 'var(--outline)', lineHeight: 1.5, borderTop: '1px solid var(--outline-variant)', paddingTop: '0.625rem' }}>{r.disclaimer}</p>
                </div>
              </div>
            )}

            {isExpanded && isFallback && (
              <div style={{ padding: '0 1.125rem 1rem', borderTop: '1px solid var(--outline-variant)' }}>
                <p style={{ paddingTop: '0.875rem', fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                  {r?.disclaimer ?? 'The image could not be analysed clearly. Please try again with a clearer photo showing the medication label.'}
                </p>
              </div>
            )}
          </div>
        )
      })}

      {pagination && pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{page} / {pagination.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}

/* ── Symptom Checker ─────────────────────────────── */
function SymptomChecker() {
  const [view, setView] = useState<'check' | 'history'>('check')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    id: string; severity: string; summary: string; guidance: string
    disclaimer: string; seekCareIf: string[]
  } | null>(null)
  const [error, setError] = useState('')

  const handleCheck = async () => {
    if (!text.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await api.post<typeof result>('/api/v1/symptoms/check', { symptomsText: text })
      setResult(r)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Symptom check failed. Please try again.')
    } finally { setLoading(false) }
  }

  const cfg = result ? SEVERITY_CONFIG[result.severity as keyof typeof SEVERITY_CONFIG] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Sub-tab: Check / History */}
      <div style={{ display: 'flex', gap: '0.375rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)', padding: '0.25rem' }}>
        {(['check', 'history'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: view === v ? 'var(--surface-container-lowest)' : 'transparent',
            color: view === v ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontFamily: 'var(--font-headline)', fontWeight: view === v ? 700 : 500,
            fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
            boxShadow: view === v ? 'var(--shadow-sm)' : 'none',
          }}>
            {v === 'check' ? 'New check' : 'History'}
          </button>
        ))}
      </div>

      {view === 'check' && (
        <>
          <Card style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)' }}>
              <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--tertiary)' }}>info</span>
              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>General guidance only — not a diagnosis. Always consult a qualified doctor for medical advice.</p>
            </div>
            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder="Describe your symptoms… e.g. I've had a headache and mild fever for 2 days"
              style={{
                width: '100%', minHeight: 120, padding: '0.875rem 1rem',
                background: 'var(--surface-container-low)', border: '1.5px solid var(--outline-variant)',
                borderRadius: 'var(--radius-lg)', fontFamily: 'var(--font-body)', fontSize: '0.9375rem',
                color: 'var(--on-surface)', resize: 'vertical', outline: 'none', lineHeight: 1.6,
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--outline-variant)')}
            />
            {error && <div style={{ marginTop: '0.75rem' }}><StatusBanner type="error" message={error} /></div>}
            <Button onClick={handleCheck} loading={loading} style={{ width: '100%', marginTop: '1rem' }}
              disabled={!text.trim()} icon="psychology">
              {loading ? 'Analysing…' : 'Check symptoms'}
            </Button>
          </Card>

          {loading && (
            <Card style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem' }}>
                <span className="material-symbols-outlined animate-pulse" style={{ color: 'var(--primary)' }}>psychology</span>
              </div>
              <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700 }}>Analysing symptoms…</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>This usually takes a few seconds.</p>
            </Card>
          )}

          {result && cfg && (
            <div className="animate-scale-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ padding: '1rem 1.25rem', background: cfg.bg, borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="material-symbols-outlined icon-filled" style={{ color: cfg.color }}>{cfg.icon}</span>
                <div>
                  <p style={{ fontWeight: 700, color: cfg.color, fontSize: '0.9375rem', fontFamily: 'var(--font-headline)' }}>Severity: {cfg.label}</p>
                  <p style={{ fontSize: '0.8125rem', color: cfg.color, opacity: 0.85 }}>{result.summary}</p>
                </div>
              </div>
              <Card style={{ padding: '1.25rem' }}>
                <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>Guidance</p>
                <p style={{ fontSize: '0.9375rem', color: 'var(--on-surface)', lineHeight: 1.65 }}>{result.guidance}</p>
              </Card>
              {result.seekCareIf?.length > 0 && (
                <Card style={{ padding: '1.25rem' }}>
                  <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--error)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>Seek care if</p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {result.seekCareIf.map((s, i) => (
                      <li key={i} style={{ display: 'flex', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--on-surface)', lineHeight: 1.5 }}>
                        <span style={{ color: 'var(--error)', fontWeight: 700, flexShrink: 0 }}>•</span>{s}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-lg)' }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--outline)', lineHeight: 1.5 }}>{result.disclaimer}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setView('history')} icon="history">View past checks</Button>
            </div>
          )}
        </>
      )}

      {view === 'history' && <SymptomHistory />}
    </div>
  )
}

/* ── Drug Detection ──────────────────────────────── */
function DrugDetection() {
  const [view, setView] = useState<'scan' | 'history'>('scan')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    drugName: string; commonUsage: string; sideEffects: string[]
    caution: string; disclaimer: string; confidence: string
  } | null>(null)
  const [error, setError] = useState('')

  const CONFIDENCE_COLORS: Record<string, string> = {
    high: '#16a34a', moderate: 'var(--tertiary)', low: 'var(--error)', unable_to_identify: 'var(--outline)'
  }

  const handleFile = (f: File) => {
    setFile(f); setResult(null); setError('')
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  const handleDetect = async () => {
    if (!file) return
    setLoading(true); setError('')
    try {
      const fd = new FormData(); fd.append('image', file)
      const r = await api.upload<typeof result>('/api/v1/drug-detection', fd)
      setResult(r)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Detection failed. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.375rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)', padding: '0.25rem' }}>
        {(['scan', 'history'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: view === v ? 'var(--surface-container-lowest)' : 'transparent',
            color: view === v ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontFamily: 'var(--font-headline)', fontWeight: view === v ? 700 : 500,
            fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
            boxShadow: view === v ? 'var(--shadow-sm)' : 'none',
          }}>
            {v === 'scan' ? 'New scan' : 'History'}
          </button>
        ))}
      </div>

      {view === 'scan' && (
        <>
          <Card style={{ padding: '1.25rem' }}>
            <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>Drug identification</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1.25rem' }}>Upload a clear photo of a medication label or packaging.</p>
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => document.getElementById('drug-file-input')?.click()}
              style={{
                border: `2px dashed ${preview ? 'var(--primary)' : 'var(--outline-variant)'}`,
                borderRadius: 'var(--radius-xl)', padding: '2rem', textAlign: 'center',
                cursor: 'pointer', background: preview ? 'var(--primary-fixed)' : 'var(--surface-container-low)',
                transition: 'all 0.2s',
              }}>
              {preview
                ? <img src={preview} alt="Preview" style={{ maxHeight: 160, maxWidth: '100%', objectFit: 'contain', borderRadius: 'var(--radius-lg)' }} />
                : (
                  <>
                    <span className="material-symbols-outlined icon-xl" style={{ color: 'var(--outline)', marginBottom: '0.5rem' }}>add_photo_alternate</span>
                    <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 600, color: 'var(--on-surface)', fontSize: '0.9375rem' }}>Tap to upload image</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--outline)', marginTop: '0.25rem' }}>JPEG, PNG or WebP · max 5MB</p>
                  </>
                )}
              <input id="drug-file-input" type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>
            {error && <div style={{ marginTop: '0.875rem' }}><StatusBanner type="error" message={error} /></div>}
            {file && (
              <Button onClick={handleDetect} loading={loading} style={{ width: '100%', marginTop: '1rem' }} icon="biotech">
                {loading ? 'Analysing image…' : 'Identify medication'}
              </Button>
            )}
          </Card>

          {loading && (
            <Card style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem' }}>
                <span className="material-symbols-outlined animate-pulse" style={{ color: 'var(--primary)' }}>biotech</span>
              </div>
              <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700 }}>Analysing image…</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>Our AI is reading the medication details.</p>
            </Card>
          )}

          {result && (
            <div className="animate-scale-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <Card style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--on-surface)' }}>{result.drugName}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.2rem' }}>{result.commonUsage}</p>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: CONFIDENCE_COLORS[result.confidence] ?? 'var(--outline)', padding: '0.25rem 0.625rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-full)', flexShrink: 0 }}>
                    {result.confidence.replace('_', ' ')}
                  </span>
                </div>
                {result.sideEffects?.length > 0 && (
                  <div style={{ marginBottom: '0.875rem' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Side effects</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                      {result.sideEffects.map((s, i) => (
                        <span key={i} style={{ padding: '0.25rem 0.625rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ padding: '0.75rem', background: 'var(--error-container)', borderRadius: 'var(--radius-lg)', marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--on-error-container)', lineHeight: 1.5 }}>⚠️ {result.caution}</p>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--outline)', lineHeight: 1.5 }}>{result.disclaimer}</p>
              </Card>
              <Button variant="ghost" size="sm" onClick={() => setView('history')} icon="history">View scan history</Button>
            </div>
          )}
        </>
      )}

      {view === 'history' && <DrugHistory />}
    </div>
  )
}

/* ── My Care Page ────────────────────────────────── */
type CareTab = 'timeline' | 'medications' | 'symptoms' | 'drug'

export function MyCarePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as CareTab) ?? 'timeline'
  const setTab = (t: CareTab) => setSearchParams({ tab: t }, { replace: true })

  const TABS: { id: CareTab; label: string; icon: string }[] = [
    { id: 'timeline',    label: 'Timeline',    icon: 'event_note' },
    { id: 'medications', label: 'Medications', icon: 'pill' },
    { id: 'symptoms',    label: 'Symptom AI',  icon: 'psychology' },
    { id: 'drug',        label: 'Drug scan',   icon: 'biotech' },
  ]

  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: 680, margin: '0 auto' }}>
      <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--on-surface)' }}>My Care</h1>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginTop: '0.2rem' }}>Medications, AI symptom check, and drug identification.</p>
      </div>

      {/* Tab bar */}
      <div className="animate-fade-up delay-100" style={{ display: 'flex', gap: '0.375rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)', padding: '0.3rem', marginBottom: '1.5rem' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
            padding: '0.5625rem 0.375rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: tab === t.id ? 'var(--surface-container-lowest)' : 'transparent',
            color: tab === t.id ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontFamily: 'var(--font-headline)', fontWeight: tab === t.id ? 700 : 500,
            fontSize: '0.8125rem', cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none',
          }}>
            <span className="material-symbols-outlined icon-sm">{t.icon}</span>
            <span className="tab-label-text">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="animate-fade-up delay-200">
          {tab === 'timeline'    && <CareTimeline />}
          {tab === 'medications' && <MedicationsPage embedded />}
          {tab === 'symptoms'    && <SymptomChecker />}
          {tab === 'drug'        && <DrugDetection />}
      </div>

      <style>{`.tab-label-text { display: none; } @media (min-width: 420px) { .tab-label-text { display: inline; } }`}</style>
    </div>
  )
}

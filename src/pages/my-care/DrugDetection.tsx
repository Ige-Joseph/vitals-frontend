import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Card, EmptyState, Skeleton, StatusBanner } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import type { DrugEntry, Pagination } from './my-care.types'

const CONFIDENCE_STYLES: Record<string, { color: string; background: string }> = {
  high: { color: '#16a34a', background: '#dcfce7' },
  moderate: { color: 'var(--tertiary)', background: 'var(--tertiary-fixed)' },
  low: { color: 'var(--error)', background: 'var(--error-container)' },
  unable_to_identify: { color: 'var(--outline)', background: 'var(--surface-container-high)' },
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

type DrugResult = {
  drugName: string
  commonUsage: string
  sideEffects: string[]
  caution: string
  disclaimer: string
  confidence: string
}

function DrugHistory() {
  const [entries, setEntries] = useState<DrugEntry[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async (requestedPage: number) => {
    setLoading(true)
    try {
      const response = await api.get<{ entries: DrugEntry[]; pagination: Pagination }>(
        `/api/v1/drug-detection/history?page=${requestedPage}&limit=10`,
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
    return <EmptyState icon="history" title="No drug scans yet" description="Your past AI medication identification results will appear here." />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {entries.map(entry => {
        const result = entry.aiResponse
        const isExpanded = expanded === entry.id
        const isFallback = result?._fallback === true
        const drugName = result?.drugName ?? entry.detectedDrug ?? 'Unknown'
        const confidenceStyle = CONFIDENCE_STYLES[result?.confidence ?? 'unable_to_identify']

        return (
          <div key={entry.id} style={{
            background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)',
            overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
          }}>
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() => setExpanded(isExpanded ? null : entry.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem 1.125rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined icon-sm" style={{ color: 'var(--primary)' }} aria-hidden="true">biotech</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)', marginBottom: '0.25rem' }}>{drugName}</p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {!isFallback && result?.confidence ? (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: confidenceStyle.color, background: confidenceStyle.background, padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {result.confidence.replace('_', ' ')}
                    </span>
                  ) : null}
                  {isFallback ? (
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--outline)', background: 'var(--surface-container-high)', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Image unclear
                    </span>
                  ) : null}
                  <span style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>
                    {new Date(entry.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined icon-sm" aria-hidden="true" style={{ color: 'var(--outline)', flexShrink: 0, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                expand_more
              </span>
            </button>

            {isExpanded && result && !isFallback ? (
              <div style={{ padding: '0 1.125rem 1rem', borderTop: '1px solid var(--outline-variant)' }}>
                <div style={{ paddingTop: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Common usage</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--on-surface)', lineHeight: 1.6 }}>{result.commonUsage}</p>
                  </div>
                  {result.sideEffects.length > 0 ? (
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Side effects</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                        {result.sideEffects.map((effect, index) => (
                          <span key={`${effect}-${index}`} style={{ padding: '0.25rem 0.625rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>{effect}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {result.caution ? (
                    <div style={{ padding: '0.75rem', background: 'var(--error-container)', borderRadius: 'var(--radius-lg)' }}>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--on-error-container)', lineHeight: 1.5 }}>⚠️ {result.caution}</p>
                    </div>
                  ) : null}
                  <p style={{ fontSize: '0.75rem', color: 'var(--outline)', lineHeight: 1.5, borderTop: '1px solid var(--outline-variant)', paddingTop: '0.625rem' }}>{result.disclaimer}</p>
                </div>
              </div>
            ) : null}

            {isExpanded && isFallback ? (
              <div style={{ padding: '0 1.125rem 1rem', borderTop: '1px solid var(--outline-variant)' }}>
                <p style={{ paddingTop: '0.875rem', fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                  {result?.disclaimer ?? 'The image could not be analysed clearly. Please try again with a clearer photo showing the medication label.'}
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

export function DrugDetection() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [view, setView] = useState<'scan' | 'history'>('scan')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DrugResult | null>(null)
  const [error, setError] = useState('')

  const handleFile = (selectedFile: File) => {
    if (!ALLOWED_IMAGE_TYPES.has(selectedFile.type)) {
      setError('Choose a JPEG, PNG, or WebP image.')
      return
    }
    if (selectedFile.size > MAX_IMAGE_SIZE) {
      setError('The image must be 5MB or smaller.')
      return
    }

    setFile(selectedFile)
    setResult(null)
    setError('')
    const reader = new FileReader()
    reader.onload = event => setPreview(event.target?.result as string)
    reader.readAsDataURL(selectedFile)
  }

  const handleDetect = async () => {
    if (!file) return

    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('image', file)
      const response = await api.upload<DrugResult>('/api/v1/drug-detection', formData)
      setResult(response)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Detection failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div role="tablist" aria-label="Drug identification views" style={{ display: 'flex', gap: '0.375rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)', padding: '0.25rem' }}>
        {(['scan', 'history'] as const).map(option => (
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
            {option === 'scan' ? 'New scan' : 'History'}
          </button>
        ))}
      </div>

      {view === 'scan' ? (
        <>
          <Card style={{ padding: '1.25rem' }}>
            <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>Drug identification</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1.25rem' }}>Upload a clear photo of a medication label or packaging.</p>
            <button
              type="button"
              onDragOver={event => event.preventDefault()}
              onDrop={event => {
                event.preventDefault()
                const droppedFile = event.dataTransfer.files[0]
                if (droppedFile) handleFile(droppedFile)
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'block', width: '100%', border: `2px dashed ${preview ? 'var(--primary)' : 'var(--outline-variant)'}`,
                borderRadius: 'var(--radius-xl)', padding: '2rem', textAlign: 'center',
                cursor: 'pointer', background: preview ? 'var(--primary-fixed)' : 'var(--surface-container-low)',
                transition: 'all 0.2s',
              }}
            >
              {preview ? (
                <img src={preview} alt="Selected medication" style={{ maxHeight: 160, maxWidth: '100%', objectFit: 'contain', borderRadius: 'var(--radius-lg)' }} />
              ) : (
                <>
                  <span className="material-symbols-outlined icon-xl" style={{ color: 'var(--outline)', marginBottom: '0.5rem' }} aria-hidden="true">add_photo_alternate</span>
                  <span style={{ display: 'block', fontFamily: 'var(--font-headline)', fontWeight: 600, color: 'var(--on-surface)', fontSize: '0.9375rem' }}>Tap to upload image</span>
                  <span style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--outline)', marginTop: '0.25rem' }}>JPEG, PNG or WebP · max 5MB</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={event => {
                const selectedFile = event.target.files?.[0]
                if (selectedFile) handleFile(selectedFile)
              }}
            />
            {error ? <div style={{ marginTop: '0.875rem' }}><StatusBanner type="error" message={error} /></div> : null}
            {file ? (
              <Button onClick={handleDetect} loading={loading} style={{ width: '100%', marginTop: '1rem' }} icon="biotech">
                {loading ? 'Analysing image…' : 'Identify medication'}
              </Button>
            ) : null}
          </Card>

          {loading ? (
            <Card style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem' }}>
                <span className="material-symbols-outlined animate-pulse" style={{ color: 'var(--primary)' }} aria-hidden="true">biotech</span>
              </div>
              <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 700 }}>Analysing image…</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>Our AI is reading the medication details.</p>
            </Card>
          ) : null}

          {result ? (
            <div className="animate-scale-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <Card style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--on-surface)' }}>{result.drugName}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.2rem' }}>{result.commonUsage}</p>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: CONFIDENCE_STYLES[result.confidence]?.color ?? 'var(--outline)', padding: '0.25rem 0.625rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-full)', flexShrink: 0 }}>
                    {result.confidence.replace('_', ' ')}
                  </span>
                </div>
                {result.sideEffects.length > 0 ? (
                  <div style={{ marginBottom: '0.875rem' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Side effects</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                      {result.sideEffects.map((effect, index) => (
                        <span key={`${effect}-${index}`} style={{ padding: '0.25rem 0.625rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>{effect}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {result.caution ? (
                  <div style={{ padding: '0.75rem', background: 'var(--error-container)', borderRadius: 'var(--radius-lg)', marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--on-error-container)', lineHeight: 1.5 }}>⚠️ {result.caution}</p>
                  </div>
                ) : null}
                <p style={{ fontSize: '0.75rem', color: 'var(--outline)', lineHeight: 1.5 }}>{result.disclaimer}</p>
              </Card>
              <Button variant="ghost" size="sm" onClick={() => setView('history')} icon="history">View scan history</Button>
            </div>
          ) : null}
        </>
      ) : (
        <DrugHistory />
      )}
    </div>
  )
}

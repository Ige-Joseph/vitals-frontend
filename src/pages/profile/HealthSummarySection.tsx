import { useEffect, useState } from 'react'

import { api, ApiError } from '@/lib/api'
import { Button, StatusBanner } from '@/components/ui'
import { CollapsibleCard, Field, Input } from './ProfileControls'
import { formatDate } from './profile.utils'

/**
 * Take a copy of one Person's record away with you.
 *
 * Lives in the person-scoped profile because that is what it is about — one
 * Person, not one account. The same component serves your own record and a
 * dependent's; `personId` is the only difference, and omitting it means "mine",
 * exactly as every other person-scoped call in the app treats it.
 *
 * ── Why the button is visible to accounts that cannot use it ──────────────
 *
 * Generating a summary is a Premium feature, and a free account sees the
 * button disabled with a line saying so rather than not seeing it at all. A
 * hidden feature is one nobody discovers, and being plain about what is paid
 * for is better than leaving someone to wonder whether the thing they want
 * exists.
 *
 * ── Asking for a summary is not the same as getting one ──────────────────
 *
 * The server accepts the request, renders on a worker, and hands back a file
 * only when asked a second time. So this is three steps rather than one:
 *
 *     POST   /reports/health-summary          -> 202, a row to follow
 *     GET    /reports/health-summary/{id}     -> PENDING | PROCESSING | READY
 *     GET    /reports/health-summary/{id}/download
 *
 * Polling is bounded rather than open-ended. A summary takes a second or two,
 * and a client that polls for ever turns a stuck job into a spinner nobody
 * ever sees end.
 *
 * The document also expires about an hour after it is rendered, which is why
 * it is fetched immediately rather than remembered. A stored PDF is one
 * Person's whole record sitting outside the tables that own it.
 */

/** Default window: the last twelve months, matching the server's own default. */
const DEFAULT_MONTHS = 12

const isoDay = (date: Date) => date.toISOString().slice(0, 10)

const defaultRange = () => {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - DEFAULT_MONTHS)
  return { from: isoDay(start), to: isoDay(end) }
}

export function HealthSummarySection({
  open,
  onToggle,
  personId,
  personName,
}: {
  open: boolean
  onToggle: () => void
  /** Whose record. Omitted means the caller's own Person. */
  personId?: string
  /** Used only in copy, so the reader knows whose summary this is. */
  personName?: string
}) {
  const [range, setRange] = useState(defaultRange)
  const [isPremium, setIsPremium] = useState<boolean | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  /** What the worker is doing, while it is doing it. */
  const [progress, setProgress] = useState('')

  // Entitlement is an account fact, so this asks regardless of whose record is
  // being summarised.
  useEffect(() => {
    let cancelled = false

    api
      .get<{ tier: 'FREE' | 'PREMIUM' }>('/api/v1/billing/plan')
      .then(plan => {
        if (!cancelled) setIsPremium(plan.tier === 'PREMIUM')
      })
      .catch(() => {
        // Unknown rather than assumed. The button stays disabled and says why
        // it could not tell, instead of promising something that will 403.
        if (!cancelled) setIsPremium(null)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const setBound = (key: 'from' | 'to', value: string) =>
    setRange(current => ({ ...current, [key]: value }))

  /**
   * Wait for the worker, without waiting for ever.
   *
   * Roughly forty seconds at 1.5s intervals. Past that the job is not
   * necessarily broken — a busy worker is still a worker — so the copy says it
   * is still being prepared rather than claiming a failure that has not
   * happened.
   */
  const POLL_INTERVAL_MS = 1500
  const POLL_ATTEMPTS = 26

  const download = async () => {
    if (range.to < range.from) {
      setError('The end of the period must be on or after its start.')
      return
    }

    setDownloading(true)
    setError('')
    setSuccess('')
    setProgress('Requesting your summary…')

    try {
      // 1. Ask. This returns immediately with a row to follow, not a file.
      const generation = await api.post<{ id: string; status: string }>(
        '/api/v1/reports/health-summary',
        { from: range.from, to: range.to, ...(personId ? { personId } : {}) },
      )

      setProgress('Preparing your summary…')

      // 2. Follow it.
      let status = generation.status
      for (let attempt = 0; attempt < POLL_ATTEMPTS && status !== 'READY'; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

        const current = await api.get<{ status: string; failureReason: string | null }>(
          `/api/v1/reports/health-summary/${generation.id}`,
        )
        status = current.status

        if (status === 'EXPIRED') {
          throw new ApiError('This summary expired before it was downloaded. Please generate a new one.', 'GONE', 410)
        }

        if (status === 'FAILED') {
          throw new ApiError(
            current.failureReason ?? 'The summary could not be generated.',
            'BAD_REQUEST',
            400,
          )
        }
      }

      if (status !== 'READY') {
        setProgress('')
        setError(
          'Your summary is taking longer than usual. It is still being prepared — try again shortly.',
        )
        return
      }

      // 3. Fetch it. Authenticated like any other request: access is resolved
      // again here, so a membership revoked since step 1 stops the download.
      setProgress('Downloading…')
      const { blob, filename } = await api.download(
        `/api/v1/reports/health-summary/${generation.id}/download`,
      )

      // Hand the file to the browser. The object URL is revoked immediately
      // after the click — it points at a health record, and leaving one alive
      // for the lifetime of the tab is a needless copy sitting in memory.
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename ?? 'vitals-health-summary.pdf'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)

      setProgress('')
      setSuccess('Summary downloaded.')
      setTimeout(() => setSuccess(''), 5000)
    } catch (e) {
      setProgress('')
      setError(
        e instanceof ApiError
          ? // 410 means the document expired between being rendered and being
            // fetched, which is the timer working rather than a fault.
            e.status === 410
            ? 'That summary expired before it could be downloaded. Please try again.'
            : e.message
          : 'Could not produce the summary. Please try again.',
      )
    } finally {
      setDownloading(false)
    }
  }

  const whose = personName ? `${personName}’s` : 'your'
  const blocked = isPremium !== true

  return (
    <CollapsibleCard title="Health summary" open={open} onToggle={onToggle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', lineHeight: 1.55 }}>
          A PDF of what has been recorded in Vitals for {whose} record over a period
          you choose — medications and the doses logged against them, appointments,
          symptoms and mood. Useful to have in front of you at a visit.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
          <Field label="From">
            <Input type="date" value={range.from} onChange={v => setBound('from', v)} />
          </Field>
          <Field label="To">
            <Input type="date" value={range.to} onChange={v => setBound('to', v)} />
          </Field>
        </div>

        {/* The window is stated on screen as well as printed in the document,
            so what you asked for and what you got are the same sentence. */}
        <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>
          Covering {formatDate(range.from) ?? range.from} to{' '}
          {formatDate(range.to) ?? range.to}.
        </p>

        {error ? <StatusBanner type="error" message={error} /> : null}
        {success ? <StatusBanner type="success" message={success} /> : null}

        {/* Rendering happens on a worker, so there is a real wait to narrate.
            Without this the button spins with nothing explaining why. */}
        {progress ? (
          <p
            style={{
              fontSize: '0.78rem',
              color: 'var(--on-surface-variant)',
              textAlign: 'center',
            }}
            aria-live="polite"
          >
            {progress}
          </p>
        ) : null}

        <Button
          variant="primary"
          icon="download"
          onClick={download}
          loading={downloading}
          disabled={blocked || downloading}
          style={{ width: '100%' }}
        >
          {downloading ? 'Preparing…' : 'Generate summary'}
        </Button>

        {isPremium === false && (
          <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', textAlign: 'center' }}>
            Health summaries are part of Premium.
          </p>
        )}

        {isPremium === null && (
          <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', textAlign: 'center' }}>
            We couldn&rsquo;t check your plan just now. Try again shortly.
          </p>
        )}

        <p style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
          The document summarises what was entered in Vitals. It contains no
          diagnosis, assessment or advice.
        </p>
      </div>
    </CollapsibleCard>
  )
}

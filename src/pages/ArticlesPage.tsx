import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, ApiError } from '@/lib/api'
import { Button, EmptyState, Skeleton, StatusBanner } from '@/components/ui'
import { ArticleCard } from './articles/ArticleCard'
import { ArticleReader } from './articles/ArticleReader'
import { CATEGORIES, categoryLabel, type ArticleList } from './articles/articles.types'
import './articles/articles.css'

export function ArticlesPage() {
  const [params, setParams] = useSearchParams()
  const requestedCategory = params.get('category') ?? 'ALL'
  const category = CATEGORIES.includes(requestedCategory) ? requestedCategory : 'ALL'
  const requestedPage = Number(params.get('page') ?? 1)
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const slug = params.get('article')
  const [result, setResult] = useState<ArticleList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setResult(null)
    const query = new URLSearchParams({ page: String(page), limit: '12' })
    if (category !== 'ALL') query.set('category', category)
    api
      .get<ArticleList>(`/api/v1/articles?${query}`)
      .then((data) => {
        if (!cancelled) setResult(data)
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof ApiError
              ? err.message
              : 'We could not load the library. Please try again.'
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [category, page, attempt])

  const browse = (nextCategory: string, nextPage: number) => {
    const next = new URLSearchParams(params)
    next.delete('article')
    if (nextCategory === 'ALL') next.delete('category')
    else next.set('category', nextCategory)
    if (nextPage === 1) next.delete('page')
    else next.set('page', String(nextPage))
    setParams(next)
  }
  const closeReader = () => {
    const next = new URLSearchParams(params)
    next.delete('article')
    setParams(next, { replace: true })
  }

  return (
    <div className="health-library">
      <header className="library-heading">
        <span className="library-eyebrow">READ &amp; UNDERSTAND</span>
        <h1>Health Library</h1>
        <p>Curated articles for your health journey.</p>
      </header>
      <nav className="library-topics" aria-label="Article topics">
        {CATEGORIES.map((topic) => (
          <button
            key={topic}
            type="button"
            aria-pressed={category === topic}
            onClick={() => browse(topic, 1)}
          >
            {categoryLabel(topic)}
          </button>
        ))}
      </nav>
      <section aria-label={`${categoryLabel(category)} articles`} aria-busy={loading}>
        {loading ? (
          <>
            <span className="library-sr-only" role="status">
              Loading articles
            </span>
            <div className="library-grid" aria-hidden="true">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} height={310} style={{ borderRadius: 'var(--radius-xl)' }} />
              ))}
            </div>
          </>
        ) : error ? (
          <div className="library-state" role="alert">
            <StatusBanner type="error" message={error} />
            <Button onClick={() => setAttempt((value) => value + 1)}>Retry library</Button>
          </div>
        ) : result && result.articles.length === 0 ? (
          <EmptyState
            icon="library_books"
            title={
              page > 1
                ? 'No articles on this page'
                : category === 'ALL'
                  ? 'No articles yet'
                  : `No ${categoryLabel(category).toLowerCase()} articles yet`
            }
            description="Try another topic or return to the full library."
            action={
              <Button variant="secondary" onClick={() => browse('ALL', 1)}>
                View all articles
              </Button>
            }
          />
        ) : result ? (
          <>
            <p className="library-results" role="status">
              {result.pagination.total} article{result.pagination.total === 1 ? '' : 's'}
              {category !== 'ALL' ? ` in ${categoryLabel(category)}` : ''}
            </p>
            <div className="library-grid">
              {result.articles.map((article) => {
                const next = new URLSearchParams(params)
                next.set('article', article.slug)
                return <ArticleCard key={article.id} article={article} href={`?${next}`} />
              })}
            </div>
            {result.pagination.pages > 1 && (
              <nav className="library-pagination" aria-label="Article pages">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => browse(category, page - 1)}
                >
                  Previous
                </Button>
                <span aria-live="polite">
                  Page {page} of {result.pagination.pages}
                </span>
                <Button
                  variant="secondary"
                  disabled={page >= result.pagination.pages}
                  onClick={() => browse(category, page + 1)}
                >
                  Next
                </Button>
              </nav>
            )}
          </>
        ) : null}
      </section>
      <p className="library-note">
        For general understanding. Articles do not replace advice from a qualified healthcare
        professional.
      </p>
      {slug && <ArticleReader key={slug} slug={slug} onClose={closeReader} />}
    </div>
  )
}

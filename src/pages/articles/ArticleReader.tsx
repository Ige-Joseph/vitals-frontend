import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api, ApiError } from '@/lib/api'
import { Button, Skeleton, StatusBanner } from '@/components/ui'
import { ArticleImage } from './ArticleCard'
import { ArticleContent } from './ArticleContent'
import { articleDate, categoryLabel, imageSource, type ArticleDetail } from './articles.types'

export function ArticleReader({ slug, onClose }: { slug: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  // Capture before React autofocus moves focus into the portal.
  const returnFocus = useRef(document.activeElement as HTMLElement | null)
  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const element = dialog.current!
    const overflow = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = overflow
      if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setNotFound(false)
    setArticle(null)
    api
      .get<ArticleDetail>(`/api/v1/articles/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (!cancelled) setArticle(data)
      })
      .catch((err) => {
        if (cancelled) return
        setNotFound(err instanceof ApiError && err.status === 404)
        setError(
          err instanceof ApiError
            ? err.message
            : 'We could not open this article. Please try again.'
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug, attempt])

  const date = articleDate(article?.publishedAt ?? null)
  return createPortal(
    <dialog
      ref={dialog}
      className="article-reader"
      aria-labelledby="article-reader-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose()
      }}
    >
      <header className="article-reader-bar">
        <span>{article ? categoryLabel(article.category) : 'Health Library'}</span>
        <button
          type="button"
          className="article-close"
          onClick={onClose}
          aria-label="Close article"
          autoFocus
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div className="article-reader-body">
        {loading ? (
          <>
            <h2 id="article-reader-title" className="library-sr-only">
              Loading article
            </h2>
            <div className="library-state" role="status">
              <span className="library-sr-only">Loading article</span>
              <Skeleton height={36} />
              <Skeleton height={18} width="65%" />
              <Skeleton height={150} />
            </div>
          </>
        ) : error ? (
          <div className="library-state">
            <h2 id="article-reader-title">
              {notFound ? 'Article unavailable' : 'Unable to open article'}
            </h2>
            <div role="alert">
              <StatusBanner
                type="error"
                message={
                  notFound ? 'This article may have been removed or is no longer published.' : error
                }
              />
            </div>
            {!notFound && (
              <Button onClick={() => setAttempt((value) => value + 1)}>Retry article</Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Back to library
            </Button>
          </div>
        ) : article ? (
          <article>
            <h1 id="article-reader-title">{article.title}</h1>
            {date && (
              <time className="article-reader-date" dateTime={article.publishedAt!}>
                Published {date}
              </time>
            )}
            <p className="article-lead">{article.excerpt}</p>
            {imageSource(article.imageUrl) && <ArticleImage article={article} />}
            <ArticleContent content={article.content} />
            <footer className="article-reader-note">
              For general understanding. This article does not replace advice from a qualified
              healthcare professional.
            </footer>
          </article>
        ) : null}
      </div>
    </dialog>,
    document.body
  )
}

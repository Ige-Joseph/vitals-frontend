import { useState } from 'react'
import { Link } from 'react-router-dom'
import { articleDate, categoryLabel, imageSource, type Article } from './articles.types'

// Contextual topic covers are presentation fallbacks, not publisher-supplied images.
const TOPIC_IMAGES: Record<string, { src: string; srcSet?: string; position: string }> = {
  GENERAL: { src: 'family-home', srcSet: '320', position: 'center 44%' },
  PREGNANCY: { src: 'pregnancy-context', srcSet: '320', position: 'center 53%' },
  BABY_CARE: { src: 'baby-newborn', srcSet: '480', position: 'center 42%' },
  MEDICATION: { src: 'medication-context', srcSet: '320', position: 'center 70%' },
  MENTAL_HEALTH: { src: 'mood-wellbeing', position: 'center 43%' },
}

export function ArticleImage({ article }: { article: Article }) {
  const [failedPublished, setFailedPublished] = useState<string | null>(null)
  const [failedTopic, setFailedTopic] = useState<string | null>(null)
  const published = imageSource(article.imageUrl)
  const topic = TOPIC_IMAGES[article.category] ?? TOPIC_IMAGES.GENERAL
  const topicSource = `/images/contextual/${topic.src}.webp`
  const usePublished = Boolean(published && published !== failedPublished)
  const source = usePublished ? published : topicSource !== failedTopic ? topicSource : null
  const topicSrcSet = topic.srcSet
    ? `/images/contextual/${topic.src}-480.webp ${topic.srcSet}w, ${topicSource} ${topic.srcSet === '480' ? '1024' : '683'}w`
    : undefined
  return (
    <div className={`article-image${!source ? ' article-image-empty' : ''}`} aria-hidden="true">
      {source ? (
        <>
          <img
            key={source}
            src={source}
            srcSet={usePublished ? undefined : topicSrcSet}
            sizes="(max-width: 540px) calc(100vw - 2rem), (max-width: 1000px) 45vw, 350px"
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            style={usePublished ? undefined : { objectPosition: topic.position }}
            onError={() => usePublished ? setFailedPublished(source) : setFailedTopic(source)}
          />
          {!usePublished && <span className="article-topic-image-note">Illustrative photo</span>}
        </>
      ) : (
        <div className="article-image-fallback">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M4 4h6a3 3 0 0 1 3 3v13a4 4 0 0 0-4-2H4V4Zm16 0h-4a3 3 0 0 0-3 3v13a4 4 0 0 1 4-2h3V4Z" />
          </svg>
          <span>{categoryLabel(article.category)}</span>
        </div>
      )}
    </div>
  )
}

export function ArticleCard({ article, href }: { article: Article; href: string }) {
  const date = articleDate(article.publishedAt)
  return (
    <Link to={href} preventScrollReset className="article-card">
      <ArticleImage article={article} />
      <div className="article-card-body">
        <span className="article-topic">{categoryLabel(article.category)}</span>
        <h2>{article.title}</h2>
        <p>{article.excerpt}</p>
        <div className="article-card-footer">
          {date ? <time dateTime={article.publishedAt!}>{date}</time> : <span />}
          <span className="article-read">
            Read article <span aria-hidden="true">&rarr;</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

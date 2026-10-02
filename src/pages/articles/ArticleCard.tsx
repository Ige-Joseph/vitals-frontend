import { useState } from 'react'
import { Link } from 'react-router-dom'
import { articleDate, categoryLabel, imageSource, type Article } from './articles.types'

export function ArticleImage({ article }: { article: Article }) {
  const [failed, setFailed] = useState(false)
  const source = imageSource(article.imageUrl)
  return (
    <div
      className={`article-image${!source || failed ? ' article-image-empty' : ''}`}
      aria-hidden="true"
    >
      {source && !failed ? (
        <img
          src={source}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="article-image-fallback">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          >
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

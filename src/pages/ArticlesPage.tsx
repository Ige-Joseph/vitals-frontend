import React, { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, Badge, EmptyState, Skeleton } from '@/components/ui'

interface Article {
  id: string; title: string; slug: string; excerpt: string
  imageUrl: string | null; category: string; publishedAt: string | null
}
interface ArticleDetail extends Article { content: string }

const CATEGORIES = ['ALL', 'PREGNANCY', 'BABY_CARE', 'MEDICATION', 'NUTRITION', 'MENTAL_HEALTH']
const CAT_LABELS: Record<string, string> = {
  ALL:'All', PREGNANCY:'Pregnancy', BABY_CARE:'Baby Care',
  MEDICATION:'Medication', NUTRITION:'Nutrition', MENTAL_HEALTH:'Mental Health'
}
const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  PREGNANCY:    { bg: 'var(--secondary-fixed)', color: 'var(--secondary)' },
  BABY_CARE:    { bg: 'var(--tertiary-fixed)', color: 'var(--tertiary)' },
  MEDICATION:   { bg: 'var(--primary-fixed)', color: 'var(--primary)' },
  NUTRITION:    { bg: '#dcfce7', color: '#16a34a' },
  MENTAL_HEALTH:{ bg: '#ede9fe', color: '#7c3aed' },
  GENERAL:      { bg: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' },
}

function ArticleCard({ article, onClick }: { article: Article; onClick: () => void }) {
  const cc = CAT_COLORS[article.category] ?? CAT_COLORS.GENERAL
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)',
      overflow: 'hidden', boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
      transition: 'all 0.2s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-lg)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)' }}
    >
      {/* Placeholder gradient header */}
      <div style={{ height: 120, background: `linear-gradient(135deg, ${cc.bg} 0%, ${cc.color}22 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-symbols-outlined icon-xl" style={{ color: cc.color, opacity: 0.5 }}>article</span>
      </div>
      <div style={{ padding: '1rem' }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: cc.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{CAT_LABELS[article.category] ?? article.category}</span>
        <h3 style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)', lineHeight: 1.35, marginTop: '0.25rem', marginBottom: '0.5rem' }}>{article.title}</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.excerpt}</p>
        {article.publishedAt && (
          <p style={{ fontSize: '0.75rem', color: 'var(--outline)', marginTop: '0.625rem' }}>
            {new Date(article.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  )
}

function ArticleModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<ArticleDetail>(`/api/v1/articles/${slug}`).then(setArticle).finally(() => setLoading(false))
  }, [slug])

  return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(24,28,32,0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(4px)',
        }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-2xl)',
          width: '100%',
          maxWidth: 640,
          maxHeight: '90dvh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
          animation: 'scaleIn 0.25s ease'
      }}>
        {loading ? (
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Skeleton height={32} width="80%" />
            <Skeleton height={16} width="50%" />
            {[1,2,3].map(i => <Skeleton key={i} height={80} />)}
          </div>
        ) : article ? (
          <div>
            <div style={{ padding: '1.25rem 1.5rem 0', position: 'sticky', top: 0, background: 'var(--surface)', borderBottom: '1px solid var(--outline-variant)', zIndex: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{CAT_LABELS[article.category] ?? article.category}</span>
                <button onClick={onClose} style={{ background: 'var(--surface-container)', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)' }}>
                  <span className="material-symbols-outlined icon-sm">close</span>
                </button>
              </div>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.375rem', color: 'var(--on-surface)', lineHeight: 1.3, marginBottom: '0.625rem' }}>{article.title}</h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', fontStyle: 'italic', marginBottom: '1.5rem' }}>{article.excerpt}</p>
              <div style={{ fontSize: '0.9375rem', color: 'var(--on-surface)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}
                dangerouslySetInnerHTML={{ __html: article.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}
              />
              {article.publishedAt && (
                <p style={{ marginTop: '2rem', fontSize: '0.8125rem', color: 'var(--outline)', borderTop: '1px solid var(--outline-variant)', paddingTop: '1rem' }}>
                  Published {new Date(article.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '2rem' }}><EmptyState icon="article" title="Article not found" /></div>
        )}
      </div>
    </div>
  )
}

export function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('ALL')
  const [openSlug, setOpenSlug] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const q = category === 'ALL' ? '' : `?category=${category}`
    api.get<{ articles: Article[] }>(`/api/v1/articles${q}`)
      .then(r => setArticles(r.articles))
      .finally(() => setLoading(false))
  }, [category])

  return (
    <div style={{ padding: 'clamp(1rem, 4vw, 2rem)', maxWidth: 900, margin: '0 auto' }}>
      <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--on-surface)' }}>Health Library</h1>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginTop: '0.2rem' }}>Curated articles for your health journey.</p>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem' }} className="no-scrollbar animate-fade-up delay-100">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{
            flexShrink: 0, padding: '0.4375rem 0.875rem',
            borderRadius: 'var(--radius-full)', border: '1.5px solid',
            borderColor: category === c ? 'var(--primary)' : 'var(--outline-variant)',
            background: category === c ? 'var(--primary-fixed)' : 'transparent',
            color: category === c ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontFamily: 'var(--font-headline)', fontWeight: 600, fontSize: '0.8125rem',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>{CAT_LABELS[c]}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} height={240} style={{ borderRadius: 'var(--radius-xl)' }} />)}
        </div>
      ) : articles.length === 0 ? (
        <EmptyState icon="library_books" title="No articles yet" description="Content is being added. Check back soon." />
      ) : (
        <div className="animate-fade-up delay-200" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {articles.map(a => (
            <ArticleCard key={a.id} article={a} onClick={() => setOpenSlug(a.slug)} />
          ))}
        </div>
      )}

      {openSlug && <ArticleModal slug={openSlug} onClose={() => setOpenSlug(null)} />}
    </div>
  )
}

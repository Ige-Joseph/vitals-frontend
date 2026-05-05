import React, { useEffect, useState, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { api, ApiError } from '@/lib/api'
import { Button, Badge, Skeleton, StatusBanner, Input, Card } from '@/components/ui'

interface Article {
  id: string; title: string; slug: string; excerpt: string
  content: string; imageUrl: string | null; category: string
  isPublished: boolean; publishedAt: string | null; createdAt: string
}
interface Pagination { page: number; limit: number; total: number; pages: number }

const CATEGORIES = ['GENERAL','PREGNANCY','BABY_CARE','MEDICATION','NUTRITION','MENTAL_HEALTH']
const CAT_LABELS: Record<string,string> = {
  GENERAL:'General',PREGNANCY:'Pregnancy',BABY_CARE:'Baby Care',
  MEDICATION:'Medication',NUTRITION:'Nutrition',MENTAL_HEALTH:'Mental Health'
}

/* ── Article form modal ─────────────────────────── */
function ArticleFormModal({
  article, onClose, onSaved
}: {
  article?: Article; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!article
  const [form, setForm] = useState({
    title:      article?.title      ?? '',
    excerpt:    article?.excerpt    ?? '',
    content:    article?.content    ?? '',
    category:   article?.category   ?? 'GENERAL',
    imageUrl:   article?.imageUrl   ?? '',
    isPublished: article?.isPublished ?? false,
    slug:       article?.slug       ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Auto-generate slug from title
  const updateTitle = (v: string) => {
    setForm(f => ({
      ...f, title: v,
      slug: f.slug || v.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').slice(0,80)
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim() || !form.excerpt.trim() || !form.content.trim()) {
      setError('Title, excerpt, and content are all required.')
      return
    }
    setLoading(true)
    try {
      const payload = {
        title: form.title.trim(), excerpt: form.excerpt.trim(), content: form.content.trim(),
        category: form.category, isPublished: form.isPublished,
        imageUrl: form.imageUrl.trim() || undefined,
        slug: form.slug.trim() || undefined,
      }
      if (isEdit) {
        await api.patch(`/api/v1/articles/${article!.id}`, payload)
      } else {
        await api.post('/api/v1/articles', payload)
      }
      onSaved()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save article')
    } finally { setLoading(false) }
  }

  return ReactDOM.createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(24,28,32,0.6)', display:'flex', alignItems:'flex-end', backdropFilter:'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:'var(--surface-container-lowest)', borderRadius:'var(--radius-2xl) var(--radius-2xl) 0 0',
        width:'100%', maxWidth:680, maxHeight:'92dvh', overflowY:'auto', margin:'0 auto',
        padding:'1.5rem', animation:'fadeUp 0.28s cubic-bezier(0.34,1.2,0.64,1)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ width:36, height:4, borderRadius:99, background:'var(--outline-variant)', margin:'0 auto 1.25rem' }} />

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
          <h2 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:'1.25rem', color:'var(--on-surface)' }}>
            {isEdit ? 'Edit article' : 'New article'}
          </h2>
          <button onClick={onClose} style={{ background:'var(--surface-container)', border:'none', cursor:'pointer', width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--on-surface-variant)' }}>
            <span className="material-symbols-outlined icon-sm">close</span>
          </button>
        </div>

        {error && <div style={{ marginBottom:'1rem' }}><StatusBanner type="error" message={error} /></div>}

        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <Input label="Title" placeholder="Article title" value={form.title} onChange={e => updateTitle(e.target.value)} required />
          <Input label="Slug" placeholder="auto-generated-from-title" value={form.slug}
            onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'') }))} />
          <Input label="Excerpt (summary)" placeholder="A 1–2 sentence summary shown in the article list" value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} required />

          <div style={{ display:'flex', flexDirection:'column', gap:'0.375rem' }}>
            <label style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--on-surface-variant)', fontFamily:'var(--font-headline)' }}>Category</label>
            <select className="input-base" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          </div>

          <Input label="Image URL (optional)" placeholder="https://…" value={form.imageUrl}
            onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />

          <div style={{ display:'flex', flexDirection:'column', gap:'0.375rem' }}>
            <label style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--on-surface-variant)', fontFamily:'var(--font-headline)' }}>
              Content <span style={{ fontWeight:400, color:'var(--outline)' }}>(Markdown supported)</span>
            </label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Write the full article content here. Use **bold** for emphasis."
              rows={12}
              required
              style={{
                width:'100%', padding:'0.875rem 1rem', background:'var(--surface-container-low)',
                border:'1.5px solid var(--outline-variant)', borderRadius:'var(--radius-lg)',
                fontFamily:'var(--font-body)', fontSize:'0.9rem', color:'var(--on-surface)',
                resize:'vertical', outline:'none', lineHeight:1.65, transition:'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor='var(--primary)')}
              onBlur={e => (e.target.style.borderColor='var(--outline-variant)')}
            />
          </div>

          {/* Published toggle */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.875rem 1rem', background:'var(--surface-container-low)', borderRadius:'var(--radius-lg)' }}>
            <div>
              <p style={{ fontFamily:'var(--font-headline)', fontWeight:600, fontSize:'0.9375rem', color:'var(--on-surface)' }}>Publish article</p>
              <p style={{ fontSize:'0.8125rem', color:'var(--on-surface-variant)' }}>Published articles are visible to all users.</p>
            </div>
            <button type="button" onClick={() => setForm(f => ({ ...f, isPublished: !f.isPublished }))} style={{
              width:44, height:24, borderRadius:99, border:'none', cursor:'pointer',
              background: form.isPublished ? 'var(--primary)' : 'var(--outline-variant)',
              position:'relative', transition:'background 0.2s', flexShrink:0,
            }}>
              <div style={{
                width:18, height:18, borderRadius:'50%', background:'white',
                position:'absolute', top:3, left: form.isPublished ? 23 : 3, transition:'left 0.2s',
              }} />
            </button>
          </div>

          <div style={{ display:'flex', gap:'0.75rem', paddingBottom:'env(safe-area-inset-bottom,0)' }}>
            <Button type="button" variant="ghost" onClick={onClose} style={{ flex:1 }}>Cancel</Button>
            <Button type="submit" loading={loading} style={{ flex:2 }}>
              {isEdit ? 'Save changes' : 'Create article'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

/* ── Admin articles page ─────────────────────────── */
export function AdminArticlesPage() {
  const [searchParams] = useSearchParams()
  const [articles, setArticles]     = useState<Article[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [editing, setEditing]       = useState<Article | 'new' | null>(null)
  const [toast, setToast]           = useState<{ type: 'success'|'error'; msg: string } | null>(null)
  const [deleting, setDeleting]     = useState<string | null>(null)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const r = await api.get<{ articles: Article[]; pagination: Pagination }>(
        `/api/v1/articles/admin/list?page=${p}&limit=20`
      )
      setArticles(r.articles)
      setPagination(r.pagination)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page) }, [load, page])

  // Open new form if ?new=1 param present
  useEffect(() => {
    if (searchParams.get('new') === '1') setEditing('new')
  }, [searchParams])

  const showToast = (type: 'success'|'error', msg: string) => {
    setToast({ type, msg }); setTimeout(() => setToast(null), 4000)
  }

  const handleSaved = () => {
    setEditing(null)
    showToast('success', 'Article saved successfully.')
    load(page)
  }

  const handleDelete = async (article: Article) => {
    if (!window.confirm(`Delete "${article.title}"? This cannot be undone.`)) return
    setDeleting(article.id)
    try {
      await api.delete(`/api/v1/articles/${article.id}`)
      setArticles(a => a.filter(x => x.id !== article.id))
      showToast('success', 'Article deleted.')
    } catch (e) {
      showToast('error', e instanceof ApiError ? e.message : 'Delete failed')
    } finally { setDeleting(null) }
  }

  const togglePublish = async (article: Article) => {
    try {
      await api.patch(`/api/v1/articles/${article.id}`, { isPublished: !article.isPublished })
      setArticles(a => a.map(x => x.id === article.id ? { ...x, isPublished: !x.isPublished } : x))
      showToast('success', article.isPublished ? 'Article unpublished.' : 'Article published.')
    } catch (e) {
      showToast('error', e instanceof ApiError ? e.message : 'Update failed')
    }
  }

  return (
    <div style={{ padding:'clamp(1.5rem, 4vw, 2.5rem)', maxWidth:960, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-headline)', fontWeight:800, fontSize:'1.75rem', color:'var(--on-surface)' }}>Articles</h1>
          <p style={{ color:'var(--on-surface-variant)', fontSize:'0.875rem', marginTop:'0.25rem' }}>
            {pagination ? `${pagination.total} articles` : 'Loading…'}
          </p>
        </div>
        <Button icon="add" onClick={() => setEditing('new')}>New article</Button>
      </div>

      {toast && <div style={{ marginBottom:'1.25rem' }}><StatusBanner type={toast.type} message={toast.msg} /></div>}

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
          {[1,2,3,4].map(i => <Skeleton key={i} height={80} style={{ borderRadius:'var(--radius-xl)' }} />)}
        </div>
      ) : articles.length === 0 ? (
        <Card style={{ padding:'3rem' }}>
          <div style={{ textAlign:'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize:48, color:'var(--outline)', marginBottom:'0.75rem' }}>article</span>
            <p style={{ fontFamily:'var(--font-headline)', fontWeight:700, color:'var(--on-surface)', marginBottom:'0.375rem' }}>No articles yet</p>
            <p style={{ color:'var(--on-surface-variant)', fontSize:'0.875rem', marginBottom:'1.25rem' }}>Create your first health article to get started.</p>
            <Button icon="add" onClick={() => setEditing('new')}>Create article</Button>
          </div>
        </Card>
      ) : (
        <>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
            {articles.map(article => (
              <div key={article.id} style={{
                display:'flex', alignItems:'center', gap:'1rem', padding:'1rem 1.25rem',
                background:'var(--surface-container-lowest)', borderRadius:'var(--radius-xl)',
                boxShadow:'var(--shadow-sm)', opacity: article.isPublished ? 1 : 0.75,
              }}>
                {/* Category colour dot */}
                <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background: article.isPublished ? 'var(--primary)' : 'var(--outline-variant)' }} />

                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontFamily:'var(--font-headline)', fontWeight:700, fontSize:'0.9375rem', color:'var(--on-surface)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {article.title}
                  </p>
                  <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', marginTop:'0.25rem', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'0.75rem', color:'var(--outline)' }}>{CAT_LABELS[article.category] ?? article.category}</span>
                    <span style={{ color:'var(--outline-variant)' }}>·</span>
                    <Badge variant={article.isPublished ? 'success' : 'neutral'}>
                      {article.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                    {article.publishedAt && (
                      <span style={{ fontSize:'0.75rem', color:'var(--outline)' }}>
                        {new Date(article.publishedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display:'flex', gap:'0.5rem', flexShrink:0 }}>
                  <Button size="sm" variant="ghost" onClick={() => togglePublish(article)}>
                    {article.isPublished ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(article)} icon="edit">Edit</Button>
                  <button onClick={() => handleDelete(article)} disabled={deleting === article.id}
                    style={{ width:32, height:32, borderRadius:'var(--radius-md)', border:'none', cursor:'pointer', background:'var(--error-container)', color:'var(--on-error-container)', display:'flex', alignItems:'center', justifyContent:'center', transition:'opacity 0.15s', opacity: deleting === article.id ? 0.5 : 1 }}>
                    <span className="material-symbols-outlined icon-sm">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'0.75rem', paddingTop:'1.5rem' }}>
              <Button variant="outline" size="sm" disabled={page<=1} onClick={() => setPage(p=>p-1)}>Previous</Button>
              <span style={{ fontSize:'0.875rem', color:'var(--on-surface-variant)' }}>Page {page} of {pagination.pages}</span>
              <Button variant="outline" size="sm" disabled={page>=pagination.pages} onClick={() => setPage(p=>p+1)}>Next</Button>
            </div>
          )}
        </>
      )}

      {editing && (
        <ArticleFormModal
          article={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

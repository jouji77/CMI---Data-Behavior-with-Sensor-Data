import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { FileEdit, Plus, Pencil, Trash2, X, AlertCircle, CheckCircle, Eye } from 'lucide-react'

interface Article {
  id: number
  title_ja: string
  title_en: string
  content_ja: string
  content_en: string
  category: string
  tags: string
  author: string
  published_at: string
  thumbnail_url: string | null
}

interface FormData {
  title_ja: string
  title_en: string
  content_ja: string
  content_en: string
  category: string
  tags: string
  author: string
  thumbnail_url: string
}

const emptyForm: FormData = {
  title_ja: '', title_en: '', content_ja: '', content_en: '',
  category: '技術情報', tags: '', author: '', thumbnail_url: '',
}

const CATEGORIES = ['技術情報', 'サービス情報', '製品情報', '事例紹介']

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
    </div>
  )
}

function FullModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-800 text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
const textareaCls = `${inputCls} resize-none font-mono text-xs`

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const categoryColor = (cat: string) => {
  if (cat === '技術情報') return 'bg-blue-100 text-blue-700'
  if (cat === 'サービス情報') return 'bg-green-100 text-green-700'
  if (cat === '製品情報') return 'bg-purple-100 text-purple-700'
  return 'bg-orange-100 text-orange-700'
}

export default function AdminArticles() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modal, setModal] = useState<'create' | 'edit' | 'preview' | null>(null)
  const [editTarget, setEditTarget] = useState<Article | null>(null)
  const [previewTarget, setPreviewTarget] = useState<Article | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [previewLang, setPreviewLang] = useState<'ja' | 'en'>('ja')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type })

  const load = useCallback(async () => {
    try {
      const r = await axios.get<Article[]>('/api/admin/articles')
      setArticles(r.data)
    } catch {
      showToast('データの取得に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const paginated = articles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(articles.length / PAGE_SIZE)

  const openCreate = () => { setForm(emptyForm); setErrors({}); setModal('create') }
  const openEdit = (a: Article) => {
    setEditTarget(a)
    setForm({
      title_ja: a.title_ja, title_en: a.title_en,
      content_ja: a.content_ja, content_en: a.content_en,
      category: a.category, tags: a.tags ?? '',
      author: a.author, thumbnail_url: a.thumbnail_url ?? '',
    })
    setErrors({})
    setModal('edit')
  }
  const openPreview = (a: Article) => { setPreviewTarget(a); setPreviewLang('ja'); setModal('preview') }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.title_ja.trim()) e.title_ja = 'タイトル（日本語）は必須です'
    if (!form.content_ja.trim()) e.content_ja = '本文（日本語）は必須です'
    if (!form.author.trim()) e.author = '著者は必須です'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const buildPayload = () => ({
    title_ja: form.title_ja,
    title_en: form.title_en || form.title_ja,
    content_ja: form.content_ja,
    content_en: form.content_en || form.content_ja,
    category: form.category,
    tags: form.tags,
    author: form.author,
    thumbnail_url: form.thumbnail_url || null,
  })

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (modal === 'create') {
        await axios.post('/api/admin/articles', buildPayload())
        showToast('記事を作成しました')
      } else if (editTarget) {
        await axios.put(`/api/admin/articles/${editTarget.id}`, buildPayload())
        showToast('記事を更新しました')
      }
      setModal(null)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? '保存に失敗しました'
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await axios.delete(`/api/admin/articles/${deleteTarget.id}`)
      showToast('記事を削除しました')
      setDeleteTarget(null)
      load()
    } catch {
      showToast('削除に失敗しました', 'error')
    }
  }

  const formContent = (
    <div className="px-6 py-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="カテゴリ">
          <select className={inputCls} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="著者" required>
          <input className={`${inputCls} ${errors.author ? 'border-red-400' : ''}`} value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
          {errors.author && <p className="text-xs text-red-500 mt-1">{errors.author}</p>}
        </Field>
      </div>
      <Field label="タイトル（日本語）" required>
        <input className={`${inputCls} ${errors.title_ja ? 'border-red-400' : ''}`} value={form.title_ja} onChange={e => setForm(f => ({ ...f, title_ja: e.target.value }))} />
        {errors.title_ja && <p className="text-xs text-red-500 mt-1">{errors.title_ja}</p>}
      </Field>
      <Field label="タイトル（英語）">
        <input className={inputCls} value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} />
      </Field>
      <Field label="本文（日本語）" required>
        <textarea
          className={`${textareaCls} ${errors.content_ja ? 'border-red-400' : ''}`}
          rows={8}
          value={form.content_ja}
          onChange={e => setForm(f => ({ ...f, content_ja: e.target.value }))}
          placeholder="Markdownも使用できます"
        />
        {errors.content_ja && <p className="text-xs text-red-500 mt-1">{errors.content_ja}</p>}
      </Field>
      <Field label="本文（英語）">
        <textarea className={textareaCls} rows={8} value={form.content_en} onChange={e => setForm(f => ({ ...f, content_en: e.target.value }))} placeholder="English content (Markdown supported)" />
      </Field>
      <Field label="タグ（カンマ区切り）">
        <input className={inputCls} value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="例: 振動, メンテナンス, 軸受" />
      </Field>
      <Field label="サムネイルURL">
        <input className={inputCls} value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} placeholder="https://..." />
      </Field>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium">
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="p-8">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-gray-800 mb-2">削除の確認</h3>
            <p className="text-sm text-gray-600 mb-5">「{deleteTarget.title_ja}」を削除しますか？</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">削除</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {modal === 'preview' && previewTarget && (
        <FullModal title="記事プレビュー" onClose={() => setModal(null)}>
          <div className="px-6 py-4">
            <div className="flex gap-2 mb-4">
              <button onClick={() => setPreviewLang('ja')} className={`px-3 py-1 rounded text-sm font-medium ${previewLang === 'ja' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>日本語</button>
              <button onClick={() => setPreviewLang('en')} className={`px-3 py-1 rounded text-sm font-medium ${previewLang === 'en' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>English</button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColor(previewTarget.category)}`}>{previewTarget.category}</span>
              <h1 className="text-xl font-bold text-gray-900 mt-2 mb-1">{previewLang === 'ja' ? previewTarget.title_ja : previewTarget.title_en}</h1>
              <p className="text-xs text-gray-400 mb-4">{previewTarget.author} · {new Date(previewTarget.published_at).toLocaleDateString('ja-JP')}</p>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{previewLang === 'ja' ? previewTarget.content_ja : previewTarget.content_en}</div>
              {previewTarget.tags && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {previewTarget.tags.split(',').filter(Boolean).map(t => (
                    <span key={t} className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">{t.trim()}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </FullModal>
      )}

      {/* Create/Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <FullModal title={modal === 'create' ? '新規記事投稿' : '記事を編集'} onClose={() => setModal(null)}>
          {formContent}
        </FullModal>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FileEdit size={22} className="text-red-600" />
            <h1 className="text-xl font-bold text-gray-900">技術情報管理</h1>
          </div>
          <p className="text-sm text-gray-500">技術・サービス記事の一覧・管理</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
          <Plus size={16} /> 新規投稿
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500 font-medium border-b border-gray-100">
                    <th className="px-4 py-3">タイトル</th>
                    <th className="px-4 py-3">カテゴリ</th>
                    <th className="px-4 py-3">著者</th>
                    <th className="px-4 py-3">タグ</th>
                    <th className="px-4 py-3">投稿日</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">データがありません</td></tr>
                  )}
                  {paginated.map((a, i) => (
                    <tr key={a.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{a.title_ja}</div>
                        <div className="text-xs text-gray-400 truncate max-w-xs">{a.title_en}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor(a.category)}`}>{a.category}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.author}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(a.tags ?? '').split(',').filter(Boolean).slice(0, 3).map(t => (
                            <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">{t.trim()}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(a.published_at).toLocaleDateString('ja-JP')}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openPreview(a)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors mr-1" title="プレビュー">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => openEdit(a)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-1">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(a)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                <span>{articles.length} 件中 {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, articles.length)} 件</span>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">前へ</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">次へ</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { Building2, Plus, Pencil, Trash2, Search, X, AlertCircle, CheckCircle } from 'lucide-react'

interface Company {
  id: number
  name: string
  name_en: string | null
  country: string | null
  contact_email: string | null
  phone: string | null
  address: string | null
  industry: string | null
  notes: string | null
  created_at: string
}

type FormData = Omit<Company, 'id' | 'created_at'>

const emptyForm: FormData = {
  name: '', name_en: '', country: '', contact_email: '',
  phone: '', address: '', industry: '', notes: '',
}

// Toast
function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-fade-in ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
    </div>
  )
}

// Modal
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

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

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<Company | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type })

  const load = useCallback(async () => {
    try {
      const r = await axios.get<Company[]>('/api/admin/companies')
      setCompanies(r.data)
    } catch {
      showToast('データの取得に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.name_en ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.country ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.industry ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const openCreate = () => { setForm(emptyForm); setErrors({}); setModal('create') }
  const openEdit = (c: Company) => {
    setEditTarget(c)
    setForm({ name: c.name, name_en: c.name_en ?? '', country: c.country ?? '', contact_email: c.contact_email ?? '', phone: c.phone ?? '', address: c.address ?? '', industry: c.industry ?? '', notes: c.notes ?? '' })
    setErrors({})
    setModal('edit')
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = '会社名は必須です'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (modal === 'create') {
        await axios.post('/api/admin/companies', form)
        showToast('会社を作成しました')
      } else if (editTarget) {
        await axios.put(`/api/admin/companies/${editTarget.id}`, form)
        showToast('会社を更新しました')
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
      await axios.delete(`/api/admin/companies/${deleteTarget.id}`)
      showToast('会社を削除しました')
      setDeleteTarget(null)
      load()
    } catch {
      showToast('削除に失敗しました', 'error')
    }
  }

  const formFields = (
    <div className="px-6 py-5 space-y-4">
      <Field label="会社名（日本語）" required>
        <input className={`${inputCls} ${errors.name ? 'border-red-400' : ''}`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </Field>
      <Field label="会社名（英語）">
        <input className={inputCls} value={form.name_en ?? ''} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="国">
          <input className={inputCls} value={form.country ?? ''} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
        </Field>
        <Field label="業種">
          <input className={inputCls} value={form.industry ?? ''} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} />
        </Field>
      </div>
      <Field label="連絡先メール">
        <input type="email" className={inputCls} value={form.contact_email ?? ''} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
      </Field>
      <Field label="電話番号">
        <input className={inputCls} value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
      </Field>
      <Field label="住所">
        <input className={inputCls} value={form.address ?? ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
      </Field>
      <Field label="メモ">
        <textarea className={`${inputCls} resize-none`} rows={3} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </Field>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium">
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="p-8">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-gray-800 mb-2">削除の確認</h3>
            <p className="text-sm text-gray-600 mb-5">「{deleteTarget.name}」を削除しますか？この操作は取り消せません。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">削除</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <Modal title={modal === 'create' ? '新規企業登録' : '企業情報を編集'} onClose={() => setModal(null)}>
          {formFields}
        </Modal>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Building2 size={22} className="text-red-600" />
            <h1 className="text-xl font-bold text-gray-900">顧客企業管理</h1>
          </div>
          <p className="text-sm text-gray-500">登録顧客企業の一覧・管理</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
          <Plus size={16} /> 新規登録
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
        <div className="px-4 py-3 flex items-center gap-3">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
            placeholder="会社名、国、業種で検索..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          {search && <button onClick={() => setSearch('')}><X size={16} className="text-gray-400" /></button>}
        </div>
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
                    <th className="px-4 py-3">会社名</th>
                    <th className="px-4 py-3">国</th>
                    <th className="px-4 py-3">連絡先メール</th>
                    <th className="px-4 py-3">電話</th>
                    <th className="px-4 py-3">業種</th>
                    <th className="px-4 py-3">登録日</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-400">データがありません</td></tr>
                  )}
                  {paginated.map((c, i) => (
                    <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{c.name}</div>
                        {c.name_en && <div className="text-xs text-gray-400">{c.name_en}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.country ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.contact_email ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.phone ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.industry ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(c.created_at).toLocaleDateString('ja-JP')}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-1">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                <span>{filtered.length} 件中 {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} 件表示</span>
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

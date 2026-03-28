import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { Package, Plus, Pencil, Trash2, X, AlertCircle, CheckCircle, ChevronUp, ChevronDown } from 'lucide-react'

interface SparePart {
  id: number
  part_number: string
  name_ja: string
  name_en: string
  description_ja: string | null
  description_en: string | null
  category: string
  compatible_devices: string
  unit_price_jpy: number
  unit_price_usd: number
  unit: string
  lead_time_weeks: number
  stock_status: string
  is_recommended_for_next_maintenance: boolean
}

interface FormData {
  part_number: string
  name_ja: string
  name_en: string
  description_ja: string
  description_en: string
  category: string
  compatible_devices: string
  unit_price_jpy: string
  unit_price_usd: string
  unit: string
  lead_time_weeks: string
  stock_status: string
  is_recommended_for_next_maintenance: boolean
}

const emptyForm: FormData = {
  part_number: '', name_ja: '', name_en: '', description_ja: '', description_en: '',
  category: '', compatible_devices: '[]', unit_price_jpy: '', unit_price_usd: '',
  unit: '個', lead_time_weeks: '4', stock_status: 'in_stock',
  is_recommended_for_next_maintenance: false,
}

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

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"

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

const stockBadge = (status: string) => {
  if (status === 'in_stock') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">在庫あり</span>
  if (status === 'low_stock') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">残少</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">在庫なし</span>
}

type SortKey = 'part_number' | 'name_ja' | 'category' | 'unit_price_jpy' | 'lead_time_weeks'
type SortDir = 'asc' | 'desc'

export default function AdminSpareParts() {
  const [parts, setParts] = useState<SparePart[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<SparePart | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<SparePart | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sortKey, setSortKey] = useState<SortKey>('part_number')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type })

  const load = useCallback(async () => {
    try {
      const r = await axios.get<SparePart[]>('/api/admin/spare-parts')
      setParts(r.data)
    } catch {
      showToast('データの取得に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const sorted = [...parts].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
    return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
  })

  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  const openCreate = () => { setForm(emptyForm); setErrors({}); setModal('create') }
  const openEdit = (p: SparePart) => {
    setEditTarget(p)
    setForm({
      part_number: p.part_number, name_ja: p.name_ja, name_en: p.name_en,
      description_ja: p.description_ja ?? '', description_en: p.description_en ?? '',
      category: p.category, compatible_devices: p.compatible_devices ?? '[]',
      unit_price_jpy: String(p.unit_price_jpy), unit_price_usd: String(p.unit_price_usd),
      unit: p.unit, lead_time_weeks: String(p.lead_time_weeks),
      stock_status: p.stock_status,
      is_recommended_for_next_maintenance: p.is_recommended_for_next_maintenance,
    })
    setErrors({})
    setModal('edit')
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.part_number.trim()) e.part_number = '部品番号は必須です'
    if (!form.name_ja.trim()) e.name_ja = '部品名（日本語）は必須です'
    if (!form.category.trim()) e.category = 'カテゴリは必須です'
    if (!form.unit_price_jpy) e.unit_price_jpy = '単価（円）は必須です'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const buildPayload = () => ({
    part_number: form.part_number,
    name_ja: form.name_ja,
    name_en: form.name_en || form.name_ja,
    description_ja: form.description_ja || null,
    description_en: form.description_en || null,
    category: form.category,
    compatible_devices: form.compatible_devices || '[]',
    unit_price_jpy: parseFloat(form.unit_price_jpy) || 0,
    unit_price_usd: parseFloat(form.unit_price_usd) || 0,
    unit: form.unit || '個',
    lead_time_weeks: parseInt(form.lead_time_weeks) || 4,
    stock_status: form.stock_status,
    is_recommended_for_next_maintenance: form.is_recommended_for_next_maintenance,
  })

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (modal === 'create') {
        await axios.post('/api/admin/spare-parts', buildPayload())
        showToast('予備品を作成しました')
      } else if (editTarget) {
        await axios.put(`/api/admin/spare-parts/${editTarget.id}`, buildPayload())
        showToast('予備品を更新しました')
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
      await axios.delete(`/api/admin/spare-parts/${deleteTarget.id}`)
      showToast('予備品を削除しました')
      setDeleteTarget(null)
      load()
    } catch {
      showToast('削除に失敗しました', 'error')
    }
  }

  const formContent = (
    <div className="px-6 py-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="部品番号" required>
          <input className={`${inputCls} ${errors.part_number ? 'border-red-400' : ''}`} value={form.part_number} onChange={e => setForm(f => ({ ...f, part_number: e.target.value }))} />
          {errors.part_number && <p className="text-xs text-red-500 mt-1">{errors.part_number}</p>}
        </Field>
        <Field label="カテゴリ" required>
          <input className={`${inputCls} ${errors.category ? 'border-red-400' : ''}`} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
        </Field>
      </div>
      <Field label="部品名（日本語）" required>
        <input className={`${inputCls} ${errors.name_ja ? 'border-red-400' : ''}`} value={form.name_ja} onChange={e => setForm(f => ({ ...f, name_ja: e.target.value }))} />
        {errors.name_ja && <p className="text-xs text-red-500 mt-1">{errors.name_ja}</p>}
      </Field>
      <Field label="部品名（英語）">
        <input className={inputCls} value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} />
      </Field>
      <Field label="説明（日本語）">
        <textarea className={`${inputCls} resize-none`} rows={2} value={form.description_ja} onChange={e => setForm(f => ({ ...f, description_ja: e.target.value }))} />
      </Field>
      <Field label="説明（英語）">
        <textarea className={`${inputCls} resize-none`} rows={2} value={form.description_en} onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="単価（円）" required>
          <input type="number" className={`${inputCls} ${errors.unit_price_jpy ? 'border-red-400' : ''}`} value={form.unit_price_jpy} onChange={e => setForm(f => ({ ...f, unit_price_jpy: e.target.value }))} />
          {errors.unit_price_jpy && <p className="text-xs text-red-500 mt-1">{errors.unit_price_jpy}</p>}
        </Field>
        <Field label="単価（USD）">
          <input type="number" className={inputCls} value={form.unit_price_usd} onChange={e => setForm(f => ({ ...f, unit_price_usd: e.target.value }))} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="単位">
          <input className={inputCls} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
        </Field>
        <Field label="リードタイム(週)">
          <input type="number" className={inputCls} value={form.lead_time_weeks} onChange={e => setForm(f => ({ ...f, lead_time_weeks: e.target.value }))} />
        </Field>
        <Field label="在庫状況">
          <select className={inputCls} value={form.stock_status} onChange={e => setForm(f => ({ ...f, stock_status: e.target.value }))}>
            <option value="in_stock">在庫あり</option>
            <option value="low_stock">残少</option>
            <option value="out_of_stock">在庫なし</option>
          </select>
        </Field>
      </div>
      <Field label="対応機種（カンマ区切りまたはJSON）">
        <input className={inputCls} value={form.compatible_devices} onChange={e => setForm(f => ({ ...f, compatible_devices: e.target.value }))} placeholder='例: ["HV-300C", "HV-500A"]' />
      </Field>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="recommended" checked={form.is_recommended_for_next_maintenance} onChange={e => setForm(f => ({ ...f, is_recommended_for_next_maintenance: e.target.checked }))} className="accent-red-600" />
        <label htmlFor="recommended" className="text-sm text-gray-700">次回メンテナンスに推奨</label>
      </div>
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
            <p className="text-sm text-gray-600 mb-5">「{deleteTarget.name_ja}」を削除しますか？</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">削除</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? '新規予備品登録' : '予備品を編集'} onClose={() => setModal(null)}>
          {formContent}
        </Modal>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Package size={22} className="text-red-600" />
            <h1 className="text-xl font-bold text-gray-900">推奨予備品管理</h1>
          </div>
          <p className="text-sm text-gray-500">推奨予備品の一覧・管理</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
          <Plus size={16} /> 新規登録
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
                    {([
                      ['part_number', '部品番号'],
                      ['name_ja', '部品名'],
                      ['category', 'カテゴリ'],
                      ['unit_price_jpy', '単価(JPY)'],
                      ['lead_time_weeks', 'LT(週)'],
                    ] as [SortKey, string][]).map(([k, label]) => (
                      <th key={k} className="px-4 py-3 cursor-pointer hover:text-gray-700 select-none" onClick={() => toggleSort(k)}>
                        <span className="flex items-center gap-1">{label}<SortIcon k={k} /></span>
                      </th>
                    ))}
                    <th className="px-4 py-3">在庫</th>
                    <th className="px-4 py-3">推奨</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-12 text-gray-400">データがありません</td></tr>
                  )}
                  {paginated.map((p, i) => (
                    <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{p.part_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{p.name_ja}</div>
                        <div className="text-xs text-gray-400">{p.name_en}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.category}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">¥{p.unit_price_jpy.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600">{p.lead_time_weeks}週</td>
                      <td className="px-4 py-3">{stockBadge(p.stock_status)}</td>
                      <td className="px-4 py-3">
                        {p.is_recommended_for_next_maintenance
                          ? <span className="text-green-600 text-xs font-medium">推奨</span>
                          : <span className="text-gray-300 text-xs">-</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-1">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
                <span>{sorted.length} 件中 {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} 件</span>
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

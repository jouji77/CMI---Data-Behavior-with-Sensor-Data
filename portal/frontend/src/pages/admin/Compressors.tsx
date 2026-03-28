import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { Settings, Plus, Pencil, Trash2, X, AlertCircle, CheckCircle } from 'lucide-react'

interface Company { id: number; name: string }

interface Compressor {
  id: number
  company_id: number | null
  company_name: string
  serial_number: string
  model: string
  installation_date: string | null
  location: string | null
  status: string
  design_pressure: number | null
  design_flow: number | null
  rated_power: number | null
  notes: string | null
  created_at: string
}

interface FormData {
  company_id: string
  serial_number: string
  model: string
  installation_date: string
  location: string
  status: string
  design_pressure: string
  design_flow: string
  rated_power: string
  notes: string
}

const emptyForm: FormData = {
  company_id: '', serial_number: '', model: '', installation_date: '',
  location: '', status: 'active', design_pressure: '', design_flow: '',
  rated_power: '', notes: '',
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

const statusBadge = (status: string) => {
  if (status === 'active') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">稼働中</span>
  if (status === 'inactive') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">停止中</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">点検中</span>
}

export default function Compressors() {
  const [compressors, setCompressors] = useState<Compressor[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCompany, setFilterCompany] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<Compressor | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<Compressor | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type })

  const load = useCallback(async () => {
    try {
      const [cr, co] = await Promise.all([
        axios.get<Compressor[]>('/api/admin/compressors'),
        axios.get<Company[]>('/api/admin/companies'),
      ])
      setCompressors(cr.data)
      setCompanies(co.data)
    } catch {
      showToast('データの取得に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = compressors.filter(c => {
    if (filterCompany && String(c.company_id) !== filterCompany) return false
    if (filterStatus && c.status !== filterStatus) return false
    return true
  })

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const openCreate = () => { setForm(emptyForm); setErrors({}); setModal('create') }
  const openEdit = (c: Compressor) => {
    setEditTarget(c)
    setForm({
      company_id: c.company_id ? String(c.company_id) : '',
      serial_number: c.serial_number,
      model: c.model,
      installation_date: c.installation_date ? c.installation_date.split('T')[0] : '',
      location: c.location ?? '',
      status: c.status,
      design_pressure: c.design_pressure != null ? String(c.design_pressure) : '',
      design_flow: c.design_flow != null ? String(c.design_flow) : '',
      rated_power: c.rated_power != null ? String(c.rated_power) : '',
      notes: c.notes ?? '',
    })
    setErrors({})
    setModal('edit')
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.serial_number.trim()) e.serial_number = 'シリアル番号は必須です'
    if (!form.model.trim()) e.model = '型式は必須です'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const buildPayload = () => ({
    company_id: form.company_id ? parseInt(form.company_id) : null,
    serial_number: form.serial_number,
    model: form.model,
    installation_date: form.installation_date || null,
    location: form.location || null,
    status: form.status,
    design_pressure: form.design_pressure ? parseFloat(form.design_pressure) : null,
    design_flow: form.design_flow ? parseFloat(form.design_flow) : null,
    rated_power: form.rated_power ? parseFloat(form.rated_power) : null,
    notes: form.notes || null,
  })

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (modal === 'create') {
        await axios.post('/api/admin/compressors', buildPayload())
        showToast('圧縮機を登録しました')
      } else if (editTarget) {
        await axios.put(`/api/admin/compressors/${editTarget.id}`, buildPayload())
        showToast('圧縮機を更新しました')
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
      await axios.delete(`/api/admin/compressors/${deleteTarget.id}`)
      showToast('圧縮機を削除しました')
      setDeleteTarget(null)
      load()
    } catch {
      showToast('削除に失敗しました', 'error')
    }
  }

  const formContent = (
    <div className="px-6 py-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="シリアル番号" required>
          <input className={`${inputCls} ${errors.serial_number ? 'border-red-400' : ''}`} value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} />
          {errors.serial_number && <p className="text-xs text-red-500 mt-1">{errors.serial_number}</p>}
        </Field>
        <Field label="型式" required>
          <input className={`${inputCls} ${errors.model ? 'border-red-400' : ''}`} value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
          {errors.model && <p className="text-xs text-red-500 mt-1">{errors.model}</p>}
        </Field>
      </div>
      <Field label="顧客企業">
        <select className={inputCls} value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}>
          <option value="">-- 未設定 --</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="設置場所">
          <input className={inputCls} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
        </Field>
        <Field label="設置日">
          <input type="date" className={inputCls} value={form.installation_date} onChange={e => setForm(f => ({ ...f, installation_date: e.target.value }))} />
        </Field>
      </div>
      <Field label="ステータス">
        <select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          <option value="active">稼働中</option>
          <option value="inactive">停止中</option>
          <option value="maintenance">点検中</option>
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="設計圧力 (MPa)">
          <input type="number" step="0.1" className={inputCls} value={form.design_pressure} onChange={e => setForm(f => ({ ...f, design_pressure: e.target.value }))} />
        </Field>
        <Field label="設計流量 (m³/h)">
          <input type="number" step="100" className={inputCls} value={form.design_flow} onChange={e => setForm(f => ({ ...f, design_flow: e.target.value }))} />
        </Field>
        <Field label="定格出力 (kW)">
          <input type="number" step="10" className={inputCls} value={form.rated_power} onChange={e => setForm(f => ({ ...f, rated_power: e.target.value }))} />
        </Field>
      </div>
      <Field label="メモ">
        <textarea className={`${inputCls} resize-none`} rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
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
            <p className="text-sm text-gray-600 mb-5">シリアル番号「{deleteTarget.serial_number}」を削除しますか？</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">削除</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? '新規圧縮機登録' : '圧縮機情報を編集'} onClose={() => setModal(null)}>
          {formContent}
        </Modal>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Settings size={22} className="text-red-600" />
            <h1 className="text-xl font-bold text-gray-900">登録圧縮機管理</h1>
          </div>
          <p className="text-sm text-gray-500">登録済み圧縮機の一覧・管理</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
          <Plus size={16} /> 新規登録
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 px-4 py-3 flex flex-wrap gap-3">
        <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500" value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setPage(1) }}>
          <option value="">すべての企業</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
          <option value="">すべてのステータス</option>
          <option value="active">稼働中</option>
          <option value="inactive">停止中</option>
          <option value="maintenance">点検中</option>
        </select>
        {(filterCompany || filterStatus) && (
          <button onClick={() => { setFilterCompany(''); setFilterStatus('') }} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <X size={14} /> フィルタ解除
          </button>
        )}
        <span className="ml-auto text-sm text-gray-400">{filtered.length} 件</span>
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
                    <th className="px-4 py-3">シリアル番号</th>
                    <th className="px-4 py-3">型式</th>
                    <th className="px-4 py-3">顧客企業</th>
                    <th className="px-4 py-3">設置場所</th>
                    <th className="px-4 py-3">ステータス</th>
                    <th className="px-4 py-3">設置日</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-400">データがありません</td></tr>
                  )}
                  {paginated.map((c, i) => (
                    <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                      <td className="px-4 py-3 font-mono font-medium text-gray-800">{c.serial_number}</td>
                      <td className="px-4 py-3 text-gray-700">{c.model}</td>
                      <td className="px-4 py-3 text-gray-600">{c.company_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.location || '-'}</td>
                      <td className="px-4 py-3">{statusBadge(c.status)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {c.installation_date ? new Date(c.installation_date).toLocaleDateString('ja-JP') : '-'}
                      </td>
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

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                <span>{filtered.length} 件中 {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} 件</span>
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

import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { Users, Plus, Pencil, Trash2, X, AlertCircle, CheckCircle, KeyRound } from 'lucide-react'

interface UserRecord {
  id: number
  email: string
  name: string
  company: string
  role: string
  language: string
  is_verified: boolean
  created_at: string
}

interface FormData {
  email: string
  name: string
  company: string
  role: string
  language: string
  password: string
}

const emptyForm: FormData = { email: '', name: '', company: '', role: 'customer', language: 'ja', password: '' }

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
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

const roleBadge = (role: string) => {
  if (role === 'admin') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Admin</span>
  if (role === 'vendor') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Vendor</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Customer</span>
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<UserRecord | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [resetResult, setResetResult] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const currentUserJson = localStorage.getItem('user')
  const currentUser = currentUserJson ? JSON.parse(currentUserJson) : null

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type })

  const load = useCallback(async () => {
    try {
      const r = await axios.get<UserRecord[]>('/api/admin/users')
      setUsers(r.data)
    } catch {
      showToast('データの取得に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const paginated = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(users.length / PAGE_SIZE)

  const openCreate = () => { setForm(emptyForm); setErrors({}); setModal('create') }
  const openEdit = (u: UserRecord) => {
    setEditTarget(u)
    setForm({ email: u.email, name: u.name, company: u.company, role: u.role, language: u.language, password: '' })
    setErrors({})
    setModal('edit')
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = '名前は必須です'
    if (!form.email.trim()) e.email = 'メールは必須です'
    if (!form.company.trim()) e.company = '会社名は必須です'
    if (modal === 'create' && !form.password.trim()) e.password = 'パスワードは必須です'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (modal === 'create') {
        await axios.post('/api/admin/users', {
          email: form.email, name: form.name, company: form.company,
          role: form.role, language: form.language, password: form.password,
        })
        showToast('ユーザーを作成しました')
      } else if (editTarget) {
        await axios.put(`/api/admin/users/${editTarget.id}`, {
          name: form.name, company: form.company, role: form.role, language: form.language,
        })
        showToast('ユーザーを更新しました')
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
      await axios.delete(`/api/admin/users/${deleteTarget.id}`)
      showToast('ユーザーを削除しました')
      setDeleteTarget(null)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? '削除に失敗しました'
      showToast(msg, 'error')
    }
  }

  const handleResetPassword = async (u: UserRecord) => {
    try {
      const r = await axios.put(`/api/admin/users/${u.id}/reset-password`)
      setResetResult(r.data.temporary_password)
    } catch {
      showToast('パスワードリセットに失敗しました', 'error')
    }
  }

  const formContent = (
    <div className="px-6 py-5 space-y-4">
      <Field label="名前" required>
        <input className={`${inputCls} ${errors.name ? 'border-red-400' : ''}`} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </Field>
      <Field label="メールアドレス" required>
        <input type="email" className={`${inputCls} ${errors.email ? 'border-red-400' : ''}`} value={form.email} disabled={modal === 'edit'} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
      </Field>
      <Field label="会社名" required>
        <input className={`${inputCls} ${errors.company ? 'border-red-400' : ''}`} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
        {errors.company && <p className="text-xs text-red-500 mt-1">{errors.company}</p>}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="役割">
          <select className={inputCls} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <Field label="言語">
          <select className={inputCls} value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </select>
        </Field>
      </div>
      {modal === 'create' && (
        <Field label="初期パスワード" required>
          <input type="password" className={`${inputCls} ${errors.password ? 'border-red-400' : ''}`} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
        </Field>
      )}
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

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-gray-800 mb-2">削除の確認</h3>
            <p className="text-sm text-gray-600 mb-5">「{deleteTarget.name}」を削除しますか？</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">削除</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password result */}
      {resetResult && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><KeyRound size={18} className="text-green-600" />パスワードリセット完了</h3>
            <p className="text-sm text-gray-600 mb-2">一時パスワードが発行されました。ユーザーに安全な方法で通知してください。</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-mono text-lg font-bold text-gray-800 text-center tracking-widest mb-4">{resetResult}</div>
            <button onClick={() => setResetResult(null)} className="w-full px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium">閉じる</button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <Modal title={modal === 'create' ? '新規ユーザー作成' : 'ユーザー情報を編集'} onClose={() => setModal(null)}>
          {formContent}
        </Modal>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users size={22} className="text-red-600" />
            <h1 className="text-xl font-bold text-gray-900">ユーザー管理</h1>
          </div>
          <p className="text-sm text-gray-500">登録ユーザーの一覧・管理</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
          <Plus size={16} /> 新規作成
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
                    <th className="px-4 py-3">名前</th>
                    <th className="px-4 py-3">メール</th>
                    <th className="px-4 py-3">会社</th>
                    <th className="px-4 py-3">役割</th>
                    <th className="px-4 py-3">言語</th>
                    <th className="px-4 py-3">認証状態</th>
                    <th className="px-4 py-3">登録日</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-12 text-gray-400">データがありません</td></tr>
                  )}
                  {paginated.map((u, i) => (
                    <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{u.email}</td>
                      <td className="px-4 py-3 text-gray-600">{u.company}</td>
                      <td className="px-4 py-3">{roleBadge(u.role)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.language === 'ja' ? '日本語' : 'English'}</td>
                      <td className="px-4 py-3">
                        {u.is_verified
                          ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle size={12} /> 認証済み</span>
                          : <span className="flex items-center gap-1 text-gray-400 text-xs"><AlertCircle size={12} /> 未認証</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.created_at).toLocaleDateString('ja-JP')}</td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                        <button onClick={() => handleResetPassword(u)} title="パスワードリセット" className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                          <KeyRound size={14} />
                        </button>
                        <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          disabled={u.id === currentUser?.id}
                          title={u.id === currentUser?.id ? '自分のアカウントは削除できません' : '削除'}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
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
                <span>{users.length} 件中 {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, users.length)} 件</span>
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

import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { FileText, Upload, Download, Trash2, Search, Filter, AlertCircle, CheckCircle, FolderOpen } from 'lucide-react'
import clsx from 'clsx'

interface Document {
  id: number
  filename: string
  original_name: string
  file_type: string
  file_size: number
  uploaded_by: string
  uploaded_at: string
  description: string
  category: string
  is_indexed: boolean
}

const CATEGORIES = ['顧客提出図書', 'サービス報告書', '仕様書', '取扱説明書', 'その他']

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileTypeBadge(type: string) {
  const cfg: Record<string, { cls: string }> = {
    pdf: { cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
    docx: { cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
    doc: { cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
    xlsx: { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    xls: { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    txt: { cls: 'bg-gray-50 text-gray-600 border border-gray-200' },
    png: { cls: 'bg-violet-50 text-violet-700 border border-violet-200' },
    jpg: { cls: 'bg-violet-50 text-violet-700 border border-violet-200' },
    jpeg: { cls: 'bg-violet-50 text-violet-700 border border-violet-200' },
  }
  return cfg[type.toLowerCase()]?.cls || 'bg-gray-50 text-gray-600 border border-gray-200'
}

type Notification = { type: 'success' | 'error'; message: string }

export default function DocumentLibrary() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [notification, setNotification] = useState<Notification | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    uploaded_by: '',
    description: '',
    category: 'その他',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const fetchDocuments = async () => {
    try {
      const params: Record<string, string> = {}
      if (categoryFilter) params.category = categoryFilter
      if (search) params.search = search
      const res = await axios.get('/api/documents', { params })
      setDocuments(res.data.documents || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [categoryFilter, search])

  const handleFileUpload = async (file: File) => {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('uploaded_by', uploadForm.uploaded_by || '不明')
      formData.append('description', uploadForm.description)
      formData.append('category', uploadForm.category)

      await axios.post('/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      showNotification('success', `「${file.name}」をアップロードしました`)
      fetchDocuments()
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? e.response?.data?.detail || 'アップロードに失敗しました' : 'アップロードに失敗しました'
      showNotification('error', msg)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDownload = async (doc: Document) => {
    try {
      const res = await axios.get(`/api/documents/${doc.id}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', doc.original_name)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      showNotification('error', 'ダウンロードに失敗しました')
    }
  }

  const handleDelete = async (doc: Document) => {
    if (!window.confirm(`「${doc.original_name}」を削除しますか？`)) return
    try {
      await axios.delete(`/api/documents/${doc.id}`)
      showNotification('success', `「${doc.original_name}」を削除しました`)
      fetchDocuments()
    } catch {
      showNotification('error', '削除に失敗しました')
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  return (
    <div className="p-8 animate-fade-in">
      {/* Notification */}
      {notification && (
        <div className={clsx(
          'fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in',
          notification.type === 'success'
            ? 'bg-white text-emerald-700 border border-emerald-200 shadow-emerald-100'
            : 'bg-white text-rose-700 border border-rose-200 shadow-rose-100'
        )}>
          {notification.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ドキュメントライブラリー</h1>
        <p className="text-gray-400 mt-1 text-sm">顧客提出図書・サービス報告書の管理</p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">ファイルアップロード</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <input
            type="text"
            placeholder="アップロード者名"
            value={uploadForm.uploaded_by}
            onChange={e => setUploadForm(f => ({ ...f, uploaded_by: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
          />
          <select
            value={uploadForm.category}
            onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="text"
            placeholder="説明（任意）"
            value={uploadForm.description}
            onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
          />
        </div>

        <div
          className={clsx(
            'border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-150 cursor-pointer',
            dragOver
              ? 'border-rose-400 bg-rose-50'
              : 'border-gray-200 hover:border-rose-300 hover:bg-gray-50/50'
          )}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.png,.jpg,.jpeg"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-rose-600">アップロード中...</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Upload size={22} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600">クリックまたはドラッグ&amp;ドロップ</p>
              <p className="text-xs text-gray-400 mt-1.5">PDF, DOCX, XLSX, TXT, PNG, JPG 対応</p>
            </>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ファイル名で検索..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
          />
        </div>
        <div className="relative">
          <Filter size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors appearance-none"
          >
            <option value="">すべてのカテゴリ</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">ドキュメントがありません</p>
            <p className="text-xs mt-1">上のエリアからファイルをアップロードしてください</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/80">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">ファイル名</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">カテゴリ</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">サイズ</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden lg:table-cell">アップロード者</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">日付</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {documents.map((doc, idx) => (
                  <tr
                    key={doc.id}
                    className={clsx(
                      'hover:bg-gray-50/80 transition-colors',
                      idx % 2 === 1 && 'bg-gray-50/30'
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className={clsx('text-xs px-2 py-0.5 rounded-md font-mono font-semibold flex-shrink-0', fileTypeBadge(doc.file_type))}>
                          {doc.file_type.toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-800 max-w-xs truncate text-sm">{doc.original_name}</div>
                          {doc.description && <div className="text-xs text-gray-400 truncate">{doc.description}</div>}
                        </div>
                        {doc.is_indexed && (
                          <span className="text-xs bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5 rounded-md flex-shrink-0">AI済</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs bg-slate-50 text-slate-600 border border-slate-100 px-2 py-1 rounded-lg">{doc.category}</span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs hidden md:table-cell">{formatFileSize(doc.file_size)}</td>
                    <td className="px-4 py-3.5 text-gray-400 text-sm hidden lg:table-cell">{doc.uploaded_by}</td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs hidden sm:table-cell">{new Date(doc.uploaded_at).toLocaleDateString('ja-JP')}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownload(doc)}
                          title="ダウンロード"
                          className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-150"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          title="削除"
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-150"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400 bg-gray-50/30">
          {documents.length} 件のファイル
        </div>
      </div>
    </div>
  )
}

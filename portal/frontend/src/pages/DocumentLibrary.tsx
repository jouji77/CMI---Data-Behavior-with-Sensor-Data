import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { FileText, Upload, Download, Trash2, Search, Filter, AlertCircle, CheckCircle } from 'lucide-react'
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

function fileTypeColor(type: string) {
  const colors: Record<string, string> = {
    pdf: 'bg-red-100 text-red-700',
    docx: 'bg-blue-100 text-blue-700',
    doc: 'bg-blue-100 text-blue-700',
    xlsx: 'bg-green-100 text-green-700',
    xls: 'bg-green-100 text-green-700',
    txt: 'bg-gray-100 text-gray-700',
    png: 'bg-purple-100 text-purple-700',
    jpg: 'bg-purple-100 text-purple-700',
    jpeg: 'bg-purple-100 text-purple-700',
  }
  return colors[type.toLowerCase()] || 'bg-gray-100 text-gray-700'
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
    <div className="p-8">
      {/* Notification */}
      {notification && (
        <div className={clsx(
          'fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium',
          notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        )}>
          {notification.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {notification.message}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">ドキュメントライブラリー</h1>
        <p className="text-slate-500 mt-1">顧客提出図書・サービス報告書の管理</p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">ファイルアップロード</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            placeholder="アップロード者名"
            value={uploadForm.uploaded_by}
            onChange={e => setUploadForm(f => ({ ...f, uploaded_by: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={uploadForm.category}
            onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="text"
            placeholder="説明（任意）"
            value={uploadForm.description}
            onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div
          className={clsx(
            'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
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
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-blue-600">アップロード中...</p>
            </div>
          ) : (
            <>
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium text-slate-600">クリックまたはドラッグ&ドロップ</p>
              <p className="text-xs text-slate-400 mt-1">PDF, DOCX, XLSX, TXT, PNG, JPG 対応</p>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ファイル名で検索..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="">すべてのカテゴリ</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileText size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">ドキュメントがありません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ファイル名</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">カテゴリ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">サイズ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">アップロード者</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">日付</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={clsx('text-xs px-1.5 py-0.5 rounded font-mono font-medium', fileTypeColor(doc.file_type))}>
                          {doc.file_type.toUpperCase()}
                        </span>
                        <div>
                          <div className="font-medium text-slate-700 max-w-xs truncate">{doc.original_name}</div>
                          {doc.description && <div className="text-xs text-slate-400 truncate">{doc.description}</div>}
                        </div>
                        {doc.is_indexed && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">AI済</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{doc.category}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatFileSize(doc.file_size)}</td>
                    <td className="px-4 py-3 text-slate-500">{doc.uploaded_by}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(doc.uploaded_at).toLocaleDateString('ja-JP')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="ダウンロード"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                          title="削除"
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
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-slate-400">
          {documents.length} 件
        </div>
      </div>
    </div>
  )
}

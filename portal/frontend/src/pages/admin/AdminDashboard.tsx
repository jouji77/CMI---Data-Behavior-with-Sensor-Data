import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  Building2, Settings, Users, Package, FileEdit, FileText,
  Wrench, CheckCircle, AlertCircle, LayoutDashboard
} from 'lucide-react'

interface Stats {
  counts: {
    users: number
    companies: number
    compressors: number
    spare_parts: number
    articles: number
    documents: number
    maintenance_records: number
  }
  recent_users: {
    id: number
    name: string
    email: string
    company: string
    role: string
    created_at: string
  }[]
}

const statCards = [
  {
    key: 'companies' as const,
    label: '顧客企業数',
    icon: Building2,
    color: 'bg-blue-100 text-blue-600',
    link: '/admin/companies',
  },
  {
    key: 'compressors' as const,
    label: '登録圧縮機数',
    icon: Settings,
    color: 'bg-purple-100 text-purple-600',
    link: '/admin/compressors',
  },
  {
    key: 'users' as const,
    label: 'ユーザー数',
    icon: Users,
    color: 'bg-green-100 text-green-600',
    link: '/admin/users',
  },
  {
    key: 'spare_parts' as const,
    label: '予備品点数',
    icon: Package,
    color: 'bg-yellow-100 text-yellow-600',
    link: '/admin/spare-parts',
  },
  {
    key: 'articles' as const,
    label: '技術記事数',
    icon: FileEdit,
    color: 'bg-red-100 text-red-600',
    link: '/admin/articles',
  },
  {
    key: 'documents' as const,
    label: 'ドキュメント数',
    icon: FileText,
    color: 'bg-gray-100 text-gray-600',
    link: '/documents',
  },
]

const roleBadge = (role: string) => {
  if (role === 'admin') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Admin</span>
  if (role === 'vendor') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Vendor</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Customer</span>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    axios.get('/api/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => setError('統計データの取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <LayoutDashboard size={24} className="text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">管理ダッシュボード</h1>
        </div>
        <p className="text-gray-500 text-sm">システム全体の概況を確認できます</p>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {statCards.map(({ key, label, icon: Icon, color, link }) => (
            <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon size={20} />
                </div>
                <span className="text-3xl font-bold text-gray-900">{stats.counts[key]}</span>
              </div>
              <p className="text-sm text-gray-600 font-medium mb-2">{label}</p>
              <Link to={link} className="text-xs text-red-600 hover:text-red-700 font-medium">
                管理する →
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent users */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Users size={17} className="text-gray-500" />
              最近登録したユーザー
            </h2>
            <Link to="/admin/users" className="text-xs text-red-600 hover:text-red-700">すべて見る →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats?.recent_users.length === 0 && (
              <p className="text-sm text-gray-400 px-5 py-4">ユーザーがいません</p>
            )}
            {stats?.recent_users.map(u => (
              <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users size={14} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email} · {u.company}</p>
                </div>
                {roleBadge(u.role)}
              </div>
            ))}
          </div>
        </div>

        {/* System info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Settings size={17} className="text-gray-500" />
              システム情報
            </h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">ポータルバージョン</span>
              <span className="font-medium text-gray-800">v2.0.0</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">データベース</span>
              <span className="flex items-center gap-1 text-green-600 font-medium">
                <CheckCircle size={13} /> SQLite / 正常
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">APIサーバー</span>
              <span className="flex items-center gap-1 text-green-600 font-medium">
                <CheckCircle size={13} /> FastAPI / 稼働中
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">メンテナンス記録</span>
              <span className="font-medium text-gray-800">{stats?.counts.maintenance_records ?? '-'} 件</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">ドキュメント</span>
              <span className="font-medium text-gray-800">{stats?.counts.documents ?? '-'} 件</span>
            </div>
          </div>

          {/* Quick links */}
          <div className="px-5 py-4 border-t border-gray-50">
            <p className="text-xs text-gray-400 mb-3">クイックリンク</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'API ドキュメント', href: 'http://localhost:8000/docs' },
                { label: 'ユーザーポータル', href: '/' },
              ].map(l => (
                <a
                  key={l.label}
                  href={l.href}
                  target={l.href.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  className="text-xs text-center py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance info */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Wrench size={20} className="text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">メンテナンス記録</h3>
            <p className="text-sm text-gray-500">
              合計 <strong className="text-gray-800">{stats?.counts.maintenance_records ?? 0}</strong> 件のメンテナンス記録があります
            </p>
          </div>
          <Link to="/maintenance" className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium">
            ユーザーサイトで確認 →
          </Link>
        </div>
      </div>
    </div>
  )
}

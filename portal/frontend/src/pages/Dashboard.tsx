import { useEffect, useState } from 'react'
import axios from 'axios'
import { Activity, FileText, MessageSquare, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

interface SensorReading {
  device_id: string
  name: string
  location: string
  status: string
  rpm: number
  efficiency: number
  vibration: number
  outlet_pressure: number
  timestamp: string
}

interface Document {
  id: number
  original_name: string
  category: string
  uploaded_at: string
  uploaded_by: string
}

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'normal') return <CheckCircle size={16} className="text-green-500" />
  if (status === 'warning') return <AlertTriangle size={16} className="text-yellow-500" />
  return <XCircle size={16} className="text-red-500" />
}

const statusLabel: Record<string, string> = {
  normal: '正常',
  warning: '警告',
  alarm: '異常',
}

const statusColor: Record<string, string> = {
  normal: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  alarm: 'bg-red-100 text-red-700',
}

export default function Dashboard() {
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [sensorsRes, docsRes] = await Promise.all([
        axios.get('/api/sensors/latest'),
        axios.get('/api/documents'),
      ])
      setReadings(sensorsRes.data.readings || [])
      setDocuments(docsRes.data.documents || [])
    } catch (e) {
      console.error('Dashboard fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  const alarmCount = readings.filter(r => r.status === 'alarm').length
  const warningCount = readings.filter(r => r.status === 'warning').length
  const alertCount = alarmCount + warningCount

  const summaryCards = [
    {
      label: '総デバイス数',
      value: readings.length,
      icon: Activity,
      color: 'bg-red-600',
      link: '/sensor',
    },
    {
      label: 'アラート',
      value: alertCount,
      icon: AlertTriangle,
      color: alertCount > 0 ? 'bg-red-600' : 'bg-gray-500',
      link: '/sensor',
    },
    {
      label: 'ドキュメント',
      value: documents.length,
      icon: FileText,
      color: 'bg-gray-600',
      link: '/documents',
    },
    {
      label: 'チャット',
      value: '–',
      icon: MessageSquare,
      color: 'bg-gray-500',
      link: '/chat',
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">ダッシュボード</h1>
        <p className="text-gray-500 mt-1">HI**** Compressor User Portal へようこそ</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {summaryCards.map((card) => (
          <Link
            key={card.label}
            to={card.link}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
          >
            <div className={clsx('w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0', card.color)}>
              <card.icon size={22} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{loading ? '–' : card.value}</div>
              <div className="text-sm text-slate-500">{card.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">圧縮機ステータス</h2>
            <Link to="/sensor" className="text-sm text-red-600 hover:underline">詳細 →</Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {readings.map((device) => (
                <div
                  key={device.device_id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <StatusIcon status={device.status} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-700 text-sm truncate">{device.name}</div>
                    <div className="text-xs text-slate-400 truncate">{device.location}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', statusColor[device.status] || statusColor.normal)}>
                      {statusLabel[device.status] || device.status}
                    </span>
                    <div className="text-xs text-slate-400 mt-0.5">{Math.round(device.rpm).toLocaleString()} RPM</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Documents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">最近のドキュメント</h2>
            <Link to="/documents" className="text-sm text-red-600 hover:underline">すべて表示 →</Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">ドキュメントがありません</p>
              <Link to="/documents" className="text-blue-500 text-sm hover:underline">アップロードする</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.slice(0, 6).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <FileText size={16} className="text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 truncate">{doc.original_name}</div>
                    <div className="text-xs text-slate-400">{doc.category}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                    <Clock size={12} />
                    {new Date(doc.uploaded_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">クイックアクセス</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { to: '/sensor', label: 'センサー監視', icon: Activity, desc: 'リアルタイムデータ', color: 'text-red-600' },
            { to: '/documents', label: 'ドキュメント', icon: FileText, desc: 'ファイル管理', color: 'text-gray-600' },
            { to: '/chat', label: 'チャット', icon: MessageSquare, desc: 'サポート連絡', color: 'text-gray-500' },
            { to: '/chatbot', label: 'AIアシスト', icon: Activity, desc: 'AI問い合わせ', color: 'text-red-500' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-colors text-center"
            >
              <item.icon size={24} className={item.color} />
              <div>
                <div className="text-sm font-medium text-slate-700">{item.label}</div>
                <div className="text-xs text-slate-400">{item.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

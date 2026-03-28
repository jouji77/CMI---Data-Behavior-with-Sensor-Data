import { useEffect, useState } from 'react'
import axios from 'axios'
import { Activity, FileText, MessageSquare, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Clock, Cpu, Gauge } from 'lucide-react'
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

const statusConfig: Record<string, { label: string; dot: string; badge: string; border: string }> = {
  normal: {
    label: '正常',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    border: 'border-l-emerald-500',
  },
  warning: {
    label: '警告',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
    border: 'border-l-amber-400',
  },
  alarm: {
    label: '異常',
    dot: 'bg-rose-500 status-dot-alarm',
    badge: 'bg-rose-50 text-rose-700 border border-rose-200',
    border: 'border-l-rose-500',
  },
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
  const normalCount = readings.filter(r => r.status === 'normal').length

  const now = new Date()
  const dateStr = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  const userJson = localStorage.getItem('user')
  const user = userJson ? JSON.parse(userJson) : null

  const kpiCards = [
    {
      label: '総デバイス数',
      value: loading ? '–' : readings.length,
      icon: Cpu,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      trend: null,
      link: '/sensor',
    },
    {
      label: 'アクティブアラート',
      value: loading ? '–' : alertCount,
      icon: AlertTriangle,
      iconBg: alertCount > 0 ? 'bg-amber-50' : 'bg-slate-50',
      iconColor: alertCount > 0 ? 'text-amber-500' : 'text-slate-400',
      trend: alertCount > 0 ? { dir: 'up', label: `異常 ${alarmCount} · 警告 ${warningCount}` } : { dir: 'flat', label: '問題なし' },
      link: '/sensor',
    },
    {
      label: '正常稼働',
      value: loading ? '–' : normalCount,
      icon: Activity,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      trend: { dir: 'up', label: readings.length > 0 ? `${Math.round((normalCount / Math.max(readings.length, 1)) * 100)}% 稼働中` : '' },
      link: '/sensor',
    },
    {
      label: 'ドキュメント',
      value: loading ? '–' : documents.length,
      icon: FileText,
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-600',
      trend: null,
      link: '/documents',
    },
  ]

  return (
    <div className="p-8 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {user ? `ようこそ、${user.name}` : 'ダッシュボード'}
          </h1>
          <p className="text-gray-400 mt-1 text-sm">{dateStr}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white border border-gray-100 px-3 py-2 rounded-xl shadow-sm">
          <Clock size={12} />
          <span>最終更新: {now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {kpiCards.map((card) => (
          <Link
            key={card.label}
            to={card.link}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', card.iconBg)}>
                <card.icon size={20} className={card.iconColor} />
              </div>
              {card.trend && (
                <span className={clsx(
                  'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                  card.trend.dir === 'up' && card.label === 'アクティブアラート'
                    ? 'bg-amber-50 text-amber-600'
                    : card.trend.dir === 'up'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-gray-50 text-gray-500'
                )}>
                  {card.trend.dir === 'up' && card.label !== 'アクティブアラート' && <TrendingUp size={11} />}
                  {card.trend.dir === 'up' && card.label === 'アクティブアラート' && <TrendingDown size={11} />}
                  {card.trend.label}
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-gray-900 tracking-tight mb-1">{card.value}</div>
            <div className="text-sm text-gray-400">{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Device Status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 tracking-tight">圧縮機ステータス</h2>
              <p className="text-xs text-gray-400 mt-0.5">リアルタイム稼働状況</p>
            </div>
            <Link
              to="/sensor"
              className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 transition-colors"
            >
              詳細 <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : readings.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Activity size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">センサーデータがありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {readings.map((device) => {
                const sc = statusConfig[device.status] || statusConfig.normal
                return (
                  <div
                    key={device.device_id}
                    className={clsx(
                      'flex items-center gap-3 p-3.5 rounded-xl border-l-2 border border-gray-50 hover:bg-gray-50/80 transition-colors',
                      sc.border
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <div className={clsx('w-2.5 h-2.5 rounded-full', sc.dot)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 text-sm truncate">{device.name}</div>
                      <div className="text-xs text-gray-400 truncate">{device.location}</div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs font-mono font-medium text-gray-700">{Math.round(device.rpm).toLocaleString()} <span className="text-gray-400 font-normal">RPM</span></div>
                        <div className="text-xs text-gray-400">{device.efficiency?.toFixed(1)}% eff.</div>
                      </div>
                      <span className={clsx('text-xs px-2.5 py-1 rounded-full font-medium', sc.badge)}>
                        {sc.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Documents */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900 tracking-tight">最近のドキュメント</h2>
              <p className="text-xs text-gray-400 mt-0.5">最新アップロードファイル</p>
            </div>
            <Link
              to="/documents"
              className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 transition-colors"
            >
              すべて <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <FileText size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">ドキュメントがありません</p>
              <Link to="/documents" className="text-xs text-rose-600 hover:underline mt-1 inline-block">アップロードする</Link>
            </div>
          ) : (
            <div className="space-y-1.5">
              {documents.slice(0, 6).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={14} className="text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 truncate">{doc.original_name}</div>
                    <div className="text-xs text-gray-400">{doc.category}</div>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(doc.uploaded_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Access */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 tracking-tight mb-4">クイックアクセス</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/sensor', label: 'センサー監視', icon: Activity, desc: 'リアルタイムデータ', bg: 'bg-rose-50', color: 'text-rose-600', hover: 'hover:border-rose-200 hover:bg-rose-50' },
            { to: '/documents', label: 'ドキュメント', icon: FileText, desc: 'ファイル管理', bg: 'bg-sky-50', color: 'text-sky-600', hover: 'hover:border-sky-200 hover:bg-sky-50' },
            { to: '/chat', label: 'チャット', icon: MessageSquare, desc: 'サポート連絡', bg: 'bg-violet-50', color: 'text-violet-600', hover: 'hover:border-violet-200 hover:bg-violet-50' },
            { to: '/chatbot', label: 'AIアシスト', icon: Gauge, desc: 'AI問い合わせ', bg: 'bg-emerald-50', color: 'text-emerald-600', hover: 'hover:border-emerald-200 hover:bg-emerald-50' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={clsx(
                'flex flex-col items-center gap-2.5 p-5 rounded-xl border border-gray-100 transition-all duration-150 text-center group',
                item.hover
              )}
            >
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-150', item.bg)}>
                <item.icon size={20} className={item.color} />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">{item.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

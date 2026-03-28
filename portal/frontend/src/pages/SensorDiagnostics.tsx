import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from 'recharts'
import { Activity, RefreshCw, AlertTriangle, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

interface Device {
  id: string
  name: string
  location: string
}

interface SensorReading {
  device_id: string
  timestamp: string
  inlet_pressure: number
  outlet_pressure: number
  inlet_temp: number
  outlet_temp: number
  vibration: number
  rpm: number
  power_kw: number
  efficiency: number
  status: string
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; iconColor: string; badgeClass: string }> = {
  normal: { label: '正常', icon: CheckCircle, iconColor: 'text-emerald-500', badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  warning: { label: '警告', icon: AlertTriangle, iconColor: 'text-amber-500', badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200' },
  alarm: { label: '異常', icon: XCircle, iconColor: 'text-rose-500', badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200' },
}

interface MetricCardProps {
  label: string
  value: number | string
  unit: string
  warningThreshold?: number
  alarmThreshold?: number
  currentValue?: number
  lowerBetter?: boolean
}

function MetricCard({ label, value, unit, warningThreshold, alarmThreshold, currentValue, lowerBetter }: MetricCardProps) {
  const numVal = typeof currentValue === 'number' ? currentValue : (typeof value === 'number' ? value : 0)
  let status: 'normal' | 'warning' | 'alarm' = 'normal'
  if (alarmThreshold !== undefined && (lowerBetter ? numVal < alarmThreshold : numVal > alarmThreshold)) {
    status = 'alarm'
  } else if (warningThreshold !== undefined && (lowerBetter ? numVal < warningThreshold : numVal > warningThreshold)) {
    status = 'warning'
  }

  const topBarColor = status === 'alarm' ? 'bg-rose-500' : status === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'
  const valueColor = status === 'alarm' ? 'text-rose-600' : status === 'warning' ? 'text-amber-600' : 'text-gray-900'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-150">
      <div className={clsx('h-1', topBarColor)} />
      <div className="p-4">
        <div className="text-xs text-gray-400 mb-2 font-medium">{label}</div>
        <div className={clsx('text-2xl font-bold tracking-tight', valueColor)}>
          {typeof value === 'number' ? value.toLocaleString('ja-JP', { maximumFractionDigits: 2 }) : value}
          <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
        </div>
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="text-gray-500 mb-2 font-medium">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-semibold text-gray-800">{typeof entry.value === 'number' ? entry.value.toFixed(3) : entry.value}</span>
        </div>
      ))}
    </div>
  )
}

function formatTime(ts: string) {
  try {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  } catch {
    return ts
  }
}

export default function SensorDiagnostics() {
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [latest, setLatest] = useState<SensorReading | null>(null)
  const [history, setHistory] = useState<SensorReading[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchDevices = async () => {
    const res = await axios.get('/api/sensors/devices')
    const devs: Device[] = res.data.devices || []
    setDevices(devs)
    if (devs.length > 0 && !selectedDevice) {
      setSelectedDevice(devs[0].id)
    }
    return devs
  }

  const fetchLatest = useCallback(async (deviceId: string) => {
    const res = await axios.get('/api/sensors/latest')
    const readings: SensorReading[] = res.data.readings || []
    const found = readings.find(r => r.device_id === deviceId)
    if (found) setLatest(found)
  }, [])

  const fetchHistory = useCallback(async (deviceId: string) => {
    const res = await axios.get(`/api/sensors/history/${deviceId}?hours=24`)
    setHistory(res.data.history || [])
  }, [])

  const refresh = useCallback(async (deviceId?: string) => {
    const id = deviceId || selectedDevice
    if (!id) return
    setRefreshing(true)
    try {
      await Promise.all([fetchLatest(id), fetchHistory(id)])
      setLastUpdated(new Date())
    } finally {
      setRefreshing(false)
    }
  }, [selectedDevice, fetchLatest, fetchHistory])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const devs = await fetchDevices()
        if (devs.length > 0) {
          const firstId = devs[0].id
          setSelectedDevice(firstId)
          await Promise.all([fetchLatest(firstId), fetchHistory(firstId)])
          setLastUpdated(new Date())
        }
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!selectedDevice) return
    refresh(selectedDevice)
    const interval = setInterval(() => refresh(selectedDevice), 5000)
    return () => clearInterval(interval)
  }, [selectedDevice])

  const handleDeviceChange = async (id: string) => {
    setSelectedDevice(id)
    setLoading(true)
    try {
      await Promise.all([fetchLatest(id), fetchHistory(id)])
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }

  const status = latest?.status || 'normal'
  const sc = statusConfig[status] || statusConfig.normal
  const StatusIcon = sc.icon

  const historyData = history.slice(-96).map(h => ({
    time: formatTime(h.timestamp),
    inlet_pressure: h.inlet_pressure,
    outlet_pressure: h.outlet_pressure,
    inlet_temp: h.inlet_temp,
    outlet_temp: h.outlet_temp,
    vibration: h.vibration,
    rpm: Math.round(h.rpm),
    efficiency: h.efficiency,
  }))

  const chartCardClass = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow duration-150'

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">センサー遠隔診断</h1>
          <p className="text-gray-400 mt-1 text-sm">遠心圧縮機リアルタイムモニタリング</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400 hidden sm:block">
              最終更新: {lastUpdated.toLocaleTimeString('ja-JP')}
            </span>
          )}
          <button
            onClick={() => refresh()}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={13} className={clsx(refreshing && 'animate-spin')} />
            更新
          </button>
        </div>
      </div>

      {/* Device Selector & Status */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <label className="text-sm font-medium text-gray-500 whitespace-nowrap">デバイス</label>
          <div className="relative flex-1 max-w-xs">
            <select
              value={selectedDevice}
              onChange={e => handleDeviceChange(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
            >
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.location})</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {latest && (
          <span className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium', sc.badgeClass)}>
            <StatusIcon size={14} className={sc.iconColor} />
            {sc.label}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : latest ? (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard label="入口圧力" value={latest.inlet_pressure} unit="bara" />
            <MetricCard label="出口圧力" value={latest.outlet_pressure} unit="bara" />
            <MetricCard label="入口温度" value={latest.inlet_temp} unit="°C" />
            <MetricCard label="出口温度" value={latest.outlet_temp} unit="°C" warningThreshold={180} alarmThreshold={200} currentValue={latest.outlet_temp} />
            <MetricCard label="振動" value={latest.vibration} unit="mm/s" warningThreshold={7} alarmThreshold={10} currentValue={latest.vibration} />
            <MetricCard label="回転数" value={Math.round(latest.rpm)} unit="RPM" />
            <MetricCard label="消費電力" value={latest.power_kw} unit="kW" />
            <MetricCard label="効率" value={latest.efficiency} unit="%" warningThreshold={74} alarmThreshold={70} currentValue={latest.efficiency} lowerBetter />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Pressure Chart */}
            <div className={chartCardClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800">圧力トレンド</h3>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">bara</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={historyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="pInlet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pOutlet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="#f0f4f8" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={11} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="inlet_pressure" name="入口圧力" stroke="#3b82f6" fill="url(#pInlet)" dot={false} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="outlet_pressure" name="出口圧力" stroke="#f97316" fill="url(#pOutlet)" dot={false} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Temperature Chart */}
            <div className={chartCardClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800">温度トレンド</h3>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">°C</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={historyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#f0f4f8" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={11} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="inlet_temp" name="入口温度" stroke="#06b6d4" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="outlet_temp" name="出口温度" stroke="#ef4444" dot={false} strokeWidth={1.5} />
                  <ReferenceLine y={180} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '警告', fontSize: 10, fill: '#f59e0b' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Vibration Chart */}
            <div className={chartCardClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800">振動トレンド</h3>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">mm/s</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={historyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="vibGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="#f0f4f8" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={11} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 'auto']} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="vibration" name="振動" stroke="#8b5cf6" fill="url(#vibGrad)" dot={false} strokeWidth={1.5} />
                  <ReferenceLine y={7} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '警告 7', fontSize: 10, fill: '#f59e0b' }} />
                  <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="4 2" label={{ value: '異常 10', fontSize: 10, fill: '#ef4444' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Efficiency Chart */}
            <div className={chartCardClass}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800">効率トレンド</h3>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">%</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={historyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="#f0f4f8" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={11} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[60, 95]} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="efficiency" name="効率" stroke="#10b981" fill="url(#effGrad)" dot={false} strokeWidth={1.5} />
                  <ReferenceLine y={74} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '警告 74%', fontSize: 10, fill: '#f59e0b' }} />
                  <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 2" label={{ value: '異常 70%', fontSize: 10, fill: '#ef4444' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <Activity size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">デバイスを選択してください</p>
        </div>
      )}
    </div>
  )
}

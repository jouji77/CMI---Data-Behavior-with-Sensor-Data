import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Activity, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import clsx from 'clsx'
import CompressorCrossSection from '../components/digitaltwin/CompressorCrossSection'
import PerformanceCurve from '../components/digitaltwin/PerformanceCurve'
import PIDDiagram from '../components/digitaltwin/PIDDiagram'
import RULWidget from '../components/digitaltwin/RULWidget'

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

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; colorClass: string; badgeClass: string }> = {
  normal: { label: '正常', icon: CheckCircle, colorClass: 'text-green-500', badgeClass: 'bg-green-100 text-green-700 border-green-200' },
  warning: { label: '警告', icon: AlertTriangle, colorClass: 'text-yellow-500', badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  alarm: { label: '異常', icon: XCircle, colorClass: 'text-red-500', badgeClass: 'bg-red-100 text-red-700 border-red-200' },
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
  let colorClass = 'text-slate-800'
  if (alarmThreshold !== undefined && (lowerBetter ? numVal < alarmThreshold : numVal > alarmThreshold)) {
    colorClass = 'text-red-600'
  } else if (warningThreshold !== undefined && (lowerBetter ? numVal < warningThreshold : numVal > warningThreshold)) {
    colorClass = 'text-yellow-600'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={clsx('text-2xl font-bold', colorClass)}>
        {typeof value === 'number' ? value.toLocaleString('ja-JP', { maximumFractionDigits: 2 }) : value}
        <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
      </div>
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
  const [view, setView] = useState<'dashboard' | 'twin'>('dashboard')

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

  // Derive approximate flow/head from sensor data for performance curve
  const currentFlow = latest ? latest.rpm / 1000 : 12.5
  const currentHead = latest ? latest.outlet_pressure * 25 : 180

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">センサー遠隔診断</h1>
          <p className="text-slate-500 mt-1">遠心圧縮機リアルタイムモニタリング</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400">
              最終更新: {lastUpdated.toLocaleTimeString('ja-JP')}
            </span>
          )}
          <button
            onClick={() => refresh()}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={clsx(refreshing && 'animate-spin')} />
            更新
          </button>
        </div>
      </div>

      {/* Device Selector */}
      <div className="flex items-center gap-4 mb-6">
        <label className="text-sm font-medium text-slate-600">デバイス選択:</label>
        <select
          value={selectedDevice}
          onChange={e => handleDeviceChange(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          {devices.map(d => (
            <option key={d.id} value={d.id}>{d.name} ({d.location})</option>
          ))}
        </select>

        {latest && (
          <span className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium', sc.badgeClass)}>
            <StatusIcon size={14} />
            {sc.label}
          </span>
        )}
      </div>

      {/* ─── View Tabs ─── */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView('dashboard')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
            view === 'dashboard'
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-slate-600 border-gray-200 hover:border-red-300 hover:text-red-600'
          )}
        >
          📊 センサーダッシュボード
        </button>
        <button
          onClick={() => setView('twin')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
            view === 'twin'
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-slate-600 border-gray-200 hover:border-red-300 hover:text-red-600'
          )}
        >
          🔧 デジタルツイン
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : latest ? (
        <>
          {view === 'dashboard' && (
            <>
              {/* Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <MetricCard label="入口圧力" value={latest.inlet_pressure} unit="bara" />
                <MetricCard label="出口圧力" value={latest.outlet_pressure} unit="bara" />
                <MetricCard label="入口温度" value={latest.inlet_temp} unit="°C" />
                <MetricCard label="出口温度" value={latest.outlet_temp} unit="°C" warningThreshold={180} alarmThreshold={200} currentValue={latest.outlet_temp} />
                <MetricCard label="振動" value={latest.vibration} unit="mm/s" warningThreshold={7} alarmThreshold={10} currentValue={latest.vibration} />
                <MetricCard label="回転数 (RPM)" value={Math.round(latest.rpm)} unit="rpm" />
                <MetricCard label="消費電力" value={latest.power_kw} unit="kW" />
                <MetricCard label="効率" value={latest.efficiency} unit="%" warningThreshold={74} alarmThreshold={70} currentValue={latest.efficiency} lowerBetter />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {/* Pressure Chart */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">圧力トレンド (bara)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={historyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={11} />
                      <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                      <Tooltip formatter={(val: number) => val.toFixed(3)} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="inlet_pressure" name="入口圧力" stroke="#3b82f6" dot={false} strokeWidth={1.5} />
                      <Line type="monotone" dataKey="outlet_pressure" name="出口圧力" stroke="#f97316" dot={false} strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Temperature Chart */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">温度トレンド (°C)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={historyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={11} />
                      <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                      <Tooltip formatter={(val: number) => `${val.toFixed(1)}°C`} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="inlet_temp" name="入口温度" stroke="#06b6d4" dot={false} strokeWidth={1.5} />
                      <Line type="monotone" dataKey="outlet_temp" name="出口温度" stroke="#ef4444" dot={false} strokeWidth={1.5} />
                      <ReferenceLine y={180} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '警告', fontSize: 10, fill: '#f59e0b' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Vibration Chart */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">振動トレンド (mm/s)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={historyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={11} />
                      <YAxis tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                      <Tooltip formatter={(val: number) => `${val.toFixed(2)} mm/s`} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="vibration" name="振動" stroke="#8b5cf6" dot={false} strokeWidth={1.5} />
                      <ReferenceLine y={7} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '警告 7', fontSize: 10, fill: '#f59e0b' }} />
                      <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="4 2" label={{ value: '異常 10', fontSize: 10, fill: '#ef4444' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* RPM & Efficiency Chart */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">効率トレンド (%)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={historyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={11} />
                      <YAxis tick={{ fontSize: 10 }} domain={[60, 95]} />
                      <Tooltip formatter={(val: number) => `${val.toFixed(1)}%`} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="efficiency" name="効率" stroke="#10b981" dot={false} strokeWidth={1.5} />
                      <ReferenceLine y={74} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '警告 74%', fontSize: 10, fill: '#f59e0b' }} />
                      <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 2" label={{ value: '異常 70%', fontSize: 10, fill: '#ef4444' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {view === 'twin' && (
            <div className="space-y-6">
              {/* Top: Cross-section + RUL side by side */}
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div className="xl:col-span-3">
                  <CompressorCrossSection
                    sensorData={latest}
                    onHotspotClick={(sensor) => console.log('Hotspot clicked:', sensor)}
                  />
                </div>
                <div className="xl:col-span-1">
                  <RULWidget sensorData={latest} />
                </div>
              </div>

              {/* Bottom: Performance Curve + PID Diagram */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <PerformanceCurve
                  currentFlow={currentFlow}
                  currentHead={currentHead}
                  currentEfficiency={latest.efficiency}
                  ratedFlow={14}
                  ratedHead={200}
                />
                <PIDDiagram sensorData={latest} />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-slate-400">
          <Activity size={40} className="mx-auto mb-3 opacity-40" />
          <p>デバイスを選択してください</p>
        </div>
      )}
    </div>
  )
}

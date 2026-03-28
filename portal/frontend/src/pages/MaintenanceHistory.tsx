import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { Wrench, AlertTriangle, CheckCircle, Clock, Calendar, X, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'

interface MaintenanceRecord {
  id: number
  device_id: string
  device_name: string
  record_type: string
  title: string
  description: string
  performed_by: string
  performed_at: string | null
  next_scheduled_at: string | null
  status: string
  parts_replaced: string[]
  cost_jpy: number | null
  created_at: string
}

const DEVICES = ['CC-001', 'CC-002', 'CC-003', 'CC-004']

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return '-'
  return `¥${amount.toLocaleString()}`
}

function isOverdue(record: MaintenanceRecord): boolean {
  if (record.status === 'scheduled' && record.next_scheduled_at) {
    return new Date(record.next_scheduled_at) < new Date()
  }
  return false
}

function StatusBadge({ status, record }: { status: string; record: MaintenanceRecord }) {
  const { t } = useTranslation()
  if (isOverdue(record)) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
        <AlertTriangle size={11} /> {t('maintenance.overdue')}
      </span>
    )
  }
  const map: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    scheduled: 'bg-amber-50 text-amber-700 border border-amber-200',
    pending: 'bg-gray-50 text-gray-600 border border-gray-200',
  }
  const icons: Record<string, JSX.Element> = {
    completed: <CheckCircle size={11} />,
    scheduled: <Calendar size={11} />,
    pending: <Clock size={11} />,
  }
  const labels: Record<string, string> = {
    completed: t('maintenance.status.completed'),
    scheduled: t('maintenance.status.scheduled'),
    pending: t('maintenance.status.pending'),
  }
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', map[status] || 'bg-gray-50 text-gray-600 border border-gray-200')}>
      {icons[status]} {labels[status] || status}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const { t } = useTranslation()
  const map: Record<string, string> = {
    maintenance: 'bg-sky-50 text-sky-700 border border-sky-200',
    defect: 'bg-rose-50 text-rose-700 border border-rose-200',
    inspection: 'bg-violet-50 text-violet-700 border border-violet-200',
  }
  const labels: Record<string, string> = {
    maintenance: t('maintenance.type.maintenance'),
    defect: t('maintenance.type.defect'),
    inspection: t('maintenance.type.inspection'),
  }
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', map[type] || 'bg-gray-50 border border-gray-200')}>
      {labels[type] || type}
    </span>
  )
}

function RecordRow({ record }: { record: MaintenanceRecord }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const overdue = isOverdue(record)
  const borderColor = overdue ? 'border-l-rose-500' :
    record.status === 'completed' ? 'border-l-emerald-500' :
    record.status === 'scheduled' ? 'border-l-amber-400' : 'border-l-gray-300'

  const dotColor = overdue ? 'bg-rose-500' :
    record.status === 'completed' ? 'bg-emerald-500' :
    record.status === 'scheduled' ? 'bg-amber-400' : 'bg-gray-300'

  return (
    <div className={clsx(
      'bg-white rounded-2xl border border-gray-100 border-l-2 shadow-sm hover:shadow-md transition-shadow duration-150',
      borderColor
    )}>
      <div
        className="px-5 py-4 cursor-pointer flex items-start justify-between gap-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex gap-4 flex-1 min-w-0">
          {/* Timeline dot */}
          <div className="flex flex-col items-center pt-1 flex-shrink-0">
            <div className={clsx('w-3 h-3 rounded-full', dotColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <TypeBadge type={record.record_type} />
              <StatusBadge status={record.status} record={record} />
              <span className="text-xs text-gray-400 font-mono">{record.device_id}</span>
            </div>
            <p className="font-semibold text-gray-800 text-sm">{record.title}</p>
            <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-gray-400">
              {record.performed_at && (
                <span className="flex items-center gap-1">
                  <CheckCircle size={10} className="text-emerald-500" />
                  実施: {formatDate(record.performed_at)}
                </span>
              )}
              {record.next_scheduled_at && (
                <span className="flex items-center gap-1">
                  <Calendar size={10} className="text-amber-500" />
                  次回: {formatDate(record.next_scheduled_at)}
                </span>
              )}
              {record.performed_by && (
                <span className="flex items-center gap-1">
                  担当: {record.performed_by}
                </span>
              )}
            </div>
          </div>
        </div>
        <button className="text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5 transition-colors">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-50 pt-3 space-y-3 text-sm ml-7">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">内容</p>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">{record.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-50 rounded-xl px-3 py-2">
              <p className="text-gray-400 mb-0.5">{t('maintenance.performedBy')}</p>
              <p className="font-medium text-gray-700">{record.performed_by || '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2">
              <p className="text-gray-400 mb-0.5">{t('maintenance.cost')}</p>
              <p className="font-medium text-gray-700">{formatCurrency(record.cost_jpy)}</p>
            </div>
          </div>
          {record.parts_replaced && record.parts_replaced.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('maintenance.partsReplaced')}</p>
              <div className="flex flex-wrap gap-1.5">
                {record.parts_replaced.map((p, i) => (
                  <span key={i} className="bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-lg text-xs">{p}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ScheduleModalProps {
  onClose: () => void
  onSubmit: (data: any) => void
}

function ScheduleModal({ onClose, onSubmit }: ScheduleModalProps) {
  const { t } = useTranslation()
  const [deviceId, setDeviceId] = useState('CC-001')
  const [requestedDate, setRequestedDate] = useState('')
  const [description, setDescription] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post('/api/maintenance/schedule-request', {
        device_id: deviceId,
        device_name: `遠心圧縮機 ${deviceId}`,
        requested_date: requestedDate,
        description,
        contact_name: contactName,
        contact_email: contactEmail,
      })
      onSubmit({})
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{t('maintenance.scheduleModal')}</h3>
            <p className="text-xs text-gray-400 mt-0.5">メンテナンスの日程調整リクエスト</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">機器</label>
            <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className={inputClass}>
              {DEVICES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('maintenance.requestedDate')}</label>
            <input type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} required className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('maintenance.contactName')}</label>
              <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('maintenance.contactEmail')}</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('maintenance.descriptionLabel')}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold disabled:bg-rose-300 transition-colors shadow-sm shadow-rose-200"
            >
              {loading ? t('common.loading') : t('maintenance.submitRequest')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function MaintenanceHistory() {
  const { t } = useTranslation()
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deviceFilter, setDeviceFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showModal, setShowModal] = useState(false)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (deviceFilter) params.device_id = deviceFilter
      if (typeFilter) params.record_type = typeFilter
      const res = await axios.get('/api/maintenance', { params })
      setRecords(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRecords() }, [deviceFilter, typeFilter])

  const upcoming = records.filter(r => r.status === 'scheduled' || r.status === 'pending')
  const completed = records.filter(r => r.status === 'completed')

  const selectClass = "px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"

  return (
    <div className="p-8 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('maintenance.title')}</h1>
          <p className="text-gray-400 mt-1 text-sm">メンテナンス来歴・スケジュール管理</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-rose-200 hover:shadow-rose-300"
        >
          <Calendar size={15} />
          {t('maintenance.requestSchedule')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('maintenance.deviceFilter')}</label>
          <select value={deviceFilter} onChange={(e) => setDeviceFilter(e.target.value)} className={selectClass}>
            <option value="">{t('maintenance.allDevices')}</option>
            {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('maintenance.typeFilter')}</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectClass}>
            <option value="">{t('maintenance.allTypes')}</option>
            <option value="maintenance">{t('maintenance.type.maintenance')}</option>
            <option value="defect">{t('maintenance.type.defect')}</option>
            <option value="inspection">{t('maintenance.type.inspection')}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={15} className="text-amber-500" />
                <h2 className="text-sm font-semibold text-gray-700">{t('maintenance.schedule')}</h2>
                <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-medium">{upcoming.length}</span>
              </div>
              <div className="space-y-3">
                {upcoming.map(r => <RecordRow key={r.id} record={r} />)}
              </div>
            </section>
          )}

          {/* Completed */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={15} className="text-emerald-500" />
              <h2 className="text-sm font-semibold text-gray-700">{t('maintenance.history')}</h2>
              <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">{completed.length}</span>
            </div>
            {completed.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Wrench size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('common.noData')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completed.map(r => <RecordRow key={r.id} record={r} />)}
              </div>
            )}
          </section>
        </div>
      )}

      {showModal && (
        <ScheduleModal
          onClose={() => setShowModal(false)}
          onSubmit={() => { setShowModal(false); fetchRecords() }}
        />
      )}
    </div>
  )
}

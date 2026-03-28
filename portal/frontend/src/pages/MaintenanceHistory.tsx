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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <AlertTriangle size={11} /> {t('maintenance.overdue')}
      </span>
    )
  }
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    scheduled: 'bg-yellow-100 text-yellow-700',
    pending: 'bg-gray-100 text-gray-600',
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
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', map[status] || 'bg-gray-100 text-gray-600')}>
      {icons[status]} {labels[status] || status}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const { t } = useTranslation()
  const map: Record<string, string> = {
    maintenance: 'bg-blue-100 text-blue-700',
    defect: 'bg-red-100 text-red-700',
    inspection: 'bg-purple-100 text-purple-700',
  }
  const labels: Record<string, string> = {
    maintenance: t('maintenance.type.maintenance'),
    defect: t('maintenance.type.defect'),
    inspection: t('maintenance.type.inspection'),
  }
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', map[type] || 'bg-gray-100')}>
      {labels[type] || type}
    </span>
  )
}

function RecordRow({ record }: { record: MaintenanceRecord }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const borderColor = isOverdue(record) ? 'border-l-red-500' :
    record.status === 'completed' ? 'border-l-green-500' :
    record.status === 'scheduled' ? 'border-l-yellow-500' : 'border-l-gray-400'

  return (
    <div className={clsx('bg-white rounded-lg border border-gray-200 border-l-4 mb-3', borderColor)}>
      <div
        className="px-4 py-3 cursor-pointer flex items-start justify-between gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <TypeBadge type={record.record_type} />
            <StatusBadge status={record.status} record={record} />
            <span className="text-xs text-gray-400">{record.device_id}</span>
          </div>
          <p className="font-medium text-gray-800 text-sm">{record.title}</p>
          <div className="flex flex-wrap gap-4 mt-1 text-xs text-gray-500">
            {record.performed_at && (
              <span className="flex items-center gap-1">
                <CheckCircle size={11} /> {formatDate(record.performed_at)}
              </span>
            )}
            {record.next_scheduled_at && (
              <span className="flex items-center gap-1">
                <Calendar size={11} /> 次回: {formatDate(record.next_scheduled_at)}
              </span>
            )}
          </div>
        </div>
        <button className="text-gray-400 flex-shrink-0 mt-0.5">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2 text-sm">
          <div>
            <span className="text-gray-500 text-xs font-medium">内容</span>
            <p className="text-gray-700 mt-0.5 whitespace-pre-line">{record.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500">{t('maintenance.performedBy')}:</span>
              <span className="ml-1 text-gray-700">{record.performed_by}</span>
            </div>
            <div>
              <span className="text-gray-500">{t('maintenance.cost')}:</span>
              <span className="ml-1 text-gray-700">{formatCurrency(record.cost_jpy)}</span>
            </div>
          </div>
          {record.parts_replaced && record.parts_replaced.length > 0 && (
            <div>
              <span className="text-gray-500 text-xs">{t('maintenance.partsReplaced')}:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {record.parts_replaced.map((p, i) => (
                  <span key={i} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{p}</span>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">{t('maintenance.scheduleModal')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">機器</label>
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {DEVICES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenance.requestedDate')}</label>
            <input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenance.contactName')}</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenance.contactEmail')}</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenance.descriptionLabel')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:bg-red-400"
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center">
            <Wrench size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('maintenance.title')}</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Calendar size={16} />
          {t('maintenance.requestSchedule')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('maintenance.deviceFilter')}</label>
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">{t('maintenance.allDevices')}</option>
            {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('maintenance.typeFilter')}</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">{t('maintenance.allTypes')}</option>
            <option value="maintenance">{t('maintenance.type.maintenance')}</option>
            <option value="defect">{t('maintenance.type.defect')}</option>
            <option value="inspection">{t('maintenance.type.inspection')}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Calendar size={16} className="text-yellow-500" /> {t('maintenance.schedule')} ({upcoming.length})
              </h2>
              {upcoming.map(r => <RecordRow key={r.id} record={r} />)}
            </section>
          )}

          {/* Completed */}
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" /> {t('maintenance.history')} ({completed.length})
            </h2>
            {completed.length === 0 ? (
              <p className="text-gray-400 text-sm">{t('common.noData')}</p>
            ) : (
              completed.map(r => <RecordRow key={r.id} record={r} />)
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

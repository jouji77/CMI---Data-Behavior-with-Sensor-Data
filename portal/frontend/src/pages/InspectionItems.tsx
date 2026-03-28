import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { ClipboardCheck, AlertTriangle, CheckCircle, Info, Printer } from 'lucide-react'
import clsx from 'clsx'

interface InspectionItem {
  id: number
  device_id: string
  item_name_ja: string
  item_name_en: string
  category: string
  frequency: string
  method_ja: string
  method_en: string
  normal_range: string
  current_value: string
  status: string
  last_checked: string | null
  is_recommended: boolean
}

const DEVICES = ['CC-001', 'CC-002', 'CC-003', 'CC-004']

function StatusIcon({ status }: { status: string }) {
  if (status === 'normal') return <CheckCircle size={16} className="text-green-500" />
  if (status === 'caution') return <AlertTriangle size={16} className="text-yellow-500" />
  if (status === 'warning') return <AlertTriangle size={16} className="text-red-500" />
  return <Info size={16} className="text-gray-400" />
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const map: Record<string, string> = {
    normal: 'bg-green-100 text-green-700',
    caution: 'bg-yellow-100 text-yellow-700',
    warning: 'bg-red-100 text-red-700',
  }
  const label = (t(`inspection.status.${status}` as any) || status) as string
  return (
    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', map[status] || 'bg-gray-100 text-gray-600')}>
      {label}
    </span>
  )
}

interface ChecklistItemProps {
  item: InspectionItem
  onChecked: (id: number, status: string) => void
}

function ChecklistItem({ item, onChecked }: ChecklistItemProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [showMethod, setShowMethod] = useState(false)
  const [checking, setChecking] = useState(false)

  const name = lang === 'en' ? item.item_name_en : item.item_name_ja
  const method = lang === 'en' ? item.method_en : item.method_ja

  const handleCheck = async () => {
    setChecking(true)
    try {
      await axios.post(`/api/inspection/${item.id}/check`, { status: 'normal' })
      onChecked(item.id, 'normal')
    } catch (err) {
      console.error(err)
    } finally {
      setChecking(false)
    }
  }

  const rowBg = item.is_recommended ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'

  return (
    <div className={clsx('rounded-lg border p-4 transition-all', rowBg)}>
      <div className="flex items-start gap-3">
        <StatusIcon status={item.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-medium text-sm text-gray-800">{name}</span>
            {item.is_recommended && (
              <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">要注意</span>
            )}
            <StatusBadge status={item.status} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-600 mb-2">
            <div>
              <span className="text-gray-400">{t('inspection.category')}:</span>
              <span className="ml-1">{item.category}</span>
            </div>
            {item.normal_range && (
              <div>
                <span className="text-gray-400">{t('inspection.normalRange')}:</span>
                <span className="ml-1">{item.normal_range}</span>
              </div>
            )}
            {item.current_value && (
              <div>
                <span className="text-gray-400">{t('inspection.currentValue')}:</span>
                <span className={clsx('ml-1 font-medium', item.status === 'warning' ? 'text-red-600' : item.status === 'caution' ? 'text-yellow-600' : 'text-gray-700')}>
                  {item.current_value}
                </span>
              </div>
            )}
            <div>
              <span className="text-gray-400">{t('inspection.lastChecked')}:</span>
              <span className="ml-1">
                {item.last_checked
                  ? new Date(item.last_checked).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                  : t('inspection.notChecked')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCheck}
              disabled={checking}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:bg-gray-400"
            >
              <CheckCircle size={12} className="inline mr-1" />
              {t('inspection.checkNow')}
            </button>
            {method && (
              <button
                onClick={() => setShowMethod(!showMethod)}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <Info size={12} />
                {t('inspection.method')}
              </button>
            )}
          </div>

          {showMethod && method && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              {method}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InspectionItems() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [selectedDevice, setSelectedDevice] = useState('')
  const [checklist, setChecklist] = useState<{ daily: InspectionItem[]; weekly: InspectionItem[]; monthly: InspectionItem[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const fetchChecklist = async () => {
    if (!selectedDevice) return
    setLoading(true)
    try {
      const res = await axios.get(`/api/inspection/checklist/${selectedDevice}`)
      setChecklist(res.data.checklist)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchChecklist() }, [selectedDevice])

  const handleItemChecked = (id: number, status: string) => {
    if (!checklist) return
    const update = (items: InspectionItem[]) =>
      items.map(i => i.id === id ? { ...i, status, last_checked: new Date().toISOString() } : i)
    setChecklist({
      daily: update(checklist.daily),
      weekly: update(checklist.weekly),
      monthly: update(checklist.monthly),
    })
  }

  const allItems = checklist ? [...checklist.daily, ...checklist.weekly, ...checklist.monthly] : []
  const warningItems = allItems.filter(i => i.is_recommended || i.status === 'warning' || i.status === 'caution')

  const handlePrint = () => window.print()

  const FREQ_LABELS: Record<string, string> = {
    daily: t('inspection.frequency.daily'),
    weekly: t('inspection.frequency.weekly'),
    monthly: t('inspection.frequency.monthly'),
  }

  return (
    <div className="p-6 max-w-5xl mx-auto" ref={printRef}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center">
            <ClipboardCheck size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('inspection.title')}</h1>
        </div>
        {selectedDevice && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Printer size={16} />
            {t('inspection.printChecklist')}
          </button>
        )}
      </div>

      {/* Device selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('inspection.deviceSelector')}</label>
        <div className="flex gap-3 flex-wrap">
          {DEVICES.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDevice(d)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                selectedDevice === d
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {!selectedDevice ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardCheck size={48} className="mx-auto mb-3 opacity-30" />
          <p>{t('inspection.selectDevice')}</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : checklist ? (
        <div className="space-y-8">
          {/* Warning items highlighted */}
          {warningItems.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-red-700 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-600" />
                {t('inspection.recommendedItems')} ({warningItems.length})
              </h2>
              <div className="space-y-2">
                {warningItems.map(item => (
                  <ChecklistItem key={item.id} item={item} onChecked={handleItemChecked} />
                ))}
              </div>
            </section>
          )}

          {/* Grouped by frequency */}
          {(['daily', 'weekly', 'monthly'] as const).map(freq => {
            const items = checklist[freq]
            if (items.length === 0) return null
            return (
              <section key={freq}>
                <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <ClipboardCheck size={16} />
                  {FREQ_LABELS[freq]} ({items.length}件)
                </h2>
                <div className="space-y-2">
                  {items.map(item => (
                    <ChecklistItem key={item.id} item={item} onChecked={handleItemChecked} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

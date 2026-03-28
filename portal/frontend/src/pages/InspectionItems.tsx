import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { ClipboardCheck, AlertTriangle, CheckCircle, Info, Printer, ChevronDown, ChevronUp } from 'lucide-react'
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

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const map: Record<string, string> = {
    normal: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    caution: 'bg-amber-50 text-amber-700 border border-amber-200',
    warning: 'bg-rose-50 text-rose-700 border border-rose-200',
  }
  const label = (t(`inspection.status.${status}` as any) || status) as string
  return (
    <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium', map[status] || 'bg-gray-50 text-gray-600 border border-gray-200')}>
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

  const isWarning = item.is_recommended || item.status === 'warning'

  return (
    <div className={clsx(
      'bg-white rounded-2xl border shadow-sm transition-all duration-150 overflow-hidden',
      isWarning
        ? 'border-rose-100 border-l-2 border-l-rose-500'
        : 'border-gray-100 border-l-2 border-l-gray-200',
    )}>
      <div className={clsx('px-5 py-4', isWarning && 'bg-rose-50/40')}>
        <div className="flex items-start gap-4">
          {/* Status icon */}
          <div className="flex-shrink-0 mt-0.5">
            {item.status === 'normal' && <CheckCircle size={16} className="text-emerald-500" />}
            {item.status === 'caution' && <AlertTriangle size={16} className="text-amber-500" />}
            {item.status === 'warning' && <AlertTriangle size={16} className="text-rose-500" />}
            {!['normal','caution','warning'].includes(item.status) && <Info size={16} className="text-gray-400" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="font-semibold text-sm text-gray-800">{name}</span>
              {item.is_recommended && (
                <span className="bg-rose-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">要注意</span>
              )}
              <StatusBadge status={item.status} />
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500 mb-3">
              <div>
                <span className="text-gray-400">{t('inspection.category')}:</span>
                <span className="ml-1 text-gray-600">{item.category}</span>
              </div>
              {item.normal_range && (
                <div>
                  <span className="text-gray-400">{t('inspection.normalRange')}:</span>
                  <span className="ml-1 text-gray-600 font-mono">{item.normal_range}</span>
                </div>
              )}
              {item.current_value && (
                <div>
                  <span className="text-gray-400">{t('inspection.currentValue')}:</span>
                  <span className={clsx(
                    'ml-1 font-semibold font-mono',
                    item.status === 'warning' ? 'text-rose-600' : item.status === 'caution' ? 'text-amber-600' : 'text-gray-700'
                  )}>
                    {item.current_value}
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-400">{t('inspection.lastChecked')}:</span>
                <span className="ml-1 text-gray-500">
                  {item.last_checked
                    ? new Date(item.last_checked).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : t('inspection.notChecked')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleCheck}
                disabled={checking}
                className="flex items-center gap-1.5 text-xs bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg transition-colors disabled:bg-gray-400 font-medium"
              >
                <CheckCircle size={11} />
                {t('inspection.checkNow')}
              </button>
              {method && (
                <button
                  onClick={() => setShowMethod(!showMethod)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Info size={11} />
                  {t('inspection.method')}
                  {showMethod ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
              )}
            </div>

            {showMethod && method && (
              <div className="mt-2.5 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 leading-relaxed border border-gray-100">
                {method}
              </div>
            )}
          </div>
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

  const FREQ_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    daily: { label: t('inspection.frequency.daily'), color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
    weekly: { label: t('inspection.frequency.weekly'), color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    monthly: { label: t('inspection.frequency.monthly'), color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200' },
  }

  return (
    <div className="p-8 animate-fade-in max-w-5xl" ref={printRef}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('inspection.title')}</h1>
          <p className="text-gray-400 mt-1 text-sm">推奨点検項目・チェックリスト</p>
        </div>
        {selectedDevice && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Printer size={15} />
            {t('inspection.printChecklist')}
          </button>
        )}
      </div>

      {/* Device selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{t('inspection.deviceSelector')}</label>
        <div className="flex gap-2.5 flex-wrap">
          {DEVICES.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDevice(d)}
              className={clsx(
                'px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 border',
                selectedDevice === d
                  ? 'bg-rose-600 border-rose-600 text-white shadow-sm shadow-rose-200'
                  : 'border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-600 bg-white'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {!selectedDevice ? (
        <div className="text-center py-20 text-gray-400">
          <ClipboardCheck size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">{t('inspection.selectDevice')}</p>
          <p className="text-xs mt-1">上からデバイスを選択してください</p>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : checklist ? (
        <div className="space-y-8">
          {/* Warning items */}
          {warningItems.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={15} className="text-rose-600" />
                <h2 className="text-sm font-semibold text-rose-700">{t('inspection.recommendedItems')}</h2>
                <span className="text-xs bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full font-medium">{warningItems.length}</span>
              </div>
              <div className="space-y-2.5">
                {warningItems.map(item => (
                  <ChecklistItem key={item.id} item={item} onChecked={handleItemChecked} />
                ))}
              </div>
            </section>
          )}

          {/* By frequency */}
          {(['daily', 'weekly', 'monthly'] as const).map(freq => {
            const items = checklist[freq]
            if (items.length === 0) return null
            const fc = FREQ_CONFIG[freq]
            return (
              <section key={freq}>
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardCheck size={15} className={fc.color} />
                  <h2 className="text-sm font-semibold text-gray-700">{fc.label}</h2>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium border', fc.bg, fc.color)}>
                    {items.length}件
                  </span>
                </div>
                <div className="space-y-2.5">
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

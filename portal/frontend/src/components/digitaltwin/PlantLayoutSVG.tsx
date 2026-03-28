import { useState } from 'react'

interface PlantLayoutProps {
  inspectionItems: Array<{
    id: number
    item_name_ja: string
    category: string
    status: string
    frequency: string
  }>
  selectedItemId: number | null
  onZoneClick: (zone: string) => void
  activeZone: string | null
}

interface ZoneDef {
  key: string
  label: string
  x: number
  y: number
  w: number
  h: number
  rx: number
  categoryKeywords: string[]
}

const ZONES: ZoneDef[] = [
  { key: 'filter', label: '入口フィルター', x: 50, y: 220, w: 120, h: 80, rx: 6, categoryKeywords: ['フィルター', 'Filter', '入口', 'Inlet'] },
  { key: 'driver', label: '原動機', x: 170, y: 230, w: 80, h: 130, rx: 6, categoryKeywords: ['原動機', 'Motor', 'Driver', 'エンジン'] },
  { key: 'compressor', label: '圧縮機ユニット', x: 250, y: 200, w: 300, h: 180, rx: 10, categoryKeywords: ['圧縮機', 'Compressor', 'インペラ', 'ケーシング', '本体'] },
  { key: 'cooler', label: '冷却器', x: 580, y: 250, w: 120, h: 100, rx: 6, categoryKeywords: ['冷却', 'Cooler', 'クーラー'] },
  { key: 'control', label: '制御盤', x: 600, y: 150, w: 100, h: 100, rx: 6, categoryKeywords: ['制御', 'Control', '計装', '電気'] },
  { key: 'luboil', label: '潤滑油システム', x: 250, y: 430, w: 150, h: 80, rx: 6, categoryKeywords: ['潤滑', 'Lube', 'Oil', 'オイル'] },
  { key: 'seal', label: 'シールガス', x: 430, y: 430, w: 100, h: 80, rx: 6, categoryKeywords: ['シール', 'Seal', 'ガス'] },
]

function getWorstStatus(items: PlantLayoutProps['inspectionItems']): string {
  if (items.some(i => i.status === 'warning')) return 'warning'
  if (items.some(i => i.status === 'caution')) return 'caution'
  if (items.length > 0) return 'normal'
  return 'unknown'
}

function statusDot(s: string) {
  if (s === 'warning') return '#ef4444'
  if (s === 'caution') return '#f59e0b'
  if (s === 'normal') return '#10b981'
  return '#d1d5db'
}

export default function PlantLayoutSVG({ inspectionItems, selectedItemId: _selectedItemId, onZoneClick, activeZone }: PlantLayoutProps) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">プラントレイアウト (上面図)</h3>
        {activeZone && (
          <button onClick={() => onZoneClick('')} className="text-xs text-red-600 hover:underline">
            フィルター解除
          </button>
        )}
      </div>
      <svg
        viewBox="0 0 760 560"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label="プラントレイアウト図"
      >
        {/* Background */}
        <rect x="0" y="0" width="760" height="560" fill="#f8fafc" />

        {/* Grid lines */}
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 70} x2="760" y2={i * 70} stroke="#e2e8f0" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 11 }, (_, i) => (
          <line key={`v${i}`} x1={i * 76} y1="0" x2={i * 76} y2="560" stroke="#e2e8f0" strokeWidth="0.5" />
        ))}

        {/* ─── Piping ─── */}
        {/* Inlet pipe: filter → compressor */}
        <line x1="170" y1="260" x2="250" y2="260" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round" />
        <line x1="170" y1="260" x2="250" y2="260" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
        {/* Driver → compressor coupling */}
        <line x1="250" y1="295" x2="250" y2="295" stroke="#94a3b8" strokeWidth="6" />
        {/* Discharge pipe: compressor → cooler */}
        <line x1="550" y1="290" x2="580" y2="290" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round" />
        <line x1="550" y1="290" x2="580" y2="290" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
        {/* Outlet from cooler */}
        <line x1="700" y1="290" x2="740" y2="290" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round" />
        <line x1="700" y1="290" x2="740" y2="290" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
        {/* Control → compressor (signal line) */}
        <line x1="600" y1="200" x2="550" y2="250" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 3" />
        {/* Lube oil → compressor */}
        <line x1="350" y1="430" x2="350" y2="380" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 3" />
        {/* Seal gas → compressor */}
        <line x1="480" y1="430" x2="450" y2="380" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 3" />

        {/* Flow arrows on main process line */}
        {/* Arrow inlet */}
        <polygon points="208,255 220,260 208,265" fill="#64748b" />
        {/* Arrow discharge */}
        <polygon points="565,285 577,290 565,295" fill="#64748b" />

        {/* ─── Zones ─── */}
        {ZONES.map(zone => {
          const zoneItems = inspectionItems.filter(item =>
            zone.categoryKeywords.some(kw => item.category.includes(kw) || item.item_name_ja.includes(kw))
          )
          const worst = getWorstStatus(zoneItems)
          const isActive = activeZone === zone.key
          const isHovered = hoveredZone === zone.key

          let fill = '#f1f5f9'
          let stroke = '#94a3b8'
          let strokeWidth = 1.5
          if (isActive) {
            fill = '#ffe4e6'
            stroke = '#e11d48'
            strokeWidth = 2.5
          } else if (isHovered) {
            fill = '#dbeafe'
            stroke = '#3b82f6'
            strokeWidth = 2
          }

          return (
            <g
              key={zone.key}
              style={{ cursor: 'pointer' }}
              onClick={() => onZoneClick(isActive ? '' : zone.key)}
              onMouseEnter={() => setHoveredZone(zone.key)}
              onMouseLeave={() => setHoveredZone(null)}
            >
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.w}
                height={zone.h}
                rx={zone.rx}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
              />
              {/* Zone label */}
              <text
                x={zone.x + zone.w / 2}
                y={zone.y + zone.h / 2 - 6}
                textAnchor="middle"
                fill={isActive ? '#9f1239' : '#374151'}
                fontSize="11"
                fontWeight={isActive ? 'bold' : '600'}
                fontFamily="sans-serif"
              >
                {zone.label}
              </text>
              {zoneItems.length > 0 && (
                <text
                  x={zone.x + zone.w / 2}
                  y={zone.y + zone.h / 2 + 10}
                  textAnchor="middle"
                  fill="#6b7280"
                  fontSize="9"
                  fontFamily="sans-serif"
                >
                  {zoneItems.length}件
                </text>
              )}
              {/* Status indicator dot */}
              <circle cx={zone.x + zone.w - 10} cy={zone.y + 10} r="6" fill={statusDot(worst)} stroke="white" strokeWidth="1.5" />
            </g>
          )
        })}

        {/* ─── Outlet arrow at right edge ─── */}
        <polygon points="740,285 752,290 740,295" fill="#475569" />
        <text x="748" y="285" fill="#374151" fontSize="9" fontFamily="sans-serif">OUT</text>

        {/* ─── Inlet label ─── */}
        <text x="10" y="264" fill="#374151" fontSize="9" fontFamily="sans-serif" fontWeight="600">IN →</text>

        {/* ─── Legend ─── */}
        <g transform="translate(30, 505)">
          <text x="0" y="0" fill="#374151" fontSize="10" fontWeight="bold" fontFamily="sans-serif">ステータス凡例:</text>
          <circle cx="90" cy="-4" r="5" fill="#10b981" />
          <text x="98" y="0" fill="#374151" fontSize="9" fontFamily="sans-serif">正常</text>
          <circle cx="140" cy="-4" r="5" fill="#f59e0b" />
          <text x="148" y="0" fill="#374151" fontSize="9" fontFamily="sans-serif">注意</text>
          <circle cx="190" cy="-4" r="5" fill="#ef4444" />
          <text x="198" y="0" fill="#374151" fontSize="9" fontFamily="sans-serif">警告</text>
          <circle cx="240" cy="-4" r="5" fill="#d1d5db" />
          <text x="248" y="0" fill="#374151" fontSize="9" fontFamily="sans-serif">データなし</text>
          <rect x="330" y="-12" width="16" height="10" rx="2" fill="#ffe4e6" stroke="#e11d48" strokeWidth="1.5" />
          <text x="350" y="0" fill="#374151" fontSize="9" fontFamily="sans-serif">選択中</text>
          <text x="450" y="0" fill="#6366f1" fontSize="9" fontFamily="sans-serif">--- 信号線</text>
          <text x="540" y="0" fill="#f59e0b" fontSize="9" fontFamily="sans-serif">--- 潤滑油</text>
          <text x="620" y="0" fill="#8b5cf6" fontSize="9" fontFamily="sans-serif">--- シールガス</text>
        </g>
      </svg>
    </div>
  )
}

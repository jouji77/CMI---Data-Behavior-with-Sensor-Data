import { useState } from 'react'

interface CompressorCrossSectionProps {
  sensorData: {
    inlet_pressure: number
    outlet_pressure: number
    inlet_temp: number
    outlet_temp: number
    vibration: number
    rpm: number
    efficiency: number
    status: string
  } | null
  onHotspotClick?: (sensor: string) => void
}

interface HotspotDef {
  key: string
  label: string
  unit: string
  cx: number
  cy: number
  getValue: (d: NonNullable<CompressorCrossSectionProps['sensorData']>) => number
  warning: number
  alarm: number
  lowerBetter?: boolean
}

const HOTSPOTS: HotspotDef[] = [
  { key: 'inlet_pressure', label: '入口圧力', unit: 'bara', cx: 80, cy: 235, getValue: d => d.inlet_pressure, warning: 0.8, alarm: 0.5, lowerBetter: true },
  { key: 'inlet_temp', label: '入口温度', unit: '°C', cx: 80, cy: 275, getValue: d => d.inlet_temp, warning: 60, alarm: 80 },
  { key: 'outlet_pressure', label: '出口圧力', unit: 'bara', cx: 515, cy: 60, getValue: d => d.outlet_pressure, warning: 8, alarm: 9 },
  { key: 'outlet_temp', label: '出口温度', unit: '°C', cx: 560, cy: 105, getValue: d => d.outlet_temp, warning: 180, alarm: 200 },
  { key: 'vibration', label: '振動', unit: 'mm/s', cx: 350, cy: 440, getValue: d => d.vibration, warning: 7, alarm: 10 },
  { key: 'rpm', label: '回転数', unit: 'rpm', cx: 350, cy: 280, getValue: d => d.rpm, warning: 12000, alarm: 13000 },
  { key: 'efficiency', label: '効率', unit: '%', cx: 460, cy: 240, getValue: d => d.efficiency, warning: 74, alarm: 70, lowerBetter: true },
]

function getHotspotColor(val: number, warning: number, alarm: number, lowerBetter?: boolean): string {
  if (lowerBetter) {
    if (val <= alarm) return '#ef4444'
    if (val <= warning) return '#f59e0b'
    return '#10b981'
  }
  if (val >= alarm) return '#ef4444'
  if (val >= warning) return '#f59e0b'
  return '#10b981'
}

function getHotspotState(val: number, warning: number, alarm: number, lowerBetter?: boolean): 'normal' | 'warning' | 'alarm' {
  if (lowerBetter) {
    if (val <= alarm) return 'alarm'
    if (val <= warning) return 'warning'
    return 'normal'
  }
  if (val >= alarm) return 'alarm'
  if (val >= warning) return 'warning'
  return 'normal'
}

export default function CompressorCrossSection({ sensorData, onHotspotClick }: CompressorCrossSectionProps) {
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null)

  const status = sensorData?.status || 'normal'
  const isRunning = status === 'normal'

  const statusBanner = status === 'alarm'
    ? { text: '異常停止', fill: '#ef4444', textFill: '#fff' }
    : status === 'warning'
    ? { text: '警告', fill: '#f59e0b', textFill: '#fff' }
    : { text: '正常運転中', fill: '#10b981', textFill: '#fff' }

  const impellerBlades = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2
    const innerR = 38
    const outerR = 115
    const sweep = 0.35
    const x1 = 350 + innerR * Math.cos(angle)
    const y1 = 280 + innerR * Math.sin(angle)
    const x2 = 350 + outerR * Math.cos(angle + sweep)
    const y2 = 280 + outerR * Math.sin(angle + sweep)
    const x3 = 350 + (outerR - 18) * Math.cos(angle + sweep + 0.2)
    const y3 = 280 + (outerR - 18) * Math.sin(angle + sweep + 0.2)
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${x2.toFixed(1)} ${y2.toFixed(1)} ${x3.toFixed(1)} ${y3.toFixed(1)}`
  })

  const diffuserVanes = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2
    const r1 = 125
    const r2 = 155
    return {
      x1: (350 + r1 * Math.cos(angle)).toFixed(1),
      y1: (280 + r1 * Math.sin(angle)).toFixed(1),
      x2: (350 + r2 * Math.cos(angle + 0.15)).toFixed(1),
      y2: (280 + r2 * Math.sin(angle + 0.15)).toFixed(1),
    }
  })

  const hovered = hoveredHotspot ? HOTSPOTS.find(h => h.key === hoveredHotspot) : null
  const hoveredVal = hovered && sensorData ? hovered.getValue(sensorData) : null

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-ring { 0%, 100% { r: 26; opacity: 0.8; } 50% { r: 32; opacity: 0; } }
        .impeller-spin { transform-origin: 350px 280px; animation: spin-slow 3s linear infinite; }
        .alarm-pulse { animation: pulse-ring 1.2s ease-in-out infinite; }
      `}</style>
      <svg
        viewBox="0 0 700 500"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label="遠心圧縮機断面図"
      >
        {/* Status banner */}
        <rect x="0" y="0" width="700" height="32" fill={statusBanner.fill} />
        <text x="350" y="21" textAnchor="middle" fill={statusBanner.textFill} fontSize="13" fontWeight="bold" fontFamily="sans-serif">
          {statusBanner.text}
        </text>

        {/* ─── Casing / Volute ─── */}
        <ellipse cx="370" cy="275" rx="190" ry="175" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="3" />
        {/* Inner volute scroll */}
        <ellipse cx="370" cy="275" rx="158" ry="145" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />

        {/* ─── Inlet nozzle ─── */}
        <rect x="0" y="213" width="195" height="50" rx="4" fill="#d1d5db" stroke="#9ca3af" strokeWidth="2" />
        {/* Inlet guide vanes */}
        {[228, 238, 248, 258].map((y, i) => (
          <line key={i} x1="30" y1={y} x2="60" y2={y} stroke="#6b7280" strokeWidth="1.5" />
        ))}
        <text x="90" y="244" textAnchor="middle" fill="#374151" fontSize="10" fontFamily="sans-serif" fontWeight="600">入口ノズル</text>

        {/* ─── Outlet nozzle (top-right) ─── */}
        <rect x="492" y="38" width="48" height="130" rx="4" fill="#d1d5db" stroke="#9ca3af" strokeWidth="2" />
        <text x="516" y="115" textAnchor="middle" fill="#374151" fontSize="9" fontFamily="sans-serif" fontWeight="600" transform="rotate(-90, 516, 115)">出口ノズル</text>

        {/* ─── Diffuser ring ─── */}
        <circle cx="350" cy="280" r="158" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
        {diffuserVanes.map((v, i) => (
          <line key={i} x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2} stroke="#64748b" strokeWidth="1.5" />
        ))}

        {/* ─── Impeller group (optionally animated) ─── */}
        <g className={isRunning ? 'impeller-spin' : ''}>
          <circle cx="350" cy="280" r="120" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="2" opacity="0.85" />
          {impellerBlades.map((d, i) => (
            <path key={i} d={d} stroke="#1d4ed8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          ))}
        </g>

        {/* ─── Hub ─── */}
        <circle cx="350" cy="280" r="35" fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="2" />
        <circle cx="350" cy="280" r="12" fill="#93c5fd" />

        {/* ─── Shaft ─── */}
        <rect x="342" y="315" width="16" height="120" fill="#475569" stroke="#334155" strokeWidth="1" />

        {/* ─── Drive-end bearing housing ─── */}
        <rect x="308" y="400" width="84" height="38" rx="5" fill="#94a3b8" stroke="#64748b" strokeWidth="2" />
        <rect x="319" y="406" width="62" height="10" rx="2" fill="#cbd5e1" stroke="#9ca3af" strokeWidth="1" />
        <rect x="319" y="420" width="62" height="10" rx="2" fill="#cbd5e1" stroke="#9ca3af" strokeWidth="1" />
        <text x="350" y="448" textAnchor="middle" fill="#374151" fontSize="9" fontFamily="sans-serif">軸受ハウジング(DE)</text>

        {/* ─── Non-drive-end bearing (opposite side) ─── */}
        <rect x="180" y="260" width="30" height="48" rx="3" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5" />
        <text x="195" y="320" textAnchor="middle" fill="#374151" fontSize="8" fontFamily="sans-serif">軸受(NDE)</text>

        {/* ─── Mechanical seal ─── */}
        <rect x="338" y="312" width="24" height="10" rx="2" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
        <text x="310" y="308" textAnchor="middle" fill="#92400e" fontSize="8" fontFamily="sans-serif">メカシール</text>

        {/* ─── Coupling ─── */}
        <rect x="338" y="430" width="24" height="20" rx="3" fill="#64748b" stroke="#475569" strokeWidth="1.5" />
        <rect x="334" y="450" width="32" height="14" rx="3" fill="#475569" stroke="#334155" strokeWidth="1.5" />
        <text x="350" y="478" textAnchor="middle" fill="#374151" fontSize="9" fontFamily="sans-serif">カップリング</text>

        {/* ─── Labels ─── */}
        <text x="370" y="170" textAnchor="middle" fill="#1e40af" fontSize="11" fontFamily="sans-serif" fontWeight="600">インペラ</text>
        <text x="440" y="185" textAnchor="middle" fill="#475569" fontSize="10" fontFamily="sans-serif">ディフューザー</text>
        <text x="540" y="200" textAnchor="middle" fill="#374151" fontSize="10" fontFamily="sans-serif">ボリュート</text>

        {/* ─── Hotspots ─── */}
        {sensorData && HOTSPOTS.map(hp => {
          const val = hp.getValue(sensorData)
          const color = getHotspotColor(val, hp.warning, hp.alarm, hp.lowerBetter)
          const state = getHotspotState(val, hp.warning, hp.alarm, hp.lowerBetter)
          const isHovered = hoveredHotspot === hp.key

          return (
            <g
              key={hp.key}
              style={{ cursor: 'pointer' }}
              onClick={() => onHotspotClick?.(hp.key)}
              onMouseEnter={() => setHoveredHotspot(hp.key)}
              onMouseLeave={() => setHoveredHotspot(null)}
            >
              {/* Alarm pulsing ring */}
              {state === 'alarm' && (
                <circle cx={hp.cx} cy={hp.cy} r="26" fill="none" stroke={color} strokeWidth="2" opacity="0.6" className="alarm-pulse" />
              )}
              {/* Background circle */}
              <circle cx={hp.cx} cy={hp.cy} r="22" fill={color} stroke="white" strokeWidth="2" opacity={isHovered ? 1 : 0.92} />
              {/* Value text */}
              <text x={hp.cx} y={hp.cy - 3} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
                {val < 1000 ? val.toFixed(1) : Math.round(val)}
              </text>
              <text x={hp.cx} y={hp.cy + 8} textAnchor="middle" fill="white" fontSize="7" fontFamily="sans-serif">
                {hp.unit}
              </text>
              {/* Label */}
              <text x={hp.cx} y={hp.cy + 34} textAnchor="middle" fill="#374151" fontSize="9" fontFamily="sans-serif" fontWeight="600">
                {hp.label}
              </text>
            </g>
          )
        })}

        {/* ─── Tooltip ─── */}
        {hovered && hoveredVal !== null && sensorData && (() => {
          const val = hovered.getValue(sensorData)
          const color = getHotspotColor(val, hovered.warning, hovered.alarm, hovered.lowerBetter)
          const state = getHotspotState(val, hovered.warning, hovered.alarm, hovered.lowerBetter)
          const stateLabel = state === 'alarm' ? '異常' : state === 'warning' ? '警告' : '正常'
          const tx = hovered.cx > 450 ? hovered.cx - 145 : hovered.cx + 30
          const ty = hovered.cy > 400 ? hovered.cy - 90 : hovered.cy - 10
          return (
            <g>
              <rect x={tx} y={ty} width="140" height="72" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1.5" filter="url(#shadow)" />
              <text x={tx + 10} y={ty + 18} fill="#374151" fontSize="11" fontWeight="bold" fontFamily="sans-serif">{hovered.label}</text>
              <text x={tx + 10} y={ty + 34} fill="#1e40af" fontSize="14" fontWeight="bold" fontFamily="sans-serif">
                {val < 1000 ? val.toFixed(2) : Math.round(val).toLocaleString()} {hovered.unit}
              </text>
              <rect x={tx + 10} y={ty + 46} width="60" height="16" rx="3" fill={color} />
              <text x={tx + 40} y={ty + 58} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">{stateLabel}</text>
              <text x={tx + 80} y={ty + 58} fill="#6b7280" fontSize="9" fontFamily="sans-serif">警告:{hovered.warning}</text>
            </g>
          )
        })()}

        {/* SVG filter for drop shadow on tooltip */}
        <defs>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="1" dy="2" stdDeviation="3" floodColor="#00000022" />
          </filter>
        </defs>

        {/* No data placeholder */}
        {!sensorData && (
          <>
            <rect x="200" y="220" width="300" height="60" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
            <text x="350" y="255" textAnchor="middle" fill="#94a3b8" fontSize="13" fontFamily="sans-serif">センサーデータを読み込み中...</text>
          </>
        )}
      </svg>
    </div>
  )
}

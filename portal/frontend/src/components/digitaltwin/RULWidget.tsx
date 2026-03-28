import { useMemo } from 'react'

interface RULWidgetProps {
  sensorData: {
    vibration: number
    efficiency: number
    rpm: number
    status: string
  } | null
}

function computeHealthScore(vibration: number, efficiency: number): number {
  // Vibration penalty: normal < 5, warning 5-10, alarm > 10
  const vibPenalty = vibration < 5 ? 0 : vibration < 7 ? (vibration - 5) * 5 : vibration < 10 ? 10 + (vibration - 7) * 8 : 40
  // Efficiency penalty: normal > 80, warning 74-80, alarm < 74
  const effPenalty = efficiency > 80 ? 0 : efficiency > 74 ? (80 - efficiency) * 2.5 : 15 + (74 - efficiency) * 4

  const score = Math.max(0, Math.min(100, 100 - vibPenalty - effPenalty))
  return Math.round(score)
}

function generateSparkline(score: number): number[] {
  // Simulate a 7-day trend ending at current score
  const points: number[] = []
  let s = Math.min(100, score + 8)
  for (let i = 0; i < 7; i++) {
    const delta = (i === 6 ? score - s : -(Math.random() * 2 - 0.5))
    s = i === 6 ? score : Math.max(0, Math.min(100, s + delta))
    points.push(Math.round(s))
  }
  points[6] = score
  return points
}

function healthColor(score: number): string {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
}

function healthLabel(score: number): string {
  if (score >= 80) return '良好'
  if (score >= 60) return '要注意'
  return '要整備'
}

function daysUntilMaintenance(score: number): number {
  if (score >= 90) return 180
  if (score >= 80) return 90
  if (score >= 70) return 45
  if (score >= 60) return 21
  if (score >= 50) return 7
  return 2
}

interface GaugeArcProps {
  score: number
  size?: number
}

function GaugeArc({ score, size = 140 }: GaugeArcProps) {
  const cx = size / 2
  const cy = size * 0.62
  const r = size * 0.42

  // Arc from 180deg to 0deg (left to right across top = 180 degrees)
  // angle: 0 score = 180deg (left), 100 = 0deg (right)
  const startAngleDeg = 180
  const endAngleDeg = 0
  const angleDeg = startAngleDeg + (endAngleDeg - startAngleDeg) * (score / 100)
  const angleRad = (angleDeg * Math.PI) / 180

  const needleX = cx + r * Math.cos(angleRad)
  const needleY = cy - r * Math.sin(Math.abs(angleRad - Math.PI))

  // Arc path for background (full semicircle)
  const bgStartX = cx - r
  const bgEndX = cx + r

  // Colored arc (from 180 to current angle)
  const color = healthColor(score)

  function arcPath(startDeg: number, endDeg: number, innerR: number, outerR: number): string {
    const toRad = (deg: number) => ((180 - deg) * Math.PI) / 180
    const sx1 = cx + outerR * Math.cos(toRad(startDeg))
    const sy1 = cy - outerR * Math.sin(toRad(startDeg))
    const ex1 = cx + outerR * Math.cos(toRad(endDeg))
    const ey1 = cy - outerR * Math.sin(toRad(endDeg))
    const sx2 = cx + innerR * Math.cos(toRad(endDeg))
    const sy2 = cy - innerR * Math.sin(toRad(endDeg))
    const ex2 = cx + innerR * Math.cos(toRad(startDeg))
    const ey2 = cy - innerR * Math.sin(toRad(startDeg))
    const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
    return `M ${sx1.toFixed(1)} ${sy1.toFixed(1)} A ${outerR} ${outerR} 0 ${large} 1 ${ex1.toFixed(1)} ${ey1.toFixed(1)} L ${sx2.toFixed(1)} ${sy2.toFixed(1)} A ${innerR} ${innerR} 0 ${large} 0 ${ex2.toFixed(1)} ${ey2.toFixed(1)} Z`
  }

  const outer = r
  const inner = r * 0.72

  // Needle tip position
  const needleTipX = cx + (r - 6) * Math.cos(angleRad)
  const needleTipY = cy - (r - 6) * Math.sin(Math.abs(angleRad - Math.PI))
  void needleX
  void needleY
  void bgStartX
  void bgEndX

  return (
    <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`} style={{ overflow: 'visible' }}>
      {/* Background arc: gray */}
      <path d={arcPath(0, 180, inner, outer)} fill="#e2e8f0" />
      {/* Colored arc: from 0 to score */}
      {score > 0 && <path d={arcPath(0, score * 1.8, inner, outer)} fill={color} opacity="0.9" />}
      {/* Zone markers */}
      <path d={arcPath(0, 60 * 1.8, inner, outer)} fill="#ef4444" opacity="0.25" />
      <path d={arcPath(60 * 1.8, 80 * 1.8, inner, outer)} fill="#f59e0b" opacity="0.25" />
      <path d={arcPath(80 * 1.8, 180, inner, outer)} fill="#10b981" opacity="0.25" />
      {/* Needle */}
      <line
        x1={cx.toFixed(1)}
        y1={cy.toFixed(1)}
        x2={needleTipX.toFixed(1)}
        y2={needleTipY.toFixed(1)}
        stroke="#1e293b"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="5" fill="#1e293b" />
      {/* Score text */}
      <text x={cx} y={cy - 8} textAnchor="middle" fill={color} fontSize="22" fontWeight="bold" fontFamily="sans-serif">
        {score}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="sans-serif">健全度スコア</text>
      {/* Labels */}
      <text x={cx - outer - 2} y={cy + 4} textAnchor="end" fill="#ef4444" fontSize="8" fontFamily="sans-serif">0</text>
      <text x={cx + outer + 2} y={cy + 4} textAnchor="start" fill="#10b981" fontSize="8" fontFamily="sans-serif">100</text>
    </svg>
  )
}

export default function RULWidget({ sensorData }: RULWidgetProps) {
  const score = useMemo(() => {
    if (!sensorData) return 85
    return computeHealthScore(sensorData.vibration, sensorData.efficiency)
  }, [sensorData])

  const sparkline = useMemo(() => generateSparkline(score), [score])
  const days = daysUntilMaintenance(score)
  const color = healthColor(score)
  const label = healthLabel(score)

  // Sparkline SVG points
  const sparkW = 160
  const sparkH = 36
  const minVal = Math.min(...sparkline)
  const maxVal = Math.max(...sparkline)
  const range = maxVal - minVal || 1
  const sparkPoints = sparkline.map((v, i) => {
    const x = (i / 6) * sparkW
    const y = sparkH - ((v - minVal) / range) * (sparkH - 6) - 3
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">予知保全 / 残存寿命 (RUL)</h3>

      <div className="flex flex-col items-center gap-4">
        {/* Gauge */}
        <GaugeArc score={score} size={160} />

        {/* Status badge */}
        <div
          className="px-4 py-1.5 rounded-full text-sm font-bold"
          style={{ backgroundColor: `${color}22`, color, border: `1.5px solid ${color}` }}
        >
          {label}
        </div>

        {/* Days until maintenance */}
        <div className="text-center">
          <p className="text-xs text-slate-500">推定次回メンテナンスまで</p>
          <p className="text-3xl font-bold" style={{ color }}>{days}<span className="text-base font-normal text-slate-500">日</span></p>
        </div>

        {/* Sparkline */}
        <div className="w-full">
          <p className="text-xs text-slate-400 mb-1">過去7日間の健全度トレンド</p>
          <svg width="100%" viewBox={`0 0 ${sparkW} ${sparkH}`} preserveAspectRatio="none" style={{ height: '36px' }}>
            <polyline
              points={sparkPoints}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Fill under */}
            <polygon
              points={`0,${sparkH} ${sparkPoints} ${sparkW},${sparkH}`}
              fill={color}
              opacity="0.12"
            />
            {/* Day labels */}
            {['月', '火', '水', '木', '金', '土', '日'].map((day, i) => (
              <text
                key={i}
                x={(i / 6) * sparkW}
                y={sparkH}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="7"
                fontFamily="sans-serif"
              >
                {day}
              </text>
            ))}
          </svg>
        </div>

        {/* Detail breakdown */}
        <div className="w-full space-y-2 text-xs border-t border-gray-100 pt-3">
          <div className="flex justify-between">
            <span className="text-slate-500">振動レベル</span>
            <span style={{ color: sensorData ? instrColorLocal(sensorData.vibration, 7, 10) : '#94a3b8' }} className="font-semibold">
              {sensorData ? `${sensorData.vibration.toFixed(2)} mm/s` : '--'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">効率</span>
            <span style={{ color: sensorData ? instrColorLocalLower(sensorData.efficiency, 74, 70) : '#94a3b8' }} className="font-semibold">
              {sensorData ? `${sensorData.efficiency.toFixed(1)} %` : '--'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">稼働状態</span>
            <span className="font-semibold text-slate-700">{sensorData?.status === 'normal' ? '正常稼働中' : sensorData?.status === 'warning' ? '警告中' : sensorData ? '異常停止' : '--'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function instrColorLocal(val: number, warn: number, alarm: number): string {
  if (val >= alarm) return '#ef4444'
  if (val >= warn) return '#f59e0b'
  return '#10b981'
}

function instrColorLocalLower(val: number, warn: number, alarm: number): string {
  if (val <= alarm) return '#ef4444'
  if (val <= warn) return '#f59e0b'
  return '#10b981'
}

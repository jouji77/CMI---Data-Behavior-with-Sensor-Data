import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceDot, ReferenceArea, ResponsiveContainer,
  ReferenceLine, Area,
} from 'recharts'

interface PerformanceCurveProps {
  currentFlow?: number
  currentHead?: number
  currentEfficiency?: number
  ratedFlow?: number
  ratedHead?: number
}

interface CurvePoint {
  flow: number
  head: number
  efficiency: number
  eff75?: number
  eff80?: number
  eff85?: number
}

function generateCurveData(
  ratedFlow: number,
  ratedHead: number
): CurvePoint[] {
  const qMax = ratedFlow * 1.3
  const hShutoff = ratedHead * 1.25
  const points: CurvePoint[] = []

  for (let i = 0; i <= 24; i++) {
    const q = (i / 24) * qMax
    // Head curve: H = H_shutoff * (1 - 0.8*(q/qMax)^2) — quadratic droop
    const head = hShutoff * (1 - 0.8 * Math.pow(q / qMax, 2))

    // Efficiency: bell curve peaking at 95% of ratedFlow
    const qPeak = ratedFlow * 0.95
    const efficiency = 88 * Math.exp(-0.5 * Math.pow((q - qPeak) / (qMax * 0.32), 2))

    // Efficiency contour lines (iso-efficiency)
    const eff85 = q > ratedFlow * 0.55 && q < ratedFlow * 1.2
      ? hShutoff * (1 - 0.8 * Math.pow(q / qMax, 2)) * (0.68 + 0.32 * Math.exp(-0.5 * Math.pow((q - qPeak) / (qMax * 0.35), 2)))
      : undefined
    const eff80 = q > ratedFlow * 0.35 && q < ratedFlow * 1.25
      ? hShutoff * (1 - 0.8 * Math.pow(q / qMax, 2)) * (0.55 + 0.45 * Math.exp(-0.5 * Math.pow((q - qPeak) / (qMax * 0.42), 2)))
      : undefined
    const eff75 = q > ratedFlow * 0.2 && q < ratedFlow * 1.28
      ? hShutoff * (1 - 0.8 * Math.pow(q / qMax, 2)) * (0.45 + 0.55 * Math.exp(-0.5 * Math.pow((q - qPeak) / (qMax * 0.52), 2)))
      : undefined

    points.push({
      flow: parseFloat(q.toFixed(2)),
      head: parseFloat(head.toFixed(1)),
      efficiency: parseFloat(Math.max(0, efficiency).toFixed(1)),
      eff75: eff75 !== undefined ? parseFloat(eff75.toFixed(1)) : undefined,
      eff80: eff80 !== undefined ? parseFloat(eff80.toFixed(1)) : undefined,
      eff85: eff85 !== undefined ? parseFloat(eff85.toFixed(1)) : undefined,
    })
  }
  return points
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: number
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-bold text-gray-700 mb-1">流量: {Number(label).toFixed(2)} kg/s</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span style={{ color: p.color }}>■</span>
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold text-gray-800">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function PerformanceCurve({
  currentFlow = 12.5,
  currentHead = 180,
  currentEfficiency = 82,
  ratedFlow = 14,
  ratedHead = 200,
}: PerformanceCurveProps) {
  const data = generateCurveData(ratedFlow, ratedHead)
  const qMax = ratedFlow * 1.3
  const surgeFlow = ratedFlow * 0.6
  const stonewallFlow = ratedFlow * 1.2
  const hShutoff = ratedHead * 1.25

  // Surge margin
  const surgePct = currentFlow > 0 ? ((currentFlow - surgeFlow) / currentFlow * 100).toFixed(0) : '0'

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">圧縮機性能マップ</h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>サージマージン: <strong className="text-green-600">{surgePct}%</strong></span>
          <span>効率: <strong className="text-blue-600">{currentEfficiency?.toFixed(1)}%</strong></span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

          <XAxis
            dataKey="flow"
            type="number"
            domain={[0, qMax]}
            label={{ value: '流量 (kg/s)', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#64748b' }}
            tick={{ fontSize: 10 }}
          />

          <YAxis
            yAxisId="head"
            domain={[0, hShutoff * 1.1]}
            label={{ value: '多変ヘッド (kJ/kg)', angle: -90, position: 'insideLeft', offset: 15, fontSize: 10, fill: '#64748b' }}
            tick={{ fontSize: 10 }}
          />

          <YAxis
            yAxisId="eff"
            orientation="right"
            domain={[0, 100]}
            label={{ value: '効率 (%)', angle: 90, position: 'insideRight', offset: 10, fontSize: 10, fill: '#64748b' }}
            tick={{ fontSize: 10 }}
          />

          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />

          {/* Operating range shaded band */}
          <ReferenceArea
            yAxisId="head"
            x1={surgeFlow}
            x2={stonewallFlow}
            fill="#f0fdf4"
            fillOpacity={0.6}
            stroke="none"
          />

          {/* Surge line */}
          <ReferenceLine
            yAxisId="head"
            x={surgeFlow}
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="6 3"
            label={{ value: 'サージ', position: 'top', fontSize: 9, fill: '#ef4444' }}
          />

          {/* Stonewall line */}
          <ReferenceLine
            yAxisId="head"
            x={stonewallFlow}
            stroke="#f97316"
            strokeWidth={2}
            strokeDasharray="6 3"
            label={{ value: 'ストーンウォール', position: 'top', fontSize: 9, fill: '#f97316' }}
          />

          {/* Efficiency contour lines */}
          <Line
            yAxisId="head"
            type="monotone"
            dataKey="eff75"
            name="η=75% 等効率線"
            stroke="#86efac"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 2"
            connectNulls={false}
          />
          <Line
            yAxisId="head"
            type="monotone"
            dataKey="eff80"
            name="η=80% 等効率線"
            stroke="#4ade80"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 2"
            connectNulls={false}
          />
          <Line
            yAxisId="head"
            type="monotone"
            dataKey="eff85"
            name="η=85% 等効率線"
            stroke="#16a34a"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 2"
            connectNulls={false}
          />

          {/* Efficiency curve on right axis */}
          <Area
            yAxisId="eff"
            type="monotone"
            dataKey="efficiency"
            name="効率 (%)"
            stroke="#10b981"
            fill="#d1fae5"
            fillOpacity={0.3}
            strokeWidth={2}
            dot={false}
          />

          {/* Head curve */}
          <Line
            yAxisId="head"
            type="monotone"
            dataKey="head"
            name="多変ヘッド (kJ/kg)"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={false}
          />

          {/* Rated operating point */}
          <ReferenceDot
            yAxisId="head"
            x={ratedFlow}
            y={ratedHead}
            r={6}
            fill="none"
            stroke="#1e293b"
            strokeWidth={2.5}
            label={{ value: '定格点', position: 'top', fontSize: 9, fill: '#1e293b' }}
          />

          {/* Current operating point */}
          <ReferenceDot
            yAxisId="head"
            x={currentFlow}
            y={currentHead}
            r={8}
            fill="#ef4444"
            stroke="white"
            strokeWidth={2}
            label={{ value: '現在点', position: 'insideTopLeft', fontSize: 9, fill: '#ef4444' }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Bottom info bar */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 border-t border-gray-100 pt-3">
        <div>現在流量: <strong className="text-blue-700">{currentFlow.toFixed(1)} kg/s</strong></div>
        <div>現在ヘッド: <strong className="text-blue-700">{currentHead.toFixed(0)} kJ/kg</strong></div>
        <div>効率: <strong className="text-green-700">{currentEfficiency?.toFixed(1)} %</strong></div>
        <div>定格流量: <strong className="text-slate-700">{ratedFlow.toFixed(1)} kg/s</strong></div>
        <div>定格ヘッド: <strong className="text-slate-700">{ratedHead.toFixed(0)} kJ/kg</strong></div>
      </div>
    </div>
  )
}

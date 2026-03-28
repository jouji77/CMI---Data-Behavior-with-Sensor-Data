interface PIDDiagramProps {
  sensorData: {
    inlet_pressure: number
    outlet_pressure: number
    inlet_temp: number
    outlet_temp: number
    vibration: number
    rpm: number
    status: string
  } | null
}

function instrColor(val: number, warn: number, alarm: number, lowerBetter = false): string {
  if (lowerBetter) {
    if (val <= alarm) return '#ef4444'
    if (val <= warn) return '#f59e0b'
    return '#10b981'
  }
  if (val >= alarm) return '#ef4444'
  if (val >= warn) return '#f59e0b'
  return '#10b981'
}

interface InstrBoxProps {
  x: number
  y: number
  tag: string
  label: string
  value: string
  color: string
}

function InstrBox({ x, y, tag, label, value, color }: InstrBoxProps) {
  return (
    <g>
      {/* Instrument circle (ISA standard) */}
      <circle cx={x} cy={y} r="16" fill="white" stroke="#475569" strokeWidth="1.5" />
      <text x={x} y={y - 4} textAnchor="middle" fill="#1e293b" fontSize="8" fontWeight="bold" fontFamily="sans-serif">{tag}</text>
      <text x={x} y={y + 6} textAnchor="middle" fill="#475569" fontSize="7" fontFamily="sans-serif">{label.substring(0, 4)}</text>
      {/* Value box */}
      <rect x={x - 22} y={y + 18} width="44" height="16" rx="3" fill={color} />
      <text x={x} y={y + 30} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">{value}</text>
    </g>
  )
}

interface ControlValveProps {
  x: number
  y: number
}
function ControlValve({ x, y }: ControlValveProps) {
  return (
    <g>
      {/* Body */}
      <polygon points={`${x},${y-10} ${x+12},${y} ${x},${y+10} ${x-12},${y}`} fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
      {/* Actuator stem */}
      <line x1={x} y1={y - 10} x2={x} y2={y - 24} stroke="#475569" strokeWidth="1.5" />
      {/* Actuator circle */}
      <circle cx={x} cy={y - 30} r="8" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" />
      <text x={x} y={y - 27} textAnchor="middle" fill="#475569" fontSize="7" fontFamily="sans-serif">FC</text>
    </g>
  )
}

interface CheckValveProps {
  x: number
  y: number
}
function CheckValve({ x, y }: CheckValveProps) {
  return (
    <g>
      <polygon points={`${x-10},${y-10} ${x+10},${y} ${x-10},${y+10}`} fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" />
      <line x1={x + 10} y1={y - 10} x2={x + 10} y2={y + 10} stroke="#3b82f6" strokeWidth="2" />
    </g>
  )
}

interface ReliefValveProps {
  x: number
  y: number
}
function ReliefValve({ x, y }: ReliefValveProps) {
  return (
    <g>
      {/* Body */}
      <rect x={x - 8} y={y - 8} width="16" height="16" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5" />
      {/* Pop indicator */}
      <line x1={x} y1={y - 8} x2={x} y2={y - 22} stroke="#dc2626" strokeWidth="1.5" />
      <polygon points={`${x - 5},${y - 22} ${x + 5},${y - 22} ${x},${y - 30}`} fill="#ef4444" stroke="#dc2626" strokeWidth="1" />
      <text x={x} y={y + 22} textAnchor="middle" fill="#dc2626" fontSize="7" fontFamily="sans-serif">PSV</text>
    </g>
  )
}

interface FilterSymbolProps {
  x: number
  y: number
}
function FilterSymbol({ x, y }: FilterSymbolProps) {
  return (
    <g>
      <circle cx={x} cy={y} r="22" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.5" />
      {/* Diagonal stripes */}
      {[-10, -3, 4, 11].map((offset, i) => (
        <line
          key={i}
          x1={x - 14 + offset}
          y1={y + 14}
          x2={x + 14 + offset}
          y2={y - 14}
          stroke="#16a34a"
          strokeWidth="1.5"
          clipPath={`url(#filter-clip-${x}-${y})`}
        />
      ))}
      <clipPath id={`filter-clip-${x}-${y}`}>
        <circle cx={x} cy={y} r="21" />
      </clipPath>
    </g>
  )
}

interface CompressorSymbolProps {
  x: number
  y: number
}
function CompressorSymbol({ x, y }: CompressorSymbolProps) {
  // P&ID standard centrifugal compressor symbol
  return (
    <g>
      {/* Main circle */}
      <circle cx={x} cy={y} r="38" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="2" />
      {/* Blade symbols */}
      {Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2
        const r1 = 14, r2 = 32
        const x1 = x + r1 * Math.cos(angle)
        const y1 = y + r1 * Math.sin(angle)
        const x2 = x + r2 * Math.cos(angle + 0.4)
        const y2 = y + r2 * Math.sin(angle + 0.4)
        return <line key={i} x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" />
      })}
      {/* Center hub */}
      <circle cx={x} cy={y} r="10" fill="#1d4ed8" />
      {/* "C" label */}
      <text x={x} y={y + 52} textAnchor="middle" fill="#1d4ed8" fontSize="11" fontWeight="bold" fontFamily="sans-serif">圧縮機</text>
    </g>
  )
}

export default function PIDDiagram({ sensorData }: PIDDiagramProps) {
  const d = sensorData

  const piInletColor = d ? instrColor(d.inlet_pressure, 0.8, 0.5, true) : '#94a3b8'
  const piOutletColor = d ? instrColor(d.outlet_pressure, 8, 9) : '#94a3b8'
  const tiInletColor = d ? instrColor(d.inlet_temp, 60, 80) : '#94a3b8'
  const tiOutletColor = d ? instrColor(d.outlet_temp, 180, 200) : '#94a3b8'
  const vtColor = d ? instrColor(d.vibration, 7, 10) : '#94a3b8'
  const stColor = d ? instrColor(d.rpm, 12000, 13000) : '#94a3b8'

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 overflow-hidden">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">P&ID ダイアグラム (簡略)</h3>
      <svg
        viewBox="0 0 900 600"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label="P&IDダイアグラム"
      >
        {/* Background */}
        <rect x="0" y="0" width="900" height="600" fill="#fafbfc" />

        {/* ─── Main process line (horizontal) ─── */}
        {/* Inlet pipe */}
        <line x1="10" y1="290" x2="130" y2="290" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
        {/* Filter to compressor */}
        <line x1="174" y1="290" x2="290" y2="290" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
        {/* Control valve to compressor */}
        <line x1="338" y1="290" x2="382" y2="290" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
        {/* Compressor outlet pipe */}
        <line x1="458" y1="290" x2="530" y2="290" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
        {/* Check valve to cooler */}
        <line x1="554" y1="290" x2="620" y2="290" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
        {/* Cooler to outlet */}
        <line x1="710" y1="290" x2="880" y2="290" stroke="#475569" strokeWidth="5" strokeLinecap="round" />

        {/* IN / OUT labels */}
        <polygon points="10,284 24,290 10,296" fill="#475569" />
        <text x="28" y="285" fill="#374151" fontSize="10" fontFamily="sans-serif" fontWeight="600">IN</text>
        <polygon points="880,284 866,290 880,296" fill="#475569" />
        <text x="860" y="308" fill="#374151" fontSize="10" fontFamily="sans-serif" fontWeight="600">OUT</text>

        {/* ─── Filter ─── */}
        <FilterSymbol x={152} y={290} />
        <text x="152" y="322" textAnchor="middle" fill="#16a34a" fontSize="9" fontFamily="sans-serif" fontWeight="600">F-101</text>

        {/* ─── Control valve ─── */}
        <ControlValve x={314} y={290} />
        <text x="314" y="322" textAnchor="middle" fill="#d97706" fontSize="9" fontFamily="sans-serif" fontWeight="600">FV-101</text>

        {/* ─── Compressor ─── */}
        <CompressorSymbol x={420} y={290} />
        <text x="420" y="254" textAnchor="middle" fill="#1e40af" fontSize="9" fontFamily="sans-serif">C-101</text>

        {/* ─── Check valve ─── */}
        <CheckValve x={542} y={290} />
        <text x="542" y="315" textAnchor="middle" fill="#3b82f6" fontSize="8" fontFamily="sans-serif">CV-101</text>

        {/* ─── Cooler ─── */}
        <rect x="620" y="265" width="90" height="50" rx="6" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.5" />
        <text x="665" y="287" textAnchor="middle" fill="#0c4a6e" fontSize="10" fontWeight="bold" fontFamily="sans-serif">E-101</text>
        <text x="665" y="302" textAnchor="middle" fill="#0369a1" fontSize="9" fontFamily="sans-serif">冷却器</text>

        {/* ─── Motor/driver ─── */}
        <rect x="380" y="380" width="80" height="50" rx="5" fill="#f5f3ff" stroke="#7c3aed" strokeWidth="1.5" />
        <text x="420" y="400" textAnchor="middle" fill="#4c1d95" fontSize="10" fontWeight="bold" fontFamily="sans-serif">M-101</text>
        <text x="420" y="415" textAnchor="middle" fill="#5b21b6" fontSize="9" fontFamily="sans-serif">原動機</text>
        {/* Motor coupling line */}
        <line x1="420" y1="328" x2="420" y2="380" stroke="#7c3aed" strokeWidth="2" strokeDasharray="4 2" />

        {/* ─── Lube oil system (below) ─── */}
        <rect x="350" y="475" width="140" height="45" rx="5" fill="#fef9c3" stroke="#ca8a04" strokeWidth="1.5" />
        <text x="420" y="497" textAnchor="middle" fill="#713f12" fontSize="9" fontWeight="bold" fontFamily="sans-serif">潤滑油ユニット</text>
        <text x="420" y="510" textAnchor="middle" fill="#92400e" fontSize="8" fontFamily="sans-serif">LO-101</text>
        <line x1="420" y1="430" x2="420" y2="475" stroke="#ca8a04" strokeWidth="2" strokeDasharray="4 2" />

        {/* ─── Seal gas (side) ─── */}
        <rect x="200" y="400" width="110" height="45" rx="5" fill="#fdf4ff" stroke="#a21caf" strokeWidth="1.5" />
        <text x="255" y="422" textAnchor="middle" fill="#701a75" fontSize="9" fontWeight="bold" fontFamily="sans-serif">シールガス</text>
        <text x="255" y="436" textAnchor="middle" fill="#86198f" fontSize="8" fontFamily="sans-serif">SG-101</text>
        <line x1="310" y1="422" x2="380" y2="422" stroke="#a21caf" strokeWidth="1.5" strokeDasharray="4 2" />
        <line x1="380" y1="422" x2="420" y2="380" stroke="#a21caf" strokeWidth="1.5" strokeDasharray="4 2" />

        {/* ─── Relief valve on outlet ─── */}
        <ReliefValve x={600} y={268} />
        <line x1="600" y1="268" x2="600" y2="290" stroke="#dc2626" strokeWidth="1.5" />

        {/* ─── Instruments ─── */}
        {/* PI-101: Inlet pressure */}
        <line x1="80" y1="290" x2="80" y2="240" stroke="#475569" strokeWidth="1" strokeDasharray="3 2" />
        <InstrBox x={80} y={220} tag="PI" label="101" value={d ? `${d.inlet_pressure.toFixed(2)} b` : '--'} color={piInletColor} />

        {/* TI-101: Inlet temp */}
        <line x1="200" y1="290" x2="200" y2="240" stroke="#475569" strokeWidth="1" strokeDasharray="3 2" />
        <InstrBox x={200} y={220} tag="TI" label="101" value={d ? `${d.inlet_temp.toFixed(0)}°C` : '--'} color={tiInletColor} />

        {/* FI-101: Flow indicator (diamond shape) */}
        <line x1="270" y1="290" x2="270" y2="240" stroke="#475569" strokeWidth="1" strokeDasharray="3 2" />
        <polygon points="270,207 286,219 270,231 254,219" fill="white" stroke="#475569" strokeWidth="1.5" />
        <text x="270" y="215" textAnchor="middle" fill="#1e293b" fontSize="8" fontWeight="bold" fontFamily="sans-serif">FI</text>
        <text x="270" y="224" textAnchor="middle" fill="#475569" fontSize="7" fontFamily="sans-serif">101</text>

        {/* PI-102: Outlet pressure */}
        <line x1="490" y1="268" x2="490" y2="220" stroke="#475569" strokeWidth="1" strokeDasharray="3 2" />
        <InstrBox x={490} y={200} tag="PI" label="102" value={d ? `${d.outlet_pressure.toFixed(2)} b` : '--'} color={piOutletColor} />

        {/* TI-102: Outlet temp */}
        <line x1="580" y1="290" x2="580" y2="240" stroke="#475569" strokeWidth="1" strokeDasharray="3 2" />
        <InstrBox x={580} y={220} tag="TI" label="102" value={d ? `${d.outlet_temp.toFixed(0)}°C` : '--'} color={tiOutletColor} />

        {/* VT-101: Vibration */}
        <line x1="458" y1="330" x2="500" y2="370" stroke="#475569" strokeWidth="1" strokeDasharray="3 2" />
        <rect x="486" y="362" width="28" height="16" rx="3" fill="white" stroke="#475569" strokeWidth="1.5" />
        <text x="500" y="374" textAnchor="middle" fill="#1e293b" fontSize="7" fontWeight="bold" fontFamily="sans-serif">VT</text>
        <rect x="486" y="380" width="44" height="14" rx="2" fill={vtColor} />
        <text x="508" y="391" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="sans-serif">
          {d ? `${d.vibration.toFixed(1)}mm/s` : '--'}
        </text>

        {/* ST-101: Speed */}
        <line x1="395" y1="340" x2="350" y2="370" stroke="#475569" strokeWidth="1" strokeDasharray="3 2" />
        <rect x="324" y="362" width="28" height="16" rx="3" fill="white" stroke="#475569" strokeWidth="1.5" />
        <text x="338" y="374" textAnchor="middle" fill="#1e293b" fontSize="7" fontWeight="bold" fontFamily="sans-serif">ST</text>
        <rect x="310" y="380" width="54" height="14" rx="2" fill={stColor} />
        <text x="337" y="391" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="sans-serif">
          {d ? `${Math.round(d.rpm)}rpm` : '--'}
        </text>

        {/* ─── Legend ─── */}
        <g transform="translate(20, 545)">
          <text x="0" y="0" fill="#374151" fontSize="10" fontWeight="bold" fontFamily="sans-serif">凡例:</text>
          <circle cx="55" cy="-4" r="5" fill="#10b981" />
          <text x="63" y="0" fill="#374151" fontSize="9" fontFamily="sans-serif">正常</text>
          <circle cx="103" cy="-4" r="5" fill="#f59e0b" />
          <text x="111" y="0" fill="#374151" fontSize="9" fontFamily="sans-serif">警告</text>
          <circle cx="153" cy="-4" r="5" fill="#ef4444" />
          <text x="161" y="0" fill="#374151" fontSize="9" fontFamily="sans-serif">異常</text>
          <line x1="210" y1="-4" x2="230" y2="-4" stroke="#ca8a04" strokeWidth="2" strokeDasharray="4 2" />
          <text x="234" y="0" fill="#374151" fontSize="9" fontFamily="sans-serif">潤滑油/シールガス</text>
          <line x1="365" y1="-4" x2="385" y2="-4" stroke="#7c3aed" strokeWidth="2" strokeDasharray="4 2" />
          <text x="389" y="0" fill="#374151" fontSize="9" fontFamily="sans-serif">電気/制御</text>
        </g>
      </svg>
    </div>
  )
}

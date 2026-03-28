import { useState } from 'react'

interface ExplodedViewProps {
  spareParts: Array<{
    id: number
    part_number: string
    name_ja: string
    category: string
    is_recommended_for_next_maintenance: boolean
  }>
  selectedPartId: number | null
  onAssemblyClick: (assembly: string) => void
  highlightedAssembly: string | null
}

const ASSEMBLY_PARTS_MAP: Record<string, string[]> = {
  impeller: ['羽根車', 'インペラ', 'Impeller'],
  bearing_thrust: ['スラスト', 'Thrust'],
  bearing_journal: ['ジャーナル', 'Journal', '軸受'],
  seal: ['シール', 'Seal', 'ガスケット'],
  coupling: ['カップリング', 'Coupling'],
  casing: ['ケーシング', 'Casing'],
  shaft: ['シャフト', 'Shaft'],
}

interface AssemblyDef {
  key: string
  label: string
  // shape: 'rect' | 'circle' | 'polygon'
  x: number
  y: number
  w: number
  h: number
  rx: number
  offsetX: number  // isometric offset
  offsetY: number
}

const ASSEMBLIES: AssemblyDef[] = [
  { key: 'casing',         label: '主ケーシング',         x: 250, y: 160, w: 200, h: 160, rx: 8, offsetX: 12, offsetY: -12 },
  { key: 'impeller',       label: '羽根車',              x: 295, y: 195, w: 110, h: 110, rx: 55, offsetX: 10, offsetY: -10 },
  { key: 'diffuser',       label: 'ディフューザー',       x: 275, y: 175, w: 150, h: 150, rx: 75, offsetX: 10, offsetY: -10 },
  { key: 'inlet_casing',   label: '入口ケーシング',       x: 60,  y: 180, w: 140, h: 80,  rx: 6, offsetX: 10, offsetY: -10 },
  { key: 'bearing_thrust', label: 'スラスト軸受',         x: 60,  y: 320, w: 110, h: 50,  rx: 5, offsetX: 8, offsetY: -8 },
  { key: 'bearing_journal',label: 'ジャーナル軸受(DE)',   x: 200, y: 360, w: 120, h: 50,  rx: 5, offsetX: 8, offsetY: -8 },
  { key: 'bearing_nde',    label: 'ジャーナル軸受(NDE)',  x: 360, y: 380, w: 120, h: 50,  rx: 5, offsetX: 8, offsetY: -8 },
  { key: 'seal',           label: 'メカニカルシール',     x: 490, y: 300, w: 110, h: 50,  rx: 5, offsetX: 8, offsetY: -8 },
  { key: 'coupling',       label: 'カップリング',         x: 510, y: 180, w: 80,  h: 60,  rx: 5, offsetX: 8, offsetY: -8 },
  { key: 'shaft',          label: 'シャフト',            x: 100, y: 420, w: 420, h: 22,  rx: 4, offsetX: 6, offsetY: -6 },
  { key: 'bearing_housing',label: '軸受ハウジング',       x: 90,  y: 270, w: 160, h: 40,  rx: 5, offsetX: 10, offsetY: -10 },
]

function matchesParts(assemblyKey: string, parts: ExplodedViewProps['spareParts']): ExplodedViewProps['spareParts'] {
  const keywords = ASSEMBLY_PARTS_MAP[assemblyKey] || []
  return parts.filter(p =>
    keywords.some(kw => p.name_ja.includes(kw) || p.category.includes(kw))
  )
}

export default function CompressorExplodedView({ spareParts, selectedPartId: _selectedPartId, onAssemblyClick, highlightedAssembly }: ExplodedViewProps) {
  const [hoveredAssembly, setHoveredAssembly] = useState<string | null>(null)
  const [tooltipAssembly, setTooltipAssembly] = useState<string | null>(null)

  const tooltip = tooltipAssembly ? ASSEMBLIES.find(a => a.key === tooltipAssembly) : null
  const tooltipMatchedParts = tooltip ? matchesParts(tooltip.key, spareParts) : []
  const tooltipRecommended = tooltipMatchedParts.filter(p => p.is_recommended_for_next_maintenance)

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <style>{`
        @keyframes badge-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .badge-pulse { animation: badge-pulse 1.5s ease-in-out infinite; }
      `}</style>
      <svg
        viewBox="0 0 700 580"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label="圧縮機分解図"
      >
        {/* Background */}
        <rect x="0" y="0" width="700" height="580" fill="#fafafa" />

        {/* Title */}
        <text x="350" y="30" textAnchor="middle" fill="#1e293b" fontSize="14" fontWeight="bold" fontFamily="sans-serif">
          分解組立図 (コンポーネント選択)
        </text>

        {/* ─── Draw assemblies ─── */}
        {ASSEMBLIES.map(asm => {
          const isActive = highlightedAssembly === asm.key
          const isHovered = hoveredAssembly === asm.key
          const matchedParts = matchesParts(asm.key, spareParts)
          const hasRecommended = matchedParts.some(p => p.is_recommended_for_next_maintenance)

          let fillColor = '#e2e8f0'
          let strokeColor = '#94a3b8'
          let strokeWidth = 1.5

          if (isActive) {
            fillColor = '#ffe4e6'
            strokeColor = '#e11d48'
            strokeWidth = 2.5
          } else if (isHovered) {
            fillColor = '#dbeafe'
            strokeColor = '#3b82f6'
            strokeWidth = 2
          }

          // Isometric top face (offset rectangle)
          const ox = asm.offsetX
          const oy = asm.offsetY
          const isCircle = asm.rx >= asm.w / 2

          return (
            <g
              key={asm.key}
              style={{ cursor: 'pointer' }}
              onClick={() => onAssemblyClick(isActive ? '' : asm.key)}
              onMouseEnter={() => { setHoveredAssembly(asm.key); setTooltipAssembly(asm.key) }}
              onMouseLeave={() => { setHoveredAssembly(null); setTooltipAssembly(null) }}
            >
              {/* Shadow/depth face */}
              {!isCircle && (
                <rect
                  x={asm.x + ox + 3}
                  y={asm.y + oy + 3}
                  width={asm.w}
                  height={asm.h}
                  rx={asm.rx}
                  fill="#c8d0da"
                  opacity="0.5"
                />
              )}
              {/* Top offset face (3D effect) */}
              {!isCircle && ox !== 0 && (
                <rect
                  x={asm.x + ox}
                  y={asm.y + oy}
                  width={asm.w}
                  height={asm.h}
                  rx={asm.rx}
                  fill={isActive ? '#fecdd3' : isHovered ? '#bfdbfe' : '#d1d9e6'}
                  stroke={strokeColor}
                  strokeWidth="1"
                  opacity="0.7"
                />
              )}
              {/* Main face */}
              {isCircle ? (
                <circle
                  cx={asm.x + asm.w / 2}
                  cy={asm.y + asm.h / 2}
                  r={asm.rx}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                />
              ) : (
                <rect
                  x={asm.x}
                  y={asm.y}
                  width={asm.w}
                  height={asm.h}
                  rx={asm.rx}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                />
              )}

              {/* Label */}
              <text
                x={asm.x + asm.w / 2}
                y={asm.y + asm.h / 2 - (matchedParts.length > 0 ? 6 : 0)}
                textAnchor="middle"
                fill={isActive ? '#9f1239' : '#1e293b'}
                fontSize="10"
                fontWeight={isActive ? 'bold' : '600'}
                fontFamily="sans-serif"
              >
                {asm.label}
              </text>
              {matchedParts.length > 0 && (
                <text
                  x={asm.x + asm.w / 2}
                  y={asm.y + asm.h / 2 + 9}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="8"
                  fontFamily="sans-serif"
                >
                  {matchedParts.length}部品
                </text>
              )}

              {/* Recommended badge */}
              {hasRecommended && (
                <g className="badge-pulse">
                  <circle
                    cx={isCircle ? asm.x + asm.w / 2 + asm.rx - 8 : asm.x + asm.w - 8}
                    cy={asm.y + 8}
                    r="8"
                    fill="#f97316"
                    stroke="white"
                    strokeWidth="1.5"
                  />
                  <text
                    x={isCircle ? asm.x + asm.w / 2 + asm.rx - 8 : asm.x + asm.w - 8}
                    y={asm.y + 12}
                    textAnchor="middle"
                    fill="white"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    !
                  </text>
                </g>
              )}
            </g>
          )
        })}

        {/* ─── Tooltip ─── */}
        {tooltip && (() => {
          const tx = tooltip.x + tooltip.w + 10 > 600 ? tooltip.x - 155 : tooltip.x + tooltip.w + 8
          const ty = Math.min(tooltip.y, 480)
          return (
            <g>
              <rect x={tx} y={ty} width="148" height="80" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
              <text x={tx + 8} y={ty + 18} fill="#1e293b" fontSize="11" fontWeight="bold" fontFamily="sans-serif">{tooltip.label}</text>
              <text x={tx + 8} y={ty + 34} fill="#6b7280" fontSize="9" fontFamily="sans-serif">
                対応部品: {tooltipMatchedParts.length}件
              </text>
              <text x={tx + 8} y={ty + 48} fill="#f97316" fontSize="9" fontFamily="sans-serif">
                推奨交換: {tooltipRecommended.length}件
              </text>
              <text x={tx + 8} y={ty + 64} fill="#94a3b8" fontSize="8" fontFamily="sans-serif">
                クリックで絞り込み
              </text>
            </g>
          )
        })()}

        {/* ─── Legend ─── */}
        <g transform="translate(20, 545)">
          <rect x="0" y="-12" width="16" height="10" rx="2" fill="#ffe4e6" stroke="#e11d48" strokeWidth="1.5" />
          <text x="20" y="0" fill="#374151" fontSize="9" fontFamily="sans-serif">選択中</text>
          <rect x="70" y="-12" width="16" height="10" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" />
          <text x="90" y="0" fill="#374151" fontSize="9" fontFamily="sans-serif">ホバー中</text>
          <circle cx="152" cy="-7" r="6" fill="#f97316" stroke="white" strokeWidth="1" />
          <text x="160" y="0" fill="#374151" fontSize="9" fontFamily="sans-serif">推奨交換部品あり</text>
        </g>
      </svg>
    </div>
  )
}

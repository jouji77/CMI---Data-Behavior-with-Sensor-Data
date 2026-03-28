import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { Calculator, Copy, Check, Beaker } from 'lucide-react'

const GAS_COMPONENTS = ['CH4', 'C2H6', 'C3H8', 'nC4H10', 'iC4H10', 'N2', 'CO2'] as const
type GasComponent = (typeof GAS_COMPONENTS)[number]

const GAS_COMPONENT_NAMES: Record<GasComponent, string> = {
  CH4: 'メタン (CH₄)',
  C2H6: 'エタン (C₂H₆)',
  C3H8: 'プロパン (C₃H₈)',
  nC4H10: 'n-ブタン (nC₄H₁₀)',
  iC4H10: 'i-ブタン (iC₄H₁₀)',
  N2: '窒素 (N₂)',
  CO2: '二酸化炭素 (CO₂)',
}

type Composition = Record<GasComponent, number>

const DEFAULT_COMP: Composition = {
  CH4: 90, C2H6: 5, C3H8: 2, nC4H10: 0.5, iC4H10: 0.5, N2: 1.5, CO2: 0.5,
}

interface BWRSResult {
  polytropic_head_kJ_kg: number
  polytropic_efficiency_pct: number
  isentropic_head_kJ_kg: number
  isentropic_efficiency_pct: number
  compression_ratio: number
  outlet_temp_k: number
  outlet_temp_c: number
  specific_volume_inlet: number
  specific_volume_outlet: number
  molecular_weight: number
  compressibility_z_inlet: number
  compressibility_z_outlet: number
  k_value: number
  polytropic_exponent_n: number
  actual_head_kJ_kg: number
  composition_used: Record<string, number>
}

interface Preset {
  name_ja: string
  name_en: string
  composition: Record<string, number>
}

function ResultCard({ label, value, unit, highlight }: { label: string; value: string | number; unit?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${highlight ? 'bg-rose-50 border border-rose-200' : 'bg-gray-50 border border-gray-100'}`}>
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold tracking-tight ${highlight ? 'text-rose-700' : 'text-gray-800'}`}>
        {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 3 }) : value}
        {unit && <span className="text-sm font-normal text-gray-400 ml-1.5">{unit}</span>}
      </p>
    </div>
  )
}

const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"

export default function SolutionMenu() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const [composition, setComposition] = useState<Composition>({ ...DEFAULT_COMP })
  const [inletPressure, setInletPressure] = useState('0.12')
  const [inletTemp, setInletTemp] = useState('40')
  const [tempUnit, setTempUnit] = useState<'C' | 'K'>('C')
  const [outletPressure, setOutletPressure] = useState('4.0')
  const [massFlow, setMassFlow] = useState('10')
  const [shaftPower, setShaftPower] = useState('3500')

  const [presets, setPresets] = useState<Preset[]>([])
  const [selectedPreset, setSelectedPreset] = useState('')
  const [result, setResult] = useState<BWRSResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const total = Object.values(composition).reduce((a, b) => a + b, 0)
  const isValid = Math.abs(total - 100) < 0.1

  useEffect(() => {
    axios.get('/api/solution/gas-compositions').then(res => setPresets(res.data)).catch(() => {})
  }, [])

  const applyPreset = (preset: Preset) => {
    const newComp: Composition = { CH4: 0, C2H6: 0, C3H8: 0, nC4H10: 0, iC4H10: 0, N2: 0, CO2: 0 }
    for (const [k, v] of Object.entries(preset.composition)) {
      if (k in newComp) {
        (newComp as any)[k] = +(v * 100).toFixed(3)
      }
    }
    setComposition(newComp)
  }

  const handlePresetChange = (name: string) => {
    setSelectedPreset(name)
    const preset = presets.find(p => (lang === 'en' ? p.name_en : p.name_ja) === name)
    if (preset) applyPreset(preset)
  }

  const getInletTempK = (): number => {
    const val = parseFloat(inletTemp)
    return tempUnit === 'C' ? val + 273.15 : val
  }

  const handleCalculate = async () => {
    if (!isValid) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const moleFractions: Record<string, number> = {}
      for (const [k, v] of Object.entries(composition)) {
        moleFractions[k] = v / 100
      }
      const res = await axios.post('/api/solution/bwrs-calculate', {
        composition: moleFractions,
        inlet_pressure_mpa: parseFloat(inletPressure),
        inlet_temp_k: getInletTempK(),
        outlet_pressure_mpa: parseFloat(outletPressure),
        mass_flow_kgs: parseFloat(massFlow),
        shaft_power_kw: parseFloat(shaftPower),
      })
      setResult(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleCopyResults = () => {
    if (!result) return
    const text = [
      `=== BWRS計算結果 ===`,
      `ポリトロープヘッド: ${result.polytropic_head_kJ_kg} kJ/kg`,
      `ポリトロープ効率: ${result.polytropic_efficiency_pct} %`,
      `断熱ヘッド: ${result.isentropic_head_kJ_kg} kJ/kg`,
      `断熱効率: ${result.isentropic_efficiency_pct} %`,
      `圧力比: ${result.compression_ratio}`,
      `吐出温度: ${result.outlet_temp_c.toFixed(1)} °C (${result.outlet_temp_k.toFixed(2)} K)`,
      `分子量: ${result.molecular_weight}`,
      `Z入口: ${result.compressibility_z_inlet}`,
      `Z出口: ${result.compressibility_z_outlet}`,
      `k値 (Cp/Cv): ${result.k_value}`,
      `ポリトロープ指数 n: ${result.polytropic_exponent_n}`,
    ].join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-8 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('solution.title')}</h1>
        <p className="text-gray-400 mt-1 text-sm">BWRSエンジニアリング計算ツール</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator Input */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Calculator size={16} className="text-rose-500" />
            <h2 className="font-semibold text-gray-800 text-sm">{t('solution.bwrsCalculator')}</h2>
          </div>

          <div className="p-5 space-y-6">
            {/* Gas Composition */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('solution.gasComposition')}</label>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  isValid
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {t('solution.total')}: {total.toFixed(1)}%
                </span>
              </div>

              {/* Preset */}
              <select
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className={inputClass + ' mb-4'}
              >
                <option value="">{t('solution.selectPreset')}</option>
                {presets.map(p => (
                  <option key={p.name_en} value={lang === 'en' ? p.name_en : p.name_ja}>
                    {lang === 'en' ? p.name_en : p.name_ja}
                  </option>
                ))}
              </select>

              <div className="space-y-2.5">
                {GAS_COMPONENTS.map(comp => (
                  <div key={comp} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-36 flex-shrink-0">{GAS_COMPONENT_NAMES[comp]}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      value={composition[comp]}
                      onChange={(e) => setComposition(prev => ({ ...prev, [comp]: parseFloat(e.target.value) }))}
                      className="flex-1 accent-rose-600 h-1.5"
                    />
                    <div className="relative w-16 flex-shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={composition[comp]}
                        onChange={(e) => setComposition(prev => ({ ...prev, [comp]: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-right focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-colors"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                    </div>
                  </div>
                ))}
              </div>
              {!isValid && (
                <p className="text-xs text-rose-600 mt-2 flex items-center gap-1">
                  <span>⚠</span> {t('solution.mustSum100')} (現在: {total.toFixed(1)}%)
                </p>
              )}
            </div>

            {/* Operating Conditions */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">運転条件</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">{t('solution.inletPressure')} <span className="text-gray-300">MPa</span></label>
                  <input type="number" value={inletPressure} onChange={(e) => setInletPressure(e.target.value)} step="0.01" className={inputClass} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-gray-400">{t('solution.inletTemp')}</label>
                    <button
                      onClick={() => {
                        const val = parseFloat(inletTemp)
                        if (tempUnit === 'C') {
                          setInletTemp((val + 273.15).toFixed(2))
                          setTempUnit('K')
                        } else {
                          setInletTemp((val - 273.15).toFixed(2))
                          setTempUnit('C')
                        }
                      }}
                      className="text-xs text-rose-600 font-medium hover:text-rose-700"
                    >
                      [{tempUnit === 'C' ? '°C' : 'K'}]
                    </button>
                  </div>
                  <div className="relative">
                    <input type="number" value={inletTemp} onChange={(e) => setInletTemp(e.target.value)} step="0.1" className={inputClass + ' pr-10'} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      {tempUnit === 'C' ? '°C' : 'K'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">{t('solution.outletPressure')} <span className="text-gray-300">MPa</span></label>
                  <input type="number" value={outletPressure} onChange={(e) => setOutletPressure(e.target.value)} step="0.1" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">{t('solution.massFlow')} <span className="text-gray-300">kg/s</span></label>
                  <input type="number" value={massFlow} onChange={(e) => setMassFlow(e.target.value)} step="0.1" className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1.5">{t('solution.shaftPower')} <span className="text-gray-300">kW</span></label>
                  <input type="number" value={shaftPower} onChange={(e) => setShaftPower(e.target.value)} step="10" className={inputClass} />
                </div>
              </div>
            </div>

            {error && (
              <p className="text-rose-600 text-sm bg-rose-50 rounded-xl px-4 py-3 border border-rose-100">{error}</p>
            )}

            <button
              onClick={handleCalculate}
              disabled={loading || !isValid}
              className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-200 disabled:text-rose-400 text-white font-bold py-3 rounded-xl transition-all shadow-sm shadow-rose-200 hover:shadow-rose-300 flex items-center justify-center gap-2 text-sm"
            >
              <Calculator size={16} />
              {loading ? t('solution.calculating') : t('solution.calculate')}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-5">
          {result ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="font-semibold text-gray-800 text-sm">{t('solution.results')}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">BWRS計算結果</p>
                </div>
                <button
                  onClick={handleCopyResults}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-all"
                >
                  {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  {copied ? t('solution.copiedResults') : t('solution.copyResults')}
                </button>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <ResultCard label={t('solution.polytropicHead')} value={result.polytropic_head_kJ_kg} unit="kJ/kg" highlight />
                  <ResultCard label={t('solution.polytropicEfficiency')} value={result.polytropic_efficiency_pct} unit="%" highlight />
                  <ResultCard label={t('solution.isentropicHead')} value={result.isentropic_head_kJ_kg} unit="kJ/kg" />
                  <ResultCard label={t('solution.isentropicEfficiency')} value={result.isentropic_efficiency_pct} unit="%" />
                  <ResultCard label={t('solution.compressionRatio')} value={result.compression_ratio} />
                  <ResultCard label={t('solution.outletTemp')} value={`${result.outlet_temp_c.toFixed(1)} °C`} />
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">詳細パラメータ</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: t('solution.molecularWeight'), value: result.molecular_weight.toFixed(3) },
                      { label: t('solution.kValue'), value: result.k_value.toFixed(4) },
                      { label: t('solution.zInlet'), value: result.compressibility_z_inlet.toFixed(5) },
                      { label: t('solution.zOutlet'), value: result.compressibility_z_outlet.toFixed(5) },
                      { label: t('solution.specificVolumeInlet'), value: `${result.specific_volume_inlet.toFixed(5)} m³/kg` },
                      { label: t('solution.specificVolumeOutlet'), value: `${result.specific_volume_outlet.toFixed(5)} m³/kg` },
                      { label: t('solution.polytropicN'), value: result.polytropic_exponent_n.toFixed(4) },
                      { label: t('solution.actualHead'), value: `${result.actual_head_kJ_kg.toFixed(2)} kJ/kg` },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl">
                        <span className="text-gray-400">{item.label}</span>
                        <span className="font-semibold text-gray-700 font-mono">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calculator size={28} className="opacity-30" />
              </div>
              <p className="text-sm font-medium text-gray-500">計算結果</p>
              <p className="text-xs mt-1">左のフォームで計算を実行してください</p>
            </div>
          )}

          {/* Other tools */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2 text-sm">
              <Beaker size={15} className="text-violet-500" />
              {t('solution.otherTools')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {['サージ制御計算', 'ノズル流量計算', '熱交換器設計', '配管圧力損失'].map(name => (
                <div key={name} className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-3 text-center">
                  <p className="text-sm font-medium text-gray-500">{name}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('solution.comingSoon')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

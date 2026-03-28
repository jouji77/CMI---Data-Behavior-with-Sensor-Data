import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { Calculator, Copy, Check, ChevronDown, Beaker } from 'lucide-react'

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
    <div className={`rounded-lg p-3 ${highlight ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-red-700' : 'text-gray-800'}`}>
        {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 3 }) : value}
        {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
      </p>
    </div>
  )
}

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
      `吐出温度: ${result.outlet_temp_c} °C (${result.outlet_temp_k} K)`,
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center">
          <Calculator size={20} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{t('solution.title')}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BWRS Calculator */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-800 px-5 py-3 flex items-center gap-2">
            <Calculator size={16} className="text-red-400" />
            <h2 className="font-semibold text-white text-sm">{t('solution.bwrsCalculator')}</h2>
          </div>

          <div className="p-5 space-y-5">
            {/* Gas Composition */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">{t('solution.gasComposition')}</label>
                <span className={`text-xs font-medium ${isValid ? 'text-green-600' : 'text-red-500'}`}>
                  {t('solution.total')}: {total.toFixed(1)}%
                </span>
              </div>

              {/* Preset */}
              <div className="mb-3">
                <select
                  value={selectedPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">{t('solution.selectPreset')}</option>
                  {presets.map(p => (
                    <option key={p.name_en} value={lang === 'en' ? p.name_en : p.name_ja}>
                      {lang === 'en' ? p.name_en : p.name_ja}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                {GAS_COMPONENTS.map(comp => (
                  <div key={comp} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-36 flex-shrink-0">{GAS_COMPONENT_NAMES[comp]}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      value={composition[comp]}
                      onChange={(e) => setComposition(prev => ({ ...prev, [comp]: parseFloat(e.target.value) }))}
                      className="flex-1 accent-red-600"
                    />
                    <div className="relative w-16">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={composition[comp]}
                        onChange={(e) => setComposition(prev => ({ ...prev, [comp]: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                    </div>
                  </div>
                ))}
              </div>
              {!isValid && (
                <p className="text-xs text-red-500 mt-1">{t('solution.mustSum100')} (現在: {total.toFixed(1)}%)</p>
              )}
            </div>

            {/* Operating Conditions */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('solution.inletPressure')}</label>
                <input
                  type="number"
                  value={inletPressure}
                  onChange={(e) => setInletPressure(e.target.value)}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">{t('solution.inletTemp')}</label>
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
                    className="text-xs text-red-600 font-medium"
                  >
                    [{tempUnit === 'C' ? '°C' : 'K'}] {t('solution.toggleTemp')}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={inletTemp}
                    onChange={(e) => setInletTemp(e.target.value)}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    {tempUnit === 'C' ? '°C' : 'K'}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('solution.outletPressure')}</label>
                <input
                  type="number"
                  value={outletPressure}
                  onChange={(e) => setOutletPressure(e.target.value)}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('solution.massFlow')}</label>
                <input
                  type="number"
                  value={massFlow}
                  onChange={(e) => setMassFlow(e.target.value)}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('solution.shaftPower')}</label>
                <input
                  type="number"
                  value={shaftPower}
                  onChange={(e) => setShaftPower(e.target.value)}
                  step="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              onClick={handleCalculate}
              disabled={loading || !isValid}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Calculator size={16} />
              {loading ? t('solution.calculating') : t('solution.calculate')}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-800 px-5 py-3 flex items-center justify-between">
                <h2 className="font-semibold text-white text-sm">{t('solution.results')}</h2>
                <button
                  onClick={handleCopyResults}
                  className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white transition-colors"
                >
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  {copied ? t('solution.copiedResults') : t('solution.copyResults')}
                </button>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <ResultCard label={t('solution.polytropicHead')} value={result.polytropic_head_kJ_kg} unit="kJ/kg" highlight />
                  <ResultCard label={t('solution.polytropicEfficiency')} value={result.polytropic_efficiency_pct} unit="%" highlight />
                  <ResultCard label={t('solution.isentropicHead')} value={result.isentropic_head_kJ_kg} unit="kJ/kg" />
                  <ResultCard label={t('solution.isentropicEfficiency')} value={result.isentropic_efficiency_pct} unit="%" />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <ResultCard label={t('solution.compressionRatio')} value={result.compression_ratio} />
                  <ResultCard
                    label={t('solution.outletTemp')}
                    value={`${result.outlet_temp_c.toFixed(1)} °C`}
                  />
                </div>

                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">詳細パラメータ</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex justify-between bg-gray-50 px-2 py-1.5 rounded">
                      <span>{t('solution.molecularWeight')}</span>
                      <span className="font-medium">{result.molecular_weight.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between bg-gray-50 px-2 py-1.5 rounded">
                      <span>{t('solution.kValue')}</span>
                      <span className="font-medium">{result.k_value.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between bg-gray-50 px-2 py-1.5 rounded">
                      <span>{t('solution.zInlet')}</span>
                      <span className="font-medium">{result.compressibility_z_inlet.toFixed(5)}</span>
                    </div>
                    <div className="flex justify-between bg-gray-50 px-2 py-1.5 rounded">
                      <span>{t('solution.zOutlet')}</span>
                      <span className="font-medium">{result.compressibility_z_outlet.toFixed(5)}</span>
                    </div>
                    <div className="flex justify-between bg-gray-50 px-2 py-1.5 rounded">
                      <span>{t('solution.specificVolumeInlet')}</span>
                      <span className="font-medium">{result.specific_volume_inlet.toFixed(5)} m³/kg</span>
                    </div>
                    <div className="flex justify-between bg-gray-50 px-2 py-1.5 rounded">
                      <span>{t('solution.specificVolumeOutlet')}</span>
                      <span className="font-medium">{result.specific_volume_outlet.toFixed(5)} m³/kg</span>
                    </div>
                    <div className="flex justify-between bg-gray-50 px-2 py-1.5 rounded">
                      <span>{t('solution.polytropicN')}</span>
                      <span className="font-medium">{result.polytropic_exponent_n.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between bg-gray-50 px-2 py-1.5 rounded">
                      <span>{t('solution.actualHead')}</span>
                      <span className="font-medium">{result.actual_head_kJ_kg.toFixed(2)} kJ/kg</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
              <Calculator size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t('solution.calculate')}ボタンを押して計算を実行してください</p>
            </div>
          )}

          {/* Other tools placeholder */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Beaker size={16} />
              {t('solution.otherTools')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {['サージ制御計算', 'ノズル流量計算', '熱交換器設計', '配管圧力損失'].map(name => (
                <div key={name} className="bg-gray-50 rounded-lg p-3 text-center border border-dashed border-gray-200">
                  <p className="text-sm font-medium text-gray-600">{name}</p>
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

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { Package, ShoppingCart, X, Plus, Minus, Star, AlertCircle, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

interface SparePart {
  id: number
  part_number: string
  name_ja: string
  name_en: string
  description_ja: string
  description_en: string
  category: string
  compatible_devices: string[]
  unit_price_jpy: number
  unit_price_usd: number
  unit: string
  lead_time_weeks: number
  stock_status: string
  image_url: string | null
  is_recommended_for_next_maintenance: boolean
}

interface CartItem {
  part: SparePart
  quantity: number
}

const DEVICES = ['CC-001', 'CC-002', 'CC-003', 'CC-004']

function StockBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const map: Record<string, { cls: string; icon: JSX.Element }> = {
    in_stock: { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: <CheckCircle size={11} /> },
    low_stock: { cls: 'bg-amber-50 text-amber-700 border border-amber-200', icon: <AlertCircle size={11} /> },
    out_of_stock: { cls: 'bg-rose-50 text-rose-600 border border-rose-200', icon: <X size={11} /> },
  }
  const info = map[status] || map.out_of_stock
  const label = (t(`spareParts.stockStatus.${status}` as any) || status) as string

  return (
    <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', info.cls)}>
      {info.icon} {label}
    </span>
  )
}

interface QuoteModalProps {
  cart: CartItem[]
  onClose: () => void
  onSuccess: () => void
}

function QuoteModal({ cart, onClose, onSuccess }: QuoteModalProps) {
  const { t } = useTranslation()
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userCompany, setUserCompany] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post('/api/spare-parts/quote', {
        user_name: userName,
        user_email: userEmail,
        user_company: userCompany,
        parts: cart.map(item => ({ part_id: item.part.id, quantity: item.quantity })),
        message,
      })
      setSuccess(true)
      setTimeout(() => { onSuccess() }, 1500)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-base font-semibold text-gray-900">{t('spareParts.quoteModal')}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-500" />
            </div>
            <p className="font-semibold text-gray-800">{t('spareParts.quoteSuccess')}</p>
            <p className="text-sm text-gray-400 mt-1">担当者より連絡いたします</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Cart summary */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">依頼部品リスト</p>
              {cart.map(item => (
                <div key={item.part.id} className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-gray-700 font-medium">{item.part.part_number} <span className="font-normal text-gray-400">× {item.quantity}</span></span>
                  <span className="text-gray-600 font-medium">¥{(item.part.unit_price_jpy * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('common.name')}</label>
              <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('common.email')}</label>
              <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('common.company')}</label>
              <input type="text" value={userCompany} onChange={(e) => setUserCompany(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('spareParts.message')}</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className={inputClass} />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold disabled:bg-rose-300 transition-colors shadow-sm">
                {loading ? t('common.loading') : t('spareParts.submitQuote')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function SpareParts() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [parts, setParts] = useState<SparePart[]>([])
  const [loading, setLoading] = useState(true)
  const [deviceFilter, setDeviceFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showQuoteModal, setShowQuoteModal] = useState(false)

  const categories = [...new Set(parts.map(p => p.category))]

  useEffect(() => {
    const fetchParts = async () => {
      setLoading(true)
      try {
        const params: any = {}
        if (deviceFilter) params.device_id = deviceFilter
        if (categoryFilter) params.category = categoryFilter
        const res = await axios.get('/api/spare-parts', { params })
        setParts(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchParts()
  }, [deviceFilter, categoryFilter])

  const addToCart = (part: SparePart) => {
    setCart(prev => {
      const existing = prev.find(i => i.part.id === part.id)
      if (existing) return prev.map(i => i.part.id === part.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { part, quantity: 1 }]
    })
  }

  const updateQty = (partId: number, delta: number) => {
    setCart(prev =>
      prev
        .map(i => i.part.id === partId ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    )
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.part.unit_price_jpy * item.quantity, 0)

  const selectClass = "px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('spareParts.title')}</h1>
          <p className="text-gray-400 mt-1 text-sm">推奨予備品・見積もりリクエスト</p>
        </div>
        <button
          onClick={() => setShowCart(!showCart)}
          className="relative flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
        >
          <ShoppingCart size={15} />
          {t('spareParts.cart')}
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-sm">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('spareParts.deviceFilter')}</label>
          <select value={deviceFilter} onChange={(e) => setDeviceFilter(e.target.value)} className={selectClass}>
            <option value="">{t('spareParts.allDevices')}</option>
            {DEVICES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('spareParts.categoryFilter')}</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectClass}>
            <option value="">{t('spareParts.allCategories')}</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Parts grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-56 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {parts.map(part => {
                const name = lang === 'en' ? part.name_en : part.name_ja
                const desc = lang === 'en' ? part.description_en : part.description_ja
                const inCart = cart.find(i => i.part.id === part.id)

                return (
                  <div
                    key={part.id}
                    className={clsx(
                      'bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-150 overflow-hidden',
                      part.is_recommended_for_next_maintenance && 'border-rose-200 ring-1 ring-rose-100'
                    )}
                  >
                    {/* Image placeholder */}
                    <div className="h-28 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border-b border-gray-100">
                      <Package size={36} className="text-gray-300" />
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          {part.is_recommended_for_next_maintenance && (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-200 text-xs px-2 py-0.5 rounded-full font-medium mb-1.5">
                              <Star size={9} fill="currentColor" /> {t('spareParts.recommended')}
                            </span>
                          )}
                          <p className="text-xs text-gray-400 font-mono">{part.part_number}</p>
                        </div>
                        <StockBadge status={part.stock_status} />
                      </div>

                      <h3 className="font-semibold text-gray-800 text-sm mb-1 line-clamp-2">{name}</h3>
                      <p className="text-xs text-gray-400 mb-3 line-clamp-2 leading-relaxed">{desc}</p>

                      <div className="space-y-1 text-xs text-gray-500 mb-4">
                        <div className="flex justify-between">
                          <span>{t('spareParts.price')}:</span>
                          <span className="font-semibold text-gray-800">
                            {lang === 'en' ? `$${part.unit_price_usd.toLocaleString()}` : `¥${part.unit_price_jpy.toLocaleString()}`}
                            <span className="text-gray-400 font-normal">/{part.unit}</span>
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('spareParts.leadTime')}:</span>
                          <span>{part.lead_time_weeks} {t('spareParts.weeks')}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {part.compatible_devices.map(d => (
                            <span key={d} className="bg-gray-50 text-gray-500 border border-gray-200 text-xs px-1.5 py-0.5 rounded-md">{d}</span>
                          ))}
                        </div>
                      </div>

                      {inCart ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 border border-gray-200 rounded-xl overflow-hidden">
                            <button onClick={() => updateQty(part.id, -1)} className="px-2 py-1.5 hover:bg-gray-50 text-gray-600 transition-colors">
                              <Minus size={13} />
                            </button>
                            <span className="px-2 text-sm font-semibold text-gray-800 min-w-[24px] text-center">{inCart.quantity}</span>
                            <button onClick={() => updateQty(part.id, 1)} className="px-2 py-1.5 hover:bg-gray-50 text-gray-600 transition-colors">
                              <Plus size={13} />
                            </button>
                          </div>
                          <span className="text-xs text-emerald-600 font-medium">カートに追加済み</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(part)}
                          disabled={part.stock_status === 'out_of_stock'}
                          className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm py-2 rounded-xl font-semibold transition-all shadow-sm"
                        >
                          {t('spareParts.addToCart')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Cart sidebar */}
        {showCart && (
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-6">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
                  <ShoppingCart size={15} /> {t('spareParts.cart')}
                </h3>
                <button onClick={() => setShowCart(false)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={15} />
                </button>
              </div>

              <div className="p-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-400 text-sm">{t('spareParts.cartEmpty')}</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {cart.map(item => (
                        <div key={item.part.id} className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-700 truncate">
                              {lang === 'en' ? item.part.name_en : item.part.name_ja}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">{item.part.part_number}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => updateQty(item.part.id, -1)} className="w-5 h-5 rounded-md border border-gray-200 flex items-center justify-center text-xs hover:bg-gray-50 transition-colors">-</button>
                            <span className="text-xs w-4 text-center font-semibold">{item.quantity}</span>
                            <button onClick={() => updateQty(item.part.id, 1)} className="w-5 h-5 rounded-md border border-gray-200 flex items-center justify-center text-xs hover:bg-gray-50 transition-colors">+</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-100 pt-3 mb-4">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-gray-500">合計概算</span>
                        <span className="text-gray-800">¥{cartTotal.toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowQuoteModal(true)}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white text-sm py-2.5 rounded-xl font-semibold transition-colors shadow-sm"
                    >
                      {t('spareParts.quoteRequest')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showQuoteModal && (
        <QuoteModal
          cart={cart}
          onClose={() => setShowQuoteModal(false)}
          onSuccess={() => { setShowQuoteModal(false); setCart([]) }}
        />
      )}
    </div>
  )
}

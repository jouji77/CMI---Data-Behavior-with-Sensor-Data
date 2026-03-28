import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { Zap, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

type Step = 'register' | 'otp'

export default function Register() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('register')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [company, setCompany] = useState('')
  const [language, setLanguage] = useState(i18n.language || 'ja')
  const [showPassword, setShowPassword] = useState(false)

  const [otp, setOtp] = useState('')
  const [devOtp, setDevOtp] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }
    setLoading(true)
    setError('')
    try {
      await axios.post('/api/auth/register', { email, password, name, company, language })
      const otpRes = await axios.post('/api/auth/send-otp', { email })
      setDevOtp(otpRes.data.otp || '')
      setStep('otp')
    } catch (err: any) {
      setError(err.response?.data?.detail || '登録に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post('/api/auth/verify-otp', { email, otp })
      const { access_token, user } = res.data
      localStorage.setItem('auth_token', access_token)
      localStorage.setItem('user', JSON.stringify(user))
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      i18n.changeLanguage(language)
      localStorage.setItem('language', language)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || '認証に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors bg-gray-50 focus:bg-white"

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-10" style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #4c0519 100%)',
    }}>
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-600 rounded-2xl mb-5 shadow-2xl shadow-rose-900/50">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">HI**** Compressor</h1>
          <p className="text-slate-400 mt-1 text-sm">User Portal</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-10">
          {step === 'register' ? (
            <>
              <div className="mb-7">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t('auth.register')}</h2>
                <p className="text-sm text-gray-400 mt-1">新しいアカウントを作成してください</p>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 mb-5 text-sm">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('auth.name')}</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="山田 太郎" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('auth.email')}</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="your@email.com" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('auth.company')}</label>
                  <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} required className={inputClass} placeholder="株式会社..." />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('auth.password')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className={inputClass + ' pr-12'}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('auth.confirmPassword')}</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClass} placeholder="••••••••" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('auth.languagePref')}</label>
                  <div className="flex gap-3">
                    {['ja', 'en'].map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setLanguage(lang)}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                          language === lang
                            ? 'bg-rose-600 border-rose-600 text-white shadow-sm shadow-rose-200'
                            : 'border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-600'
                        }`}
                      >
                        {lang === 'ja' ? '日本語' : 'English'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm shadow-rose-200 text-sm mt-2"
                >
                  {loading ? t('common.loading') : t('auth.registerButton')}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-7">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t('auth.otpTitle')}</h2>
                <p className="text-sm text-gray-400 mt-2 leading-relaxed">{t('auth.otpDescription')}</p>
                <p className="text-sm font-semibold text-gray-700 mt-1">{email}</p>
              </div>

              {devOtp && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-sm text-amber-800">
                  <strong>[Dev Mode] OTP:</strong> <span className="font-mono text-amber-900">{devOtp}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 mb-5 text-sm">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('auth.otpCode')}</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    placeholder="000000"
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors text-center text-3xl tracking-widest font-mono bg-gray-50 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-200 disabled:text-rose-400 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm text-sm"
                >
                  {loading ? t('common.loading') : t('auth.otpVerify')}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('register'); setError('') }}
                  className="w-full text-gray-400 hover:text-gray-600 text-sm transition-colors py-1"
                >
                  {t('common.back')}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-gray-400 mt-7">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-rose-600 hover:text-rose-700 font-semibold">
              {t('auth.login')}
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-5">© 2025 HI****. All rights reserved.</p>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { Activity, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

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
      // Send OTP
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

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4 shadow-lg">
            <Activity size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">HI**** Compressor</h1>
          <p className="text-gray-500 mt-1">User Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {step === 'register' ? (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">{t('auth.register')}</h2>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.name')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.company')}</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.confirmPassword')}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.languagePref')}</label>
                  <div className="flex gap-3">
                    {['ja', 'en'].map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setLanguage(lang)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          language === lang
                            ? 'bg-red-600 border-red-600 text-white'
                            : 'border-gray-300 text-gray-700 hover:border-red-400'
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
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
                >
                  {loading ? t('common.loading') : t('auth.registerButton')}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                <h2 className="text-xl font-semibold text-gray-800">{t('auth.otpTitle')}</h2>
                <p className="text-sm text-gray-500 mt-2">{t('auth.otpDescription')}</p>
                <p className="text-sm font-medium text-gray-700 mt-1">{email}</p>
              </div>

              {devOtp && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-4 text-sm text-yellow-800">
                  <strong>[Dev Mode] OTP:</strong> {devOtp}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.otpCode')}</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    placeholder="000000"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
                >
                  {loading ? t('common.loading') : t('auth.otpVerify')}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('register'); setError('') }}
                  className="w-full text-gray-500 hover:text-gray-700 text-sm"
                >
                  {t('common.back')}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-red-600 hover:text-red-700 font-medium">
              {t('auth.login')}
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">© 2025 HI****. All rights reserved.</p>
      </div>
    </div>
  )
}

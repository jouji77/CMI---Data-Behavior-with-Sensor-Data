import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { Zap, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function Login() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post('/api/auth/login', { email, password })
      const { access_token, user } = res.data
      localStorage.setItem('auth_token', access_token)
      localStorage.setItem('user', JSON.stringify(user))
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      if (user.language) {
        i18n.changeLanguage(user.language)
        localStorage.setItem('language', user.language)
      }
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'ログインに失敗しました。メールアドレスまたはパスワードを確認してください。')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors bg-gray-50 focus:bg-white"

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
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

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-10">
          <div className="mb-7">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t('auth.login')}</h2>
            <p className="text-sm text-gray-400 mt-1">アカウントにサインインしてください</p>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('auth.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className={inputClass + ' pr-12'}
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

            <div className="text-right">
              <Link to="/register" className="text-xs text-rose-600 hover:text-rose-700 font-medium">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm shadow-rose-200 hover:shadow-rose-300 text-sm mt-2"
            >
              {loading ? t('common.loading') : t('auth.loginButton')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-7">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-rose-600 hover:text-rose-700 font-semibold">
              {t('auth.register')}
            </Link>
          </p>
        </div>

        {/* Language toggle */}
        <div className="flex justify-center gap-2 mt-5">
          <button
            onClick={() => { i18n.changeLanguage('ja'); localStorage.setItem('language', 'ja') }}
            className={`text-xs px-3 py-1.5 rounded-full transition-all font-medium ${
              i18n.language === 'ja'
                ? 'bg-white/10 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            日本語
          </button>
          <button
            onClick={() => { i18n.changeLanguage('en'); localStorage.setItem('language', 'en') }}
            className={`text-xs px-3 py-1.5 rounded-full transition-all font-medium ${
              i18n.language === 'en'
                ? 'bg-white/10 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            English
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">© 2025 HI****. All rights reserved.</p>
      </div>
    </div>
  )
}

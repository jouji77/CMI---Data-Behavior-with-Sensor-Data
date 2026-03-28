import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { Activity, Eye, EyeOff, AlertCircle } from 'lucide-react'

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
      // Set language from user preference
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

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4 shadow-lg">
            <Activity size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">HI**** Compressor</h1>
          <p className="text-gray-500 mt-1">User Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">{t('auth.login')}</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
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
                  placeholder="••••••••"
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

            <div className="text-right">
              <Link to="/register" className="text-sm text-red-600 hover:text-red-700">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              {loading ? t('common.loading') : t('auth.loginButton')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-red-600 hover:text-red-700 font-medium">
              {t('auth.register')}
            </Link>
          </p>
        </div>

        {/* Language toggle */}
        <div className="text-center mt-4 flex justify-center gap-2">
          <button
            onClick={() => { i18n.changeLanguage('ja'); localStorage.setItem('language', 'ja') }}
            className={`text-sm px-3 py-1 rounded-full transition-colors ${i18n.language === 'ja' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            日本語
          </button>
          <button
            onClick={() => { i18n.changeLanguage('en'); localStorage.setItem('language', 'en') }}
            className={`text-sm px-3 py-1 rounded-full transition-colors ${i18n.language === 'en' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            English
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">© 2025 HI****. All rights reserved.</p>
      </div>
    </div>
  )
}

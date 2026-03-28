import { NavLink, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Activity, FileText, MessageSquare, Bot,
  Wrench, BookOpen, Package, ClipboardCheck, Calculator, LogOut, User, Shield
} from 'lucide-react'
import clsx from 'clsx'

export default function Sidebar() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const navItems = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard, end: true },
    { to: '/sensor', label: t('nav.sensor'), icon: Activity, end: false },
    { to: '/documents', label: t('nav.documents'), icon: FileText, end: false },
    { to: '/chat', label: t('nav.chat'), icon: MessageSquare, end: false },
    { to: '/chatbot', label: t('nav.chatbot'), icon: Bot, end: false },
    { to: '/maintenance', label: t('nav.maintenance'), icon: Wrench, end: false },
    { to: '/technical', label: t('nav.technical'), icon: BookOpen, end: false },
    { to: '/spare-parts', label: t('nav.spareParts'), icon: Package, end: false },
    { to: '/inspection', label: t('nav.inspection'), icon: ClipboardCheck, end: false },
    { to: '/solution', label: t('nav.solution'), icon: Calculator, end: false },
  ]

  const userJson = localStorage.getItem('user')
  const user = userJson ? JSON.parse(userJson) : null

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ja' ? 'en' : 'ja'
    i18n.changeLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  return (
    <div className="flex flex-col w-64 min-h-screen bg-gray-800 text-white">
      <div className="px-5 py-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <div className="text-xs font-bold leading-tight tracking-wide">HI**** Compressor</div>
            <div className="text-xs text-gray-400 leading-tight">User Portal</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-red-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )
            }
          >
            <Icon size={17} className="flex-shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700 space-y-3">
        {/* Language toggle */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-gray-400 flex-1">言語 / Lang</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-600">
            <button
              onClick={() => { i18n.changeLanguage('ja'); localStorage.setItem('language', 'ja') }}
              className={clsx(
                'px-2.5 py-1 text-xs font-medium transition-colors',
                i18n.language === 'ja' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              JA
            </button>
            <button
              onClick={() => { i18n.changeLanguage('en'); localStorage.setItem('language', 'en') }}
              className={clsx(
                'px-2.5 py-1 text-xs font-medium transition-colors',
                i18n.language === 'en' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              EN
            </button>
          </div>
        </div>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-2 px-1">
            <div className="w-7 h-7 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
              <User size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.company}</p>
            </div>
          </div>
        )}

        {/* Admin link (only visible to admins) */}
        {user?.role === 'admin' && (
          <Link
            to="/admin"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <Shield size={15} />
            管理サイト
          </Link>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
        >
          <LogOut size={15} />
          {t('common.logout')}
        </button>

        <div className="text-xs text-gray-600 px-1">
          <div>Portal v2.0</div>
          <div>© 2025 HI****</div>
        </div>
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import {
  LayoutDashboard, Building2, Settings, Users, Package,
  FileEdit, LogOut, ArrowLeft, Shield
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/admin', label: 'ダッシュボード', icon: LayoutDashboard, end: true },
  { to: '/admin/companies', label: '顧客企業管理', icon: Building2, end: false },
  { to: '/admin/compressors', label: '登録圧縮機管理', icon: Settings, end: false },
  { to: '/admin/users', label: 'ユーザー管理', icon: Users, end: false },
  { to: '/admin/spare-parts', label: '推奨予備品管理', icon: Package, end: false },
  { to: '/admin/articles', label: '技術情報管理', icon: FileEdit, end: false },
]

export default function AdminLayout() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const userJson = localStorage.getItem('user')
    if (!token || !userJson) {
      navigate('/login', { replace: true })
      return
    }
    const user = JSON.parse(userJson)
    if (user.role !== 'admin') {
      navigate('/', { replace: true })
      return
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const userJson = localStorage.getItem('user')
  const user = userJson ? JSON.parse(userJson) : null

  if (!user || user.role !== 'admin') return null

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Admin Sidebar */}
      <div className="flex flex-col w-64 min-h-screen bg-gray-900 text-white flex-shrink-0">
        {/* Header */}
        <div className="px-5 py-5 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <div className="text-xs font-bold leading-tight tracking-wide text-white">
                管理サイト
              </div>
              <div className="text-xs text-gray-400 leading-tight">Admin Panel</div>
            </div>
            <span className="ml-auto bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              ADMIN
            </span>
          </div>
        </div>

        {/* Nav */}
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

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-gray-700 space-y-2">
          {/* Admin info */}
          {user && (
            <div className="flex items-center gap-2 px-1 mb-2">
              <div className="w-7 h-7 bg-red-700 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-200 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          )}

          {/* Back to user portal */}
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <ArrowLeft size={15} />
            ユーザーサイトへ戻る
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <LogOut size={15} />
            ログアウト
          </button>

          <div className="text-xs text-gray-600 px-1">
            <div>Portal v2.0 Admin</div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

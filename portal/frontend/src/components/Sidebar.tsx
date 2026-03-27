import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Activity, FileText, MessageSquare, Bot } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/', label: 'ダッシュボード', icon: LayoutDashboard, end: true },
  { to: '/sensor', label: 'センサー遠隔診断', icon: Activity, end: false },
  { to: '/documents', label: 'ドキュメントライブラリー', icon: FileText, end: false },
  { to: '/chat', label: 'チャットツール', icon: MessageSquare, end: false },
  { to: '/chatbot', label: 'AIチャットボット', icon: Bot, end: false },
]

export default function Sidebar() {
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

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-red-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-gray-700">
        <div className="text-xs text-gray-500">
          <div>Compressor Portal v1.0</div>
          <div className="mt-0.5">© 2025 HI****</div>
        </div>
      </div>
    </div>
  )
}

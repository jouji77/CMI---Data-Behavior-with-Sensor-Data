import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Activity, FileText, MessageSquare, Bot,
  Wrench, BookOpen, Package, ClipboardCheck, Calculator, LogOut, User, Zap
} from 'lucide-react'
import clsx from 'clsx'

interface NavGroup {
  label: string
  items: { to: string; labelJa: string; subtitleJa: string; icon: typeof LayoutDashboard; end?: boolean }[]
}

const navGroups: NavGroup[] = [
  {
    label: 'メイン機能',
    items: [
      { to: '/', labelJa: 'ダッシュボード', subtitleJa: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/sensor', labelJa: 'センサー診断', subtitleJa: 'Sensor Diagnostics', icon: Activity },
    ],
  },
  {
    label: 'サービス',
    items: [
      { to: '/maintenance', labelJa: 'メンテナンス来歴', subtitleJa: 'Maintenance', icon: Wrench },
      { to: '/documents', labelJa: 'ドキュメント', subtitleJa: 'Documents', icon: FileText },
      { to: '/spare-parts', labelJa: '推奨予備品', subtitleJa: 'Spare Parts', icon: Package },
      { to: '/inspection', labelJa: '推奨点検項目', subtitleJa: 'Inspection', icon: ClipboardCheck },
    ],
  },
  {
    label: '情報・ツール',
    items: [
      { to: '/technical', labelJa: '技術・サービス情報', subtitleJa: 'Technical Info', icon: BookOpen },
      { to: '/chat', labelJa: 'チャット', subtitleJa: 'Chat', icon: MessageSquare },
      { to: '/chatbot', labelJa: 'AIチャットボット', subtitleJa: 'AI Chatbot', icon: Bot },
      { to: '/solution', labelJa: 'ソリューション', subtitleJa: 'BWRS Calculator', icon: Calculator },
    ],
  },
]

export default function Sidebar() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()

  const userJson = localStorage.getItem('user')
  const user = userJson ? JSON.parse(userJson) : null

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div
      className="flex flex-col w-60 min-h-screen flex-shrink-0"
      style={{
        background: 'linear-gradient(180deg, #0a0f1e 0%, #0d1428 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-rose-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-900/50">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight tracking-tight">HI**** Compressor</div>
            <div className="text-xs text-slate-500 leading-tight mt-0.5">User Portal</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, labelJa, subtitleJa, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    clsx(
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                      isActive
                        ? 'bg-rose-950/40 text-white border-l-2 border-rose-500 pl-[10px]'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border-l-2 border-transparent'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={16} className={clsx('flex-shrink-0', isActive ? 'text-rose-400' : '')} />
                      <div className="min-w-0">
                        <div className="truncate font-medium leading-tight text-[13px]">{labelJa}</div>
                        <div className="text-[10px] text-slate-600 leading-tight mt-0.5">{subtitleJa}</div>
                      </div>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Language toggle */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-slate-600 flex-1 uppercase tracking-wide">Language</span>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => { i18n.changeLanguage('ja'); localStorage.setItem('language', 'ja') }}
              className={clsx(
                'px-2.5 py-1 text-xs font-medium transition-all duration-150',
                i18n.language === 'ja'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              )}
            >
              JA
            </button>
            <button
              onClick={() => { i18n.changeLanguage('en'); localStorage.setItem('language', 'en') }}
              className={clsx(
                'px-2.5 py-1 text-xs font-medium transition-all duration-150',
                i18n.language === 'en'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              )}
            >
              EN
            </button>
          </div>
        </div>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-2.5 px-1 py-1 rounded-lg">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #be123c, #9f1239)' }}>
              {(user.name || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-600 truncate">{user.company}</p>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-white/5 hover:text-rose-400 transition-all duration-150"
        >
          <LogOut size={13} />
          <span>ログアウト</span>
        </button>

        <div className="text-[10px] text-slate-700 px-1">
          Portal v2.0 · © 2025 HI****
        </div>
      </div>
    </div>
  )
}

'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { AdminAuthGuard } from './_components/admin-auth-guard'
import { AdminBootstrapProvider } from './_components/admin-bootstrap-context'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Package,
  Newspaper,
  Briefcase,
  BarChart3,
  Home,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { recordAuthEvent } from '@/lib/record-analytics-event'
import { CommandPalette } from '@/components/admin/command-palette'
import { ADMIN_TABS, ADMIN_TAB_COLORS, type AdminNavTabId } from './_components/admin-types'

const TAB_CONFIG: { id: AdminNavTabId; label: string; icon: React.ComponentType<{ className?: string }>; href?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'training', label: 'Training', icon: GraduationCap },
  { id: 'documents', label: 'Documents', icon: BookOpen },
  { id: 'software', label: 'Software', icon: Package },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'careers', label: 'Careers', icon: Briefcase },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const segment = pathname.replace(/^\/admin\/?/, '').split('/')[0]
  const activeTab: AdminNavTabId | null =
    segment === '' ? 'dashboard' : (ADMIN_TABS.includes(segment as typeof ADMIN_TABS[number]) ? segment : null) as AdminNavTabId | null

  const handleSignOut = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await recordAuthEvent('logout', session?.access_token)
    } catch {
      // still clear session via API route
    }
    window.location.href = '/api/auth/logout'
  }

  return (
    <AdminBootstrapProvider>
    <div className="min-h-screen bg-slate-50/80 dark:bg-[#0a0a0a]">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.06),transparent)]" />

      {/* Header + nav - shown immediately, not blocked by auth */}
      <header className="sticky top-0 z-30 flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-3 sm:px-4 lg:px-6 py-2.5 bg-white dark:bg-[#0f0f0f] border-b border-slate-200/60 dark:border-white/[0.06]">
        <nav className="hidden md:flex items-center gap-0.5 flex-1 min-w-0">
          <Link
            href="/home"
            className="flex items-center justify-center h-9 w-9 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-white/[0.06] transition-colors shrink-0 mr-2 border-r border-slate-200 dark:border-white/[0.06]"
            title="Back to Portal"
          >
            <Home className="h-4 w-4" />
          </Link>
          {TAB_CONFIG.map(({ id, label, icon: Icon, href }) => {
            const isActive = activeTab === id
            const colors = ADMIN_TAB_COLORS[id]
            return (
              <Link
                key={id}
                href={href ?? `/admin/${id}`}
                title={label}
                className={`flex items-center justify-center gap-2 px-2 py-2 2xl:px-3 rounded-lg text-[13px] font-medium shrink-0 transition-colors ${
                  isActive ? colors.nav : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-200/50 dark:hover:bg-white/[0.06]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden xl:inline truncate">{label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center justify-end gap-2">
          <CommandPalette />
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <div className="w-px h-6 bg-slate-200 dark:bg-white/[0.12]" />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-9 w-9 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <AdminAuthGuard>
        <main className="p-4 sm:p-6 lg:p-8 min-h-screen pb-20 md:pb-0">{children}</main>
      </AdminAuthGuard>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur border-t border-slate-200 dark:border-white/[0.06] z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="grid grid-cols-4 sm:grid-cols-8 h-auto min-h-14 py-1">
          {TAB_CONFIG.map(({ id, label, icon: Icon, href }) => {
            const isActive = activeTab === id
            const colors = ADMIN_TAB_COLORS[id]
            return (
              <Link
                key={id}
                href={href ?? `/admin/${id}`}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors ${
                  isActive ? colors.mobile : 'text-slate-500 dark:text-zinc-500'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
    </AdminBootstrapProvider>
  )
}

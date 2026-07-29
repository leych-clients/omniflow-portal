'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Users,
  GraduationCap,
  BookOpen,
  Package,
  Newspaper,
  Briefcase,
  BarChart3,
  Home,
  LogOut,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { recordAuthEvent } from '@/lib/record-analytics-event'
import { CommandPalette } from '@/components/admin/command-palette'
import { ADMIN_TAB_COLORS, type AdminTabId } from './admin-types'

const TAB_CONFIG: { id: AdminTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'training', label: 'Training', icon: GraduationCap },
  { id: 'documents', label: 'Documents', icon: BookOpen },
  { id: 'software', label: 'Software', icon: Package },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'careers', label: 'Careers', icon: Briefcase },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

interface AdminHeaderProps {
  activeTab: AdminTabId | null
}

export function AdminHeader({ activeTab }: AdminHeaderProps) {
  const handleSignOut = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await recordAuthEvent('logout', session?.access_token)
    } catch {
      // session route still runs
    }
    window.location.href = '/api/auth/logout'
  }

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-3 sm:px-4 lg:px-6 py-2.5 bg-slate-50/80 dark:bg-[#0a0a0a]/95 backdrop-blur-md border-b border-slate-200/60 dark:border-white/[0.06]">
      <nav className="hidden md:flex items-center gap-0.5 flex-1 min-w-0">
        <Link
          href="/home"
          className="flex items-center justify-center h-9 w-9 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-white/[0.06] transition-colors shrink-0 mr-2 border-r border-slate-200 dark:border-white/[0.06] pr-2"
          title="Back to Portal"
        >
          <Home className="h-4 w-4" />
        </Link>
        {TAB_CONFIG.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          const colors = ADMIN_TAB_COLORS[id]
          return (
            <Link
              key={id}
              href={`/admin/${id}`}
              title={label}
              className={`flex items-center justify-center gap-2 px-2 py-2 2xl:px-3 rounded-lg text-sm font-medium shrink-0 transition-colors ${
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
  )
}

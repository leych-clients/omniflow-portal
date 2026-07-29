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
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { CommandPalette } from '@/components/admin/command-palette'
import { ADMIN_TAB_COLORS, type AdminTabId } from './admin-types'
import { cn } from '@/lib/utils'

const TAB_CONFIG: { id: AdminTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'training', label: 'Training', icon: GraduationCap },
  { id: 'documents', label: 'Documents', icon: BookOpen },
  { id: 'software', label: 'Software', icon: Package },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'careers', label: 'Careers', icon: Briefcase },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

interface AdminSidebarProps {
  activeTab: AdminTabId | null
  onSignOut: () => void
}

export function AdminSidebar({ activeTab, onSignOut }: AdminSidebarProps) {
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col',
        'border-r border-slate-200/80 bg-white/95 backdrop-blur-xl',
        'shadow-[4px_0_24px_-4px_rgba(0,0,0,0.06)]',
        'transition-all duration-300 ease-out',
        'w-64 lg:w-72'
      )}
    >
      {/* Brand / Logo area */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/60 px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
          <LayoutDashboard className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">Admin</p>
          <p className="truncate text-xs text-slate-500">OmniFlow Portal</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <Link
          href="/home"
          className="mb-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
          title="Back to Portal"
        >
          <Home className="h-4 w-4 shrink-0" />
          <span>Back to Portal</span>
        </Link>

        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sections</p>

        {TAB_CONFIG.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          const colors = ADMIN_TAB_COLORS[id]
          return (
            <Link
              key={id}
              href={`/admin/${id}`}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? colors.nav
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Search + Sign out */}
      <div className="shrink-0 border-t border-slate-200/60 p-4 space-y-3">
        <CommandPalette />
        <Button
          variant="ghost"
          size="sm"
          onClick={onSignOut}
          className="w-full justify-start gap-3 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          title="Sign out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign out</span>
        </Button>
      </div>
    </aside>
  )
}

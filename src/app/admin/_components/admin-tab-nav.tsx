'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Users, GraduationCap, BookOpen, Package, Newspaper, Briefcase, BarChart3 } from 'lucide-react'
import { ADMIN_TABS, type AdminTabId } from './admin-types'

const TAB_CONFIG: { id: AdminTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'training', label: 'Training', icon: GraduationCap },
  { id: 'documents', label: 'Documents', icon: BookOpen },
  { id: 'software', label: 'Software', icon: Package },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'careers', label: 'Careers', icon: Briefcase },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
]

function getTabButtonClass(activeTab: AdminTabId | null, id: AdminTabId) {
  const base = 'px-6 transition-all duration-200'
  if (activeTab !== id) return `${base} bg-transparent hover:bg-slate-50 dark:hover:bg-white/[0.06]`
  return `${base} bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-600 dark:to-blue-700 text-white shadow-md hover:from-blue-700 hover:to-blue-800`
}

export function AdminTabNav({ counts }: { counts?: Partial<Record<AdminTabId, number>> }) {
  const pathname = usePathname()
  const segment = pathname.replace(/^\/admin\/?/, '').split('/')[0]
  const activeTab = (ADMIN_TABS.includes(segment as AdminTabId) ? segment : null) as AdminTabId | null

  return (
    <div className="mb-8 hidden md:block">
      <div className="flex flex-wrap gap-2 bg-white dark:bg-[#141414] p-1.5 rounded-xl shadow-lg border border-slate-200 dark:border-white/[0.08] w-fit">
        {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={activeTab === id ? 'default' : 'ghost'}
            asChild
            className={getTabButtonClass(activeTab, id)}
          >
            <Link href={`/admin/${id}`}>
              <Icon className="h-4 w-4 mr-2" />
              {label}{counts?.[id] != null ? ` (${counts?.[id]})` : ''}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  )
}

export function AdminMobileTabNav({ counts }: { counts?: Partial<Record<AdminTabId, number>> }) {
  const pathname = usePathname()
  const segment = pathname.replace(/^\/admin\/?/, '').split('/')[0]
  const activeTab = (ADMIN_TABS.includes(segment as AdminTabId) ? segment : null) as AdminTabId | null

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white dark:bg-[#0f0f0f] border-t border-slate-200 dark:border-white/[0.06] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4 sm:grid-cols-7 h-auto min-h-14 py-1">
        {TAB_CONFIG.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          const activeColor = 'text-blue-600 dark:text-blue-400'
          return (
            <Link
              key={id}
              href={`/admin/${id}`}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors touch-manipulation ${
                isActive ? activeColor : 'text-slate-400 dark:text-zinc-500'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-[10px] font-medium truncate w-full text-center">{label}{counts?.[id] != null ? ` (${counts?.[id]})` : ''}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

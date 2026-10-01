'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Logo } from '@/components/Logo'
import { useAuthStore } from '@/store/auth-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PortalUserMenu } from '@/components/portal/portal-user-menu'
import {
  Bot,
  GraduationCap,
  FileText,
  Headphones,
  BookOpen,
  Crown,
  ChevronRight,
  Package,
  Newspaper,
  LayoutDashboard,
  Moon,
  Sun,
} from 'lucide-react'
import { useTheme } from 'next-themes'

const LOCKED_FEATURE_IDS = ['ai-assistant', 'view-documents', 'software']

const PUBLIC_REQUEST_QUOTE_URL = 'https://www.omniflow.com/request-a-quote'

const navItems = [
  { id: 'ai-assistant', title: 'AI Assistant', icon: Bot, href: '/ai-assistant' },
  { id: 'training', title: 'Training', icon: GraduationCap, href: '/training' },
  { id: 'submit-rfq', title: 'Request a Quote', icon: FileText, href: PUBLIC_REQUEST_QUOTE_URL },
  { id: 'support', title: 'Support', icon: Headphones, href: '/support' },
  { id: 'view-documents', title: 'Documents', icon: BookOpen, href: '/documents' },
  { id: 'software', title: 'Software', icon: Package, href: '/software' },
  { id: 'news', title: 'News', icon: Newspaper, href: '/news' },
]

function isExternalHref(href: string) {
  return href.startsWith('http://') || href.startsWith('https://')
}

function NavLink({
  item,
  isLocked,
  onPrefetch,
}: {
  item: (typeof navItems)[0]
  isLocked: boolean
  onPrefetch: (href: string) => void
}) {
  const pathname = usePathname()
  const isDisabled = isLocked && LOCKED_FEATURE_IDS.includes(item.id)
  const external = isExternalHref(item.href)
  const isActive = !external && pathname === item.href
  const Icon = item.icon

  const className = `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    isDisabled
      ? 'text-slate-400 cursor-not-allowed opacity-60'
      : isActive
        ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white'
        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-zinc-100'
  }`

  const content = (
    <>
      <Icon className="h-5 w-5 shrink-0" />
      <span>{item.title}</span>
      <ChevronRight className={`h-4 w-4 ml-auto shrink-0 ${isActive ? 'text-white/80' : 'text-slate-400'}`} />
    </>
  )

  if (isDisabled) {
    return <span className={className}>{content}</span>
  }

  if (external) {
    return (
      <a href={item.href} className={className} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    )
  }

  return (
    <Link
      href={item.href}
      className={className}
      prefetch
      onMouseEnter={() => onPrefetch(item.href)}
      onFocus={() => onPrefetch(item.href)}
    >
      {content}
    </Link>
  )
}

const PORTAL_ROUTES = [
  '/home',
  '/ai-assistant',
  '/training',
  '/support',
  '/documents',
  '/software',
  '/news',
  '/training/request',
  '/training/my-registrations',
  '/settings',
]

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuthStore()
  const isLocked = user?.locked === true
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDashboardActive = pathname === '/home'

  const prefetchRoute = (href: string) => {
    try {
      router.prefetch(href)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const prefetchAll = () => {
      PORTAL_ROUTES.forEach((route) => prefetchRoute(route))
    }
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(prefetchAll, { timeout: 2000 })
    } else {
      setTimeout(prefetchAll, 100)
    }
  }, [router])

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-[#0a0a0a]">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 h-screen bg-white dark:bg-[#0f0f0f] border-r border-slate-200 dark:border-white/[0.06]">
        <div className="p-5 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
          <Logo width={120} height={42} href="https://www.omniflow.com" />
        </div>
        <nav className="flex-1 min-h-0 p-3 space-y-0.5 overflow-y-auto">
          <Link
            href="/home"
            prefetch
            onMouseEnter={() => prefetchRoute('/home')}
            onFocus={() => prefetchRoute('/home')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isDashboardActive
                ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            <span>Dashboard</span>
            <ChevronRight className={`h-4 w-4 ml-auto shrink-0 ${isDashboardActive ? 'text-white/80' : 'text-slate-400'}`} />
          </Link>
          {navItems.map((item) => (
            <NavLink key={item.id} item={item} isLocked={isLocked} onPrefetch={prefetchRoute} />
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100 dark:border-white/[0.06] shrink-0 space-y-2">
          {user?.role?.toLowerCase() === 'admin' && (
            <Link
              href="/admin"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
            >
              <Crown className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>Admin Panel</span>
              <ChevronRight className="h-4 w-4 ml-auto text-slate-400" />
            </Link>
          )}
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 shrink-0" />
              ) : (
                <Moon className="h-4 w-4 shrink-0" />
              )}
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
          )}
          <PortalUserMenu user={user ?? null} variant="sidebar">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.04]"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={undefined} alt={user?.email || 'User'} />
                <AvatarFallback className="bg-blue-600 text-sm font-semibold text-white dark:bg-blue-500">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-zinc-100">
                  {user?.name || user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-zinc-500">{user?.email || ''}</p>
              </div>
            </button>
          </PortalUserMenu>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-white dark:bg-[#0f0f0f] border-b border-slate-200 dark:border-white/[0.06]">
          <Logo width={110} height={38} href="https://www.omniflow.com" />
          <div className="flex items-center gap-2">
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            )}
            <PortalUserMenu user={user ?? null} variant="mobile-header">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/[0.04]"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={undefined} alt={user?.email || 'User'} />
                  <AvatarFallback className="bg-blue-600 text-sm font-semibold text-white dark:bg-blue-500">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </PortalUserMenu>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-8 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { Command } from 'cmdk'
import {
  BookOpen,
  Newspaper,
  Package,
  GraduationCap,
  Users,
  Briefcase,
  BarChart3,
  Plus,
  Search,
  Home,
  Loader2,
  FileText,
  Mail,
  Newspaper as NewsIcon,
  Package as PkgIcon,
} from 'lucide-react'
import { fetchWithAdminAuth } from '@/lib/admin-fetch'
import { UserDetailModal } from '@/components/admin/user-detail-modal'
import { cn } from '@/lib/utils'

const COMMANDS = [
  { id: 'documents', label: 'Documents', icon: BookOpen, href: '/admin/documents', keywords: ['docs', 'pdf', 'manuals'] },
  { id: 'documents-add', label: 'Add Document', icon: Plus, href: '/admin/documents/add', keywords: ['add', 'upload', 'new'] },
  { id: 'news', label: 'News', icon: Newspaper, href: '/admin/news', keywords: ['articles'] },
  { id: 'news-add', label: 'Add Article', icon: Plus, href: '/admin/news/add', keywords: ['add', 'new'] },
  { id: 'careers', label: 'Careers', icon: Briefcase, href: '/admin/careers', keywords: ['jobs', 'openings', 'hiring'] },
  { id: 'careers-add', label: 'Add Job Opening', icon: Plus, href: '/admin/careers', keywords: ['add', 'job', 'hire'] },
  { id: 'software', label: 'Software', icon: Package, href: '/admin/software', keywords: ['downloads'] },
  { id: 'software-add', label: 'Add Software', icon: Plus, href: '/admin/software/add', keywords: ['add', 'new'] },
  { id: 'training', label: 'Training', icon: GraduationCap, href: '/admin/training', keywords: ['courses'] },
  { id: 'training-add', label: 'Add Course', icon: Plus, href: '/admin/training/add', keywords: ['add', 'new'] },
  { id: 'users', label: 'Users', icon: Users, href: '/admin/users', keywords: ['people'] },
  { id: 'users-add', label: 'Add User', icon: Plus, href: '/admin/users/add', keywords: ['invite'] },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/admin/analytics', keywords: ['stats', 'metrics'] },
  { id: 'home', label: 'Back to Portal', icon: Home, href: '/home', keywords: ['portal'] },
]

interface SearchResult {
  id: string
  label: string
  sublabel: string | null
  href: string
}

interface SearchResults {
  users: SearchResult[]
  manuals: SearchResult[]
  courses: SearchResult[]
  news: SearchResult[]
  software: SearchResult[]
}

const SEARCH_DEBOUNCE_MS = 250

function useSearchShortcut() {
  const [shortcut, setShortcut] = useState('Ctrl+K')
  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const platform = (navigator.platform || '').toLowerCase()
    const ua = (navigator.userAgent || '').toLowerCase()
    const isWin = /win|wow64|windows/.test(platform) || /win|wow64|windows/.test(ua)
    const isMac = /mac|iphone|ipad|ipod/.test(platform) || /mac|iphone|ipad/.test(ua)
    setShortcut(isMac && !isWin ? '⌘K' : 'Ctrl+K')
  }, [])
  return shortcut
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const searchShortcut = useSearchShortcut()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [userModalId, setUserModalId] = useState<string | null>(null)
  const router = useRouter()

  const fetchSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults(null)
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetchWithAdminAuth(`/api/admin/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (res.ok) {
        setSearchResults({
          users: data.users ?? [],
          manuals: data.manuals ?? [],
          courses: data.courses ?? [],
          news: data.news ?? [],
          software: data.software ?? [],
        })
      } else {
        setSearchResults(null)
      }
    } catch {
      setSearchResults(null)
    } finally {
      setSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(null)
      setSearchLoading(false)
      return
    }
    const t = setTimeout(() => fetchSearch(searchQuery), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchQuery, fetchSearch])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
        setSearchQuery('')
        setSearchResults(null)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleSelect = (href: string) => {
    if (href === '/login') {
      window.location.href = '/api/auth/logout'
      return
    }
    const userMatch = href.match(/^\/admin\/users\/([^/]+)$/)
    if (userMatch && !href.includes('/delete')) {
      const userId = userMatch[1]
      setOpen(false)
      // Full navigation to ensure we land on /admin/users and the page opens the modal from ?user=
      window.location.href = `/admin/users?user=${encodeURIComponent(userId)}`
      return
    }
    setOpen(false)
    router.push(href)
  }

  const showSearchResults = searchQuery.length >= 2
  const hasResults = searchResults && (
    searchResults.users.length > 0 ||
    searchResults.manuals.length > 0 ||
    searchResults.courses.length > 0 ||
    searchResults.news.length > 0 ||
    searchResults.software.length > 0
  )

  const itemClass = cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm',
    'data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-700 data-[selected=true]:outline-none',
    'dark:data-[selected=true]:bg-blue-500/20 dark:data-[selected=true]:text-blue-400'
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-zinc-400',
          'border border-slate-200/80 dark:border-white/[0.12] bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm',
          'hover:border-blue-300 dark:hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-500/10',
          'transition-all duration-200 shadow-sm'
        )}
      >
        <Search className="h-4 w-4" />
        <span>Search...</span>
        <kbd className="ml-1 px-1.5 py-0.5 text-xs font-mono bg-slate-100 dark:bg-white/[0.08] rounded border border-slate-200 dark:border-white/[0.12] text-slate-400 dark:text-zinc-500">
          {searchShortcut}
        </kbd>
      </button>

      {/*
        modal={false}: Radix does not mount RemoveScroll (no body scroll lock).
        cmdk's Command.Dialog always uses modal Radix dialog → scrollbar disappears → layout shift.
      */}
      <Dialog.Root
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) {
            setSearchQuery('')
            setSearchResults(null)
          }
        }}
        modal={false}
      >
        <Dialog.Portal>
          <div
            className={cn(
              'fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 dark:bg-black/55',
              open ? 'opacity-100' : 'pointer-events-none opacity-0'
            )}
            aria-hidden
            onClick={() => {
              setOpen(false)
              setSearchQuery('')
              setSearchResults(null)
            }}
          />
          <Dialog.Content
            aria-describedby={undefined}
            className={cn(
              'fixed left-1/2 top-[20%] z-[101] w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-2xl shadow-slate-900/20 outline-none backdrop-blur-xl',
              'dark:border-white/[0.08] dark:bg-[#141414]/95 dark:shadow-black/40',
              'animate-in fade-in-0 zoom-in-95 duration-200',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
            )}
            onOpenAutoFocus={(e) => {
              e.preventDefault()
              requestAnimationFrame(() => {
                const el = document.querySelector<HTMLInputElement>('[cmdk-input]')
                el?.focus()
              })
            }}
          >
            <Dialog.Title className="sr-only">Quick navigation</Dialog.Title>
            <Command label="Quick navigation" shouldFilter={!showSearchResults}>
        <div className="flex items-center gap-3 border-b border-slate-200/80 dark:border-white/[0.06] px-4 py-3">
          <Search className="h-4 w-4 text-slate-400 dark:text-zinc-500 shrink-0" />
          <Command.Input
            placeholder="Search users, documents, courses..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-500"
          />
          <kbd className="hidden sm:inline px-2 py-1 text-xs font-mono text-slate-400 dark:text-zinc-500 bg-slate-100 dark:bg-white/[0.08] rounded">ESC</kbd>
        </div>
        <Command.List className="max-h-[360px] overflow-y-auto p-2">
          {showSearchResults ? (
            <>
              {searchLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-slate-500 dark:text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Searching...</span>
                </div>
              ) : !hasResults ? (
                <Command.Empty className="py-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                  No users, documents, or items found.
                </Command.Empty>
              ) : (
                <>
                  {searchResults!.users.length > 0 && (
                    <Command.Group heading="Users" className="mb-2">
                      {searchResults!.users.map((u) => (
                        <Command.Item
                          key={`user-${u.id}`}
                          value={`${u.label} ${u.sublabel ?? ''}`}
                          onSelect={() => handleSelect(u.href)}
                          className={itemClass}
                        >
                          <Users className="h-4 w-4 text-slate-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{u.label}</p>
                            {u.sublabel && <p className="text-xs text-slate-500 truncate">{u.sublabel}</p>}
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  {searchResults!.manuals.length > 0 && (
                    <Command.Group heading="Documents" className="mb-2">
                      {searchResults!.manuals.map((m) => (
                        <Command.Item
                          key={`manual-${m.id}`}
                          value={`${m.label} ${m.sublabel ?? ''}`}
                          onSelect={() => handleSelect(m.href)}
                          className={itemClass}
                        >
                          <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{m.label}</p>
                            {m.sublabel && <p className="text-xs text-slate-500 truncate">{m.sublabel}</p>}
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  {searchResults!.courses.length > 0 && (
                    <Command.Group heading="Courses" className="mb-2">
                      {searchResults!.courses.map((c) => (
                        <Command.Item
                          key={`course-${c.id}`}
                          value={c.label}
                          onSelect={() => handleSelect(c.href)}
                          className={itemClass}
                        >
                          <GraduationCap className="h-4 w-4 text-blue-500 shrink-0" />
                          <p className="font-medium truncate">{c.label}</p>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  {searchResults!.news.length > 0 && (
                    <Command.Group heading="News" className="mb-2">
                      {searchResults!.news.map((n) => (
                        <Command.Item
                          key={`news-${n.id}`}
                          value={`${n.label} ${n.sublabel ?? ''}`}
                          onSelect={() => handleSelect(n.href)}
                          className={itemClass}
                        >
                          <NewsIcon className="h-4 w-4 text-blue-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{n.label}</p>
                            {n.sublabel && <p className="text-xs text-slate-500 truncate">{n.sublabel}</p>}
                          </div>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  {searchResults!.software.length > 0 && (
                    <Command.Group heading="Software" className="mb-2">
                      {searchResults!.software.map((s) => (
                        <Command.Item
                          key={`software-${s.id}`}
                          value={s.label}
                          onSelect={() => handleSelect(s.href)}
                          className={itemClass}
                        >
                          <PkgIcon className="h-4 w-4 text-blue-500 shrink-0" />
                          <p className="font-medium truncate">{s.label}</p>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <Command.Empty className="py-8 text-center text-sm text-slate-500 dark:text-zinc-400">No results found.</Command.Empty>
              <Command.Group heading="Navigate" className="mb-2">
                {COMMANDS.filter((c) => !c.id.includes('-add')).map((cmd) => {
                  const Icon = cmd.icon
                  return (
                    <Command.Item
                      key={cmd.id}
                      value={`${cmd.label} ${cmd.keywords?.join(' ') ?? ''}`}
                      onSelect={() => handleSelect(cmd.href)}
                      className={itemClass}
                    >
                      <Icon className="h-4 w-4 text-slate-500 shrink-0" />
                      {cmd.label}
                    </Command.Item>
                  )
                })}
              </Command.Group>
              <Command.Group heading="Quick actions" className="border-t border-slate-100 dark:border-white/[0.06] pt-2">
                {COMMANDS.filter((c) => c.id.includes('-add')).map((cmd) => {
                  const Icon = cmd.icon
                  return (
                    <Command.Item
                      key={cmd.id}
                      value={`${cmd.label} ${cmd.keywords?.join(' ') ?? ''}`}
                      onSelect={() => handleSelect(cmd.href)}
                      className={itemClass}
                    >
                      <Icon className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="font-medium">{cmd.label}</span>
                    </Command.Item>
                  )
                })}
              </Command.Group>
            </>
          )}
        </Command.List>
        <div className="border-t border-slate-100 dark:border-white/[0.06] px-4 py-2 flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500">
          <span>↑↓</span> <span>navigate</span>
          <span className="mx-2">•</span>
          <span>↵</span> <span>select</span>
        </div>
            </Command>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <UserDetailModal
        userId={userModalId}
        open={!!userModalId}
        onOpenChange={(o) => !o && setUserModalId(null)}
      />
    </>
  )
}

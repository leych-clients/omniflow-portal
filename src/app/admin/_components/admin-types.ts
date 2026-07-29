export interface User {
  id: string
  name?: string
  email: string
  role: 'admin' | 'client'
  status: 'active' | 'inactive' | 'pending'
  lastLogin?: string
  createdAt: string
  avatarUrl?: string
  locked?: boolean
}

export interface Course {
  id: string
  title: string
  description: string | null
  duration: string
  thumbnail: string | null
  featured: boolean
  sort_order: number
  created_at: string
  topics?: string | null
  price?: number | null
  early_bird_price?: number | null
  format?: string | null
  prerequisite_course_id?: string | null
}

export interface Manual {
  id: string
  title: string
  category?: string
  tags: string[]
  filename: string
  storage_path: string
  size: string | null
  description: string | null
  created_at: string
  download_url?: string
  /** Lower = higher on /documents among pinned; null/undefined = not pinned */
  pinned_rank?: number | null
}

export interface NewsArticle {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  image_url: string | null
  featured: boolean
  published_at: string
  created_at: string
}

export interface Invite {
  id: string
  email: string
  token: string
  expires_at: string
  used: boolean
  created_at: string
  created_by?: string
}

export interface SoftwareItem {
  id: string
  title: string
  filename: string
  storage_path: string
  size: string | null
  description: string | null
  created_at: string
}

export interface JobOpening {
  id: string
  title: string
  slug: string
  department: string | null
  location: string | null
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship'
  summary: string | null
  description: string | null
  apply_email: string | null
  status: 'open' | 'closed' | 'draft'
  posted_at: string | null
  sort_order: number
  created_at: string
  updated_at?: string
}

export const ADMIN_TABS = ['users', 'training', 'documents', 'software', 'news', 'careers', 'analytics'] as const
export type AdminTabId = (typeof ADMIN_TABS)[number]

export type AdminNavTabId = 'dashboard' | AdminTabId

const TAB_BLUE = {
  nav: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  mobile: 'text-blue-600 dark:text-blue-400',
  dashboard: {
    border: 'border-l-blue-500 dark:border-l-blue-500',
    icon: 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    pills: 'border-blue-100 bg-blue-50/40 dark:border-blue-500/30 dark:bg-blue-500/15',
  },
} as const

/** Per-section accent colors - unified blue theme for header nav and page dashboards */
export const ADMIN_TAB_COLORS: Record<AdminNavTabId, {
  nav: string
  mobile: string
  dashboard: { border: string; icon: string; pills: string }
}> = {
  dashboard: { ...TAB_BLUE },
  users: { ...TAB_BLUE },
  training: { ...TAB_BLUE },
  documents: { ...TAB_BLUE },
  software: { ...TAB_BLUE },
  news: { ...TAB_BLUE },
  careers: { ...TAB_BLUE },
  analytics: { ...TAB_BLUE },
}

export function employmentTypeLabel(type: string): string {
  switch (type) {
    case 'full_time':
      return 'Full-time'
    case 'part_time':
      return 'Part-time'
    case 'contract':
      return 'Contract'
    case 'internship':
      return 'Internship'
    default:
      return type
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
    case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
    case 'inactive': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30'
    case 'published': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
    case 'open': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
    case 'closed': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-zinc-400 dark:border-white/20'
    case 'draft': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
    case 'archived': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-zinc-400 dark:border-white/20'
    case 'in-review': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30'
    case 'quoted': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30'
    case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
    case 'rejected': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30'
    default: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-zinc-400 dark:border-white/20'
  }
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

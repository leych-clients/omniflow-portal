'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardSkeleton } from '@/components/ui/dashboard-skeleton'
import { SearchBarSkeleton } from '@/components/ui/search-bar-skeleton'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { fetchWithAdminAuth } from '@/lib/admin-fetch'
import { AdminPageDashboard } from '@/components/admin/admin-page-dashboard'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BarChart3, Loader2, XCircle, Activity, ChevronDown } from 'lucide-react'
import { formatDate } from '../_components/admin-types'

interface AnalyticsEvent {
  id: string
  event_type: string
  user_id: string
  user_email: string | null
  user_name: string | null
  resource_type: string | null
  resource_id: string | null
  resource_label: string
  metadata: Record<string, unknown>
  created_at: string
}

interface AiStats {
  total: number
  last_30_days: number
  failed: number
}

const EVENT_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  document_download: 'Document',
  software_download: 'Software',
  user_unlock: 'User unlocked',
  user_lock: 'User locked',
  ai_interaction: 'AI interaction',
}

function EventResource({ evt }: { evt: AnalyticsEvent }) {
  if (evt.event_type === 'login' || evt.event_type === 'logout') {
    return (
      <span className="text-xs" title={JSON.stringify(evt.metadata)}>
        {(evt.metadata as { ip?: string })?.ip || '—'}
      </span>
    )
  }

  if (evt.event_type === 'ai_interaction') {
    const { question, status, duration_ms } = evt.metadata as {
      question?: string
      status?: string
      duration_ms?: number
    }
    const failed = status === 'error'
    return (
      <div className="space-y-1 max-w-md">
        <p className="text-sm line-clamp-2 break-words" title={question}>
          {question || '—'}
        </p>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          <span className={failed ? 'font-medium text-rose-600 dark:text-rose-400' : 'font-medium text-emerald-600 dark:text-emerald-400'}>
            {failed ? 'Failed' : 'Answered'}
          </span>
          {typeof duration_ms === 'number' && ` · ${(duration_ms / 1000).toFixed(1)}s`}
        </p>
      </div>
    )
  }

  return <>{evt.resource_label}</>
}

export default function AdminAnalyticsPage() {
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState('')
  const [analyticsEventTypeFilter, setAnalyticsEventTypeFilter] = useState('')
  const [aiStats, setAiStats] = useState<AiStats>({ total: 0, last_30_days: 0, failed: 0 })

  const fetchAnalytics = useCallback(async (filterOverride?: string) => {
    setAnalyticsLoading(true)
    setAnalyticsError('')
    try {
      const params = new URLSearchParams()
      const filter = filterOverride ?? analyticsEventTypeFilter
      if (filter) params.set('event_type', filter)
      const res = await fetchWithAdminAuth(`/api/analytics/events?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load analytics')
      setAnalyticsEvents(data.events ?? [])
      if (data.ai_stats) setAiStats(data.ai_stats)
    } catch (e: unknown) {
      setAnalyticsError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
      setAnalyticsLoading(false)
    }
  }, [analyticsEventTypeFilter])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  const handleFilterChange = (value: string) => {
    setAnalyticsEventTypeFilter(value)
    fetchAnalytics(value)
  }

  const uniqueUsers = new Set(analyticsEvents.map((e) => e.user_id)).size
  const uniqueEventTypes = new Set(analyticsEvents.map((e) => e.event_type)).size

  const dashboardStats = [
    { label: 'Events', value: analyticsEvents.length },
    { label: 'Unique users', value: uniqueUsers },
    { label: 'Event types', value: uniqueEventTypes },
    { label: 'AI interactions', value: aiStats.total },
    { label: 'AI (30 days)', value: aiStats.last_30_days },
    { label: 'AI failures', value: aiStats.failed },
  ]

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {analyticsLoading ? (
        <DashboardSkeleton statCount={6} />
      ) : !analyticsError ? (
        <AdminPageDashboard
          title="Analytics"
          description="Activity events and usage metrics"
          icon={<BarChart3 className="h-6 w-6" />}
          stats={dashboardStats}
          accent="analytics"
        />
      ) : null}
      {analyticsLoading ? (
        <SearchBarSkeleton />
      ) : (
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="sr-only">Event type</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto h-11 px-4 rounded-xl border border-slate-200 dark:border-white/[0.12] bg-white dark:bg-[#141414] text-sm text-slate-700 dark:text-zinc-100 shadow-sm hover:bg-zinc-50 dark:hover:bg-white/[0.06] justify-between"
              >
                <span>
                  {analyticsEventTypeFilter
                    ? EVENT_LABELS[analyticsEventTypeFilter] ?? analyticsEventTypeFilter
                    : 'All events'}
                </span>
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[180px]">
              <DropdownMenuRadioGroup
                value={analyticsEventTypeFilter}
                onValueChange={handleFilterChange}
              >
                <DropdownMenuRadioItem value="">All events</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="login">Login</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="logout">Logout</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="document_download">Document download</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="software_download">Software download</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="ai_interaction">AI interaction</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      )}

      {analyticsLoading ? (
        <TableSkeleton rowCount={8} colCount={4} />
      ) : analyticsError ? (
        <div className="border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/30 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-500/20">
            <XCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
          <span className="text-sm font-medium text-rose-800 dark:text-rose-400">{analyticsError}</span>
        </div>
      ) : analyticsEvents.length === 0 ? (
        <div className="border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141414] rounded-2xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
            <Activity className="h-8 w-8 text-blue-500 dark:text-blue-400" />
          </div>
          <p className="text-base font-semibold text-slate-700 dark:text-zinc-200 mb-2">No activity yet</p>
          <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
            Document downloads, logins, AI interactions, and other events will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {analyticsEvents.map((evt) => (
              <div
                key={evt.id}
                className="border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141414] rounded-2xl p-4 space-y-3 shadow-sm"
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">User</p>
                  <p className="font-medium text-slate-900 dark:text-zinc-100 text-sm mt-0.5">
                    {evt.user_name || evt.user_email || evt.user_id}
                  </p>
                  {evt.user_name && evt.user_email && (
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 break-all">{evt.user_email}</p>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">Event</p>
                  <div className="mt-1">
                    <Badge
                      variant="secondary"
                      className="text-xs border-blue-200 dark:border-blue-500/40 bg-blue-50/60 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400 font-medium"
                    >
                      {evt.event_type.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">Resource</p>
                  <div className="text-sm text-slate-700 dark:text-zinc-300 mt-0.5 break-words">
                    <EventResource evt={evt} />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">When</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{formatDate(evt.created_at)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141414] rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.03]">
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-zinc-400">User</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-zinc-400">Event</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-zinc-400">Resource</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-zinc-400">When</th>
                </tr>
              </thead>
              <tbody>
                {analyticsEvents.map((evt) => (
                  <tr key={evt.id} className="border-b border-slate-100 dark:border-white/[0.04] last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.04]">
                    <td className="py-4 px-4">
                      <div className="font-medium text-slate-900 dark:text-zinc-100">
                        {evt.user_name || evt.user_email || evt.user_id}
                      </div>
                      {evt.user_name && evt.user_email && (
                        <div className="text-xs text-slate-500 dark:text-zinc-400">{evt.user_email}</div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <Badge
                        variant="secondary"
                        className="text-xs border-blue-200 dark:border-blue-500/40 bg-blue-50/60 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400 font-medium"
                      >
                        {evt.event_type.replaceAll('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-slate-700 dark:text-zinc-300">
                      <EventResource evt={evt} />
                    </td>
                    <td className="py-4 px-4 text-slate-500 dark:text-zinc-400 text-xs">{formatDate(evt.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

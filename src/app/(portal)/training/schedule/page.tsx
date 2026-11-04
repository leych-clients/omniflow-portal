'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { TrainingHubNav } from '@/components/portal/training-hub-nav'
import { TrainingSkeleton } from '@/components/portal/skeletons'
import { Calendar } from 'lucide-react'
import {
  formatTrainingSessionListSummary,
  type TrainingSessionDay,
} from '@/lib/format-training-session-schedule'
import {
  publicTrainingSessionStatusLabel,
  shouldShowTrainingSessionStatusBadge,
  trainingSessionCannotSelfServeSignup,
  trainingSessionOffersWaitlist,
} from '@/lib/training-session-public'

interface UpcomingSession {
  id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  timezone: string
  location: string
  status: string
  waitlist_enabled: boolean
  spots_remaining: number
  registration_closes_at: string | null
  days: TrainingSessionDay[]
}

/** YYYY-MM-DD in the session's timezone for stable grouping */
function sessionDayKey(iso: string, timeZone: string | undefined): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso))
  } catch {
    return new Date(iso).toISOString().slice(0, 10)
  }
}

function sessionDayLabel(iso: string, timeZone: string | undefined): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timeZone || undefined,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso))
  } catch {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'full' })
  }
}

export default function TrainingSchedulePage() {
  const [sessions, setSessions] = useState<UpcomingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/training/sessions')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; items: UpcomingSession[] }>()
    for (const s of sessions) {
      const key = sessionDayKey(s.starts_at, s.timezone)
      let group = map.get(key)
      if (!group) {
        group = { label: sessionDayLabel(s.starts_at, s.timezone), items: [] }
        map.set(key, group)
      }
      group.items.push(s)
    }
    const keys = [...map.keys()].sort()
    return keys.map((k) => ({ key: k, ...map.get(k)! }))
  }, [sessions])

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl py-6">
        <TrainingHubNav activeTab="schedule" />
        <TrainingSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-7xl py-6">
        <TrainingHubNav activeTab="schedule" />
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl py-6">
      <TrainingHubNav activeTab="schedule" />

      <div className="space-y-8">
        {sessions.length === 0 ? (
          <Card className="border border-slate-200 dark:border-white/[0.08]">
            <CardContent className="p-8 text-center text-slate-600 dark:text-zinc-400">
              <Calendar className="mx-auto mb-4 h-12 w-12 opacity-40" />
              <p className="font-medium text-slate-800 dark:text-zinc-200">No upcoming classes</p>
              <p className="mt-2 text-sm">Check back later, or get in touch for help, information, or a quote.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
                  <Link href="/training">Browse courses</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/training/request">Support & quotes</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          grouped.map(({ key, label, items }) => (
            <section key={key} className="space-y-3">
              <h2 className="border-b border-slate-200 pb-2 text-lg font-semibold text-slate-900 dark:border-white/[0.08] dark:text-zinc-100">
                {label}
              </h2>
              <ul className="space-y-3">
                {items.map((s) => {
                  const signupBlocked = trainingSessionCannotSelfServeSignup(
                    s.status,
                    s.registration_closes_at,
                    s.waitlist_enabled
                  )
                  const offersWaitlist = !signupBlocked && trainingSessionOffersWaitlist(s)
                  return (
                  <li key={s.id}>
                    <Card className="border border-slate-200 dark:border-white/[0.08] shadow-sm transition-shadow hover:shadow-md">
                      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-900 dark:text-zinc-100">{s.title}</h3>
                            {shouldShowTrainingSessionStatusBadge(s.status) && (
                              <Badge variant="outline" className="font-normal capitalize shrink-0">
                                {publicTrainingSessionStatusLabel(s.status)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-zinc-400">
                            {formatTrainingSessionListSummary(s.days ?? [], s.timezone, undefined)}
                            <span className="text-slate-400 dark:text-zinc-600"> · </span>
                            {s.location || 'TBA'}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                          {offersWaitlist ? (
                            <>
                              <Button asChild variant="secondary" className="w-full sm:w-auto">
                                <Link href={`/training/sessions/${s.id}/signup?waitlist=1`}>Full - join waitlist</Link>
                              </Button>
                              <Link
                                href={`/training/sessions/${s.id}`}
                                className="text-center text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 sm:text-right"
                              >
                                View class details
                              </Link>
                            </>
                          ) : signupBlocked ? (
                            <>
                              <Button type="button" disabled variant="secondary" className="w-full sm:w-auto">
                                Signup unavailable
                              </Button>
                              <Link
                                href={`/training/sessions/${s.id}`}
                                className="text-center text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 sm:text-right"
                              >
                                View class details
                              </Link>
                            </>
                          ) : (
                            <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
                              <Link href={`/training/sessions/${s.id}`}>View & sign up</Link>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  )
}

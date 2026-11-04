'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fetchWithAuthRetry } from '@/lib/fetch-with-auth'
import { ArrowLeft, Loader2, MapPin, Video } from 'lucide-react'
import { TrainingSkeleton } from '@/components/portal/skeletons'
import { SafeHtml } from '@/components/portal/safe-html'
import { stripHtml } from '@/lib/strip-html'
import { TrainingScheduleDisplay } from '@/components/portal/training-schedule-display'
import type { TrainingSessionDay } from '@/lib/format-training-session-schedule'
import {
  isTrainingSessionSignupBlockedByStatus,
  shouldShowTrainingSessionStatusBadge,
  trainingSessionOffersWaitlist,
  publicTrainingSessionStatusLabel,
  trainingSessionCannotSelfServeSignup,
} from '@/lib/training-session-public'

interface CourseForSession {
  id: string
  title: string
  description: string | null
  topics: string | null
  duration: string | null
  format: string | null
  thumbnail: string | null
  featured: boolean
  price: number | null
  early_bird_price: number | null
  prerequisite: { id: string; title: string } | null
}

interface SessionDetail {
  id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  timezone: string
  location: string
  status: string
  registration_closes_at: string | null
  waitlist_enabled: boolean
  spots_remaining: number
  my_registration: { id: string; status: string } | null
  course?: CourseForSession | null
  days: TrainingSessionDay[]
}

function formatPriceAmount(n: number) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

export default function TrainingSessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : ''
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchWithAuthRetry(`/api/training/sessions/${id}`)
      .then((res) => {
        if (res.status === 401) {
          router.push('/login')
          throw new Error('Unauthorized')
        }
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then(setSession)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, [id, router])

  const refresh = () => {
    if (!id) return
    fetchWithAuthRetry(`/api/training/sessions/${id}`)
      .then((res) => res.json())
      .then(setSession)
      .catch(() => {})
  }

  const cancel = async () => {
    if (!id) return
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetchWithAuthRetry(`/api/training/sessions/${id}/register`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not cancel signup')
      refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <TrainingSkeleton />
  if (error && !session) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Button asChild variant="outline">
          <Link href="/training">Back to Training</Link>
        </Button>
      </div>
    )
  }
  if (!session) return null

  const mine = session.my_registration
  const signupClosed = trainingSessionCannotSelfServeSignup(
    session.status,
    session.registration_closes_at,
    session.waitlist_enabled
  )
  const offersWaitlist = trainingSessionOffersWaitlist(session)

  return (
    <div className="max-w-3xl mx-auto w-full py-6 space-y-6">
      <Button asChild variant="ghost" className="gap-2 -ml-2 text-zinc-600 dark:text-zinc-400">
        <Link href="/training">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2 min-w-0">
              <CardTitle className="text-2xl">{session.title}</CardTitle>
              {shouldShowTrainingSessionStatusBadge(session.status) && (
                <Badge variant="outline" className="font-normal capitalize">
                  {publicTrainingSessionStatusLabel(session.status)}
                </Badge>
              )}
            </div>
            {mine?.status === 'registered' && (
              <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">Signed up</Badge>
            )}
            {mine?.status === 'waitlisted' && (
              <Badge variant="outline" className="border-amber-300 dark:border-amber-500/40">Waitlisted</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 text-sm text-slate-700 dark:text-zinc-300">
            <TrainingScheduleDisplay
              days={session.days ?? []}
              timezone={session.timezone}
            />
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
              <span>{session.location || 'TBA'}</span>
            </div>
          </div>

          {session.description && (
            <p className="text-sm text-slate-600 dark:text-zinc-400 whitespace-pre-wrap">{session.description}</p>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            {!mine && !signupClosed && session.spots_remaining > 0 && (
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href={`/training/sessions/${id}/signup`}>Sign up</Link>
              </Button>
            )}
            {!mine && !signupClosed && offersWaitlist && (
              <Button asChild variant="secondary">
                <Link href={`/training/sessions/${id}/signup?waitlist=1`}>Join waitlist</Link>
              </Button>
            )}
            {!mine && signupClosed && (
              <p className="text-sm text-slate-600 dark:text-zinc-400">
                {isTrainingSessionSignupBlockedByStatus(session.status, session.waitlist_enabled)
                  ? `This class is ${publicTrainingSessionStatusLabel(session.status).toLowerCase()}. Signup is not available.`
                  : 'Signup for this class has closed.'}
              </p>
            )}
            {mine && (
              <Button onClick={cancel} disabled={actionLoading} variant="outline">
                {mine.status === 'waitlisted' ? 'Leave waitlist' : 'Cancel signup'}
              </Button>
            )}
          </div>
          {!mine && !signupClosed && (session.spots_remaining > 0 || offersWaitlist) && (
            <p className="text-xs text-slate-500 dark:text-zinc-500">
              Signing up reserves your spot; payment is handled offline (for example by purchase order).
            </p>
          )}
        </CardContent>
      </Card>

      {session.course && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-slate-900 dark:text-zinc-100">About this course</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="w-full shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-white/[0.08] dark:bg-white/[0.04] sm:w-52">
                {session.course.thumbnail?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.course.thumbnail.trim()}
                    alt=""
                    className="aspect-video w-full object-cover sm:aspect-[4/3]"
                  />
                ) : (
                  <div className="flex aspect-video min-h-[120px] items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 dark:from-white/[0.06] dark:to-white/[0.02] sm:aspect-[4/3]">
                    <Video className="h-12 w-12 text-slate-400 dark:text-zinc-600" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {session.course.featured && (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">Featured</Badge>
                  )}
                  {session.course.format && (
                    <Badge variant="secondary" className="font-normal">
                      {session.course.format}
                    </Badge>
                  )}
                  {session.course.duration && (
                    <Badge variant="secondary" className="font-normal">
                      {session.course.duration}
                    </Badge>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                  <Link
                    href={`/training/courses/${session.course.id}`}
                    className="hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                  >
                    {session.course.title}
                  </Link>
                </h2>
                {(session.course.price != null || session.course.early_bird_price != null) && (
                  <p className="text-sm text-slate-700 dark:text-zinc-300">
                    {session.course.price != null && (
                      <span>
                        Price: <span className="font-semibold">${formatPriceAmount(session.course.price)}</span>
                      </span>
                    )}
                    {session.course.price != null && session.course.early_bird_price != null && (
                      <span className="text-slate-400 dark:text-zinc-500"> · </span>
                    )}
                    {session.course.early_bird_price != null && (
                      <span>
                        Early bird:{' '}
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          ${formatPriceAmount(session.course.early_bird_price)}
                        </span>
                      </span>
                    )}
                  </p>
                )}
                {session.course.prerequisite && (
                  <p className="text-sm text-slate-600 dark:text-zinc-400">
                    Prerequisite:{' '}
                    <Link
                      href={`/training/courses/${session.course.prerequisite.id}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {session.course.prerequisite.title}
                    </Link>
                  </p>
                )}
                {session.course.description && stripHtml(session.course.description) ? (
                  <SafeHtml html={session.course.description} className="text-sm text-slate-700 dark:text-zinc-300" />
                ) : null}
                {session.course.topics && stripHtml(session.course.topics) ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Topics</h3>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm dark:border-white/[0.08] dark:bg-white/[0.04]">
                      <SafeHtml html={session.course.topics} />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={`/training/courses/${session.course.id}`}>View full course page</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

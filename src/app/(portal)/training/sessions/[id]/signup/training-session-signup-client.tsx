'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchWithAuthRetry } from '@/lib/fetch-with-auth'
import { ArrowLeft, Loader2, MapPin } from 'lucide-react'
import { TrainingSkeleton } from '@/components/portal/skeletons'
import {
  TrainingEnrollmentForm,
  type ProfilePrefill,
} from '@/components/portal/training-enrollment-form'
import type { TrainingEnrollmentBody } from '@/lib/training-enrollment'
import {
  isTrainingSessionSignupBlockedByStatus,
  publicTrainingSessionStatusLabel,
  trainingSessionCannotSelfServeSignup,
} from '@/lib/training-session-public'
import { TrainingScheduleDisplay } from '@/components/portal/training-schedule-display'
import type { TrainingSessionDay } from '@/lib/format-training-session-schedule'

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
  days: TrainingSessionDay[]
}

export function TrainingSessionSignupClient() {
  const params = useParams()
  const sessionId = typeof params.id === 'string' ? params.id : ''
  const router = useRouter()
  const searchParams = useSearchParams()
  const waitlistParam = searchParams.get('waitlist')

  const [session, setSession] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfilePrefill | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const wantWaitlist = waitlistParam === '1'

  const loadSession = useCallback((): Promise<void> => {
    if (!sessionId) return Promise.resolve()
    return fetchWithAuthRetry(`/api/training/sessions/${sessionId}`)
      .then((res) => {
        if (res.status === 401) {
          router.push('/login')
          throw new Error('Unauthorized')
        }
        if (!res.ok) throw new Error('Failed to load')
        return res.json() as Promise<SessionDetail>
      })
      .then((data) => {
        setSession(data)
      })
  }, [sessionId, router])

  useEffect(() => {
    if (!sessionId) return
    setLoading(true)
    setError(null)
    loadSession()
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, [sessionId, loadSession])

  useEffect(() => {
    fetchWithAuthRetry('/api/profile')
      .then((res) => {
        if (res.status === 401) return null
        if (!res.ok) return null
        return res.json() as Promise<ProfilePrefill>
      })
      .then((p) => {
        if (p?.email) setProfile(p)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!session || !sessionId) return
    if (session.my_registration) {
      router.replace(`/training/sessions/${sessionId}`)
      return
    }
    const closed = trainingSessionCannotSelfServeSignup(
      session.status,
      session.registration_closes_at,
      session.waitlist_enabled
    )
    if (closed) return

    if (!wantWaitlist && session.spots_remaining <= 0 && session.waitlist_enabled) {
      router.replace(`/training/sessions/${sessionId}/signup?waitlist=1`)
      return
    }
    if (wantWaitlist && session.spots_remaining > 0) {
      router.replace(`/training/sessions/${sessionId}/signup`)
      return
    }
    if (wantWaitlist && (!session.waitlist_enabled || session.spots_remaining > 0)) {
      router.replace(`/training/sessions/${sessionId}`)
    }
  }, [session, sessionId, router, wantWaitlist])

  const submitEnrollment = async (body: TrainingEnrollmentBody) => {
    if (!sessionId) throw new Error('Missing session.')
    setSubmitting(true)
    try {
      const res = await fetchWithAuthRetry(`/api/training/sessions/${sessionId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Could not complete signup')
      }
      router.push(`/training/sessions/${sessionId}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not complete signup'
      throw new Error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!sessionId) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center px-4">
        <p className="text-red-600 dark:text-red-400 mb-4">Invalid class link.</p>
        <Button asChild variant="outline">
          <Link href="/training">Back to Training</Link>
        </Button>
      </div>
    )
  }

  if (loading) return <TrainingSkeleton />
  if (error && !session) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center px-4">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Button asChild variant="outline">
          <Link href="/training">Back to Training</Link>
        </Button>
      </div>
    )
  }
  if (!session) return null

  const signupClosed = trainingSessionCannotSelfServeSignup(
    session.status,
    session.registration_closes_at,
    session.waitlist_enabled
  )

  if (session.my_registration) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-zinc-500" />
      </div>
    )
  }

  if (signupClosed) {
    return (
      <div className="max-w-xl mx-auto w-full py-6 space-y-4 px-4">
        <Button asChild variant="ghost" className="gap-2 -ml-2 text-zinc-600 dark:text-zinc-400">
          <Link href={`/training/sessions/${sessionId}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to class
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Signup not available</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-zinc-400">
            {isTrainingSessionSignupBlockedByStatus(session.status, session.waitlist_enabled)
              ? `This class is ${publicTrainingSessionStatusLabel(session.status).toLowerCase()}. Signup is not available.`
              : 'Signup for this class has closed.'}
            <div className="pt-4">
              <Button asChild variant="outline">
                <Link href={`/training/sessions/${sessionId}`}>View class</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (session.spots_remaining <= 0 && !session.waitlist_enabled) {
    return (
      <div className="max-w-xl mx-auto w-full py-6 space-y-4 px-4">
        <Button asChild variant="ghost" className="gap-2 -ml-2 text-zinc-600 dark:text-zinc-400">
          <Link href={`/training/sessions/${sessionId}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to class
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Class is full</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-zinc-400">
            This class has no open seats and the waitlist is not enabled for this session.
            <div className="pt-4">
              <Button asChild variant="outline">
                <Link href={`/training/sessions/${sessionId}`}>View class</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const variant: 'register' | 'waitlist' =
    wantWaitlist && session.spots_remaining <= 0 && session.waitlist_enabled
      ? 'waitlist'
      : 'register'

  return (
    <div className="max-w-xl mx-auto w-full py-6 space-y-6 px-4">
      <Button asChild variant="ghost" className="gap-2 -ml-2 text-zinc-600 dark:text-zinc-400">
        <Link href={`/training/sessions/${sessionId}`}>
          <ArrowLeft className="h-4 w-4" />
          Back to class
        </Link>
      </Button>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl leading-snug">{session.title}</CardTitle>
          <div className="flex flex-col gap-2 text-sm text-slate-600 dark:text-zinc-400">
            <TrainingScheduleDisplay
              days={session.days ?? []}
              timezone={session.timezone}
            />
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
              <span>{session.location || 'TBA'}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-xs text-slate-500 dark:text-zinc-500">
            Signing up reserves your spot; payment is handled offline (for example by purchase order).
          </p>
          <TrainingEnrollmentForm
            profile={profile}
            variant={variant}
            submitting={submitting}
            onSubmit={submitEnrollment}
            cancelHref={`/training/sessions/${sessionId}`}
          />
        </CardContent>
      </Card>
    </div>
  )
}

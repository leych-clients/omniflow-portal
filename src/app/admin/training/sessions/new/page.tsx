'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fetchWithAdminAuth } from '@/lib/admin-fetch'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  DEFAULT_TRAINING_TIMEZONE,
  trainingTimezoneSelectOptions,
} from '@/lib/training-timezones'
import {
  TrainingSessionDaysEditor,
  type DraftDay,
} from '@/components/admin/training-session-days-editor'

const DAY_SHIFT_MS = 7 * 24 * 60 * 60 * 1000

function duplicateStatus(source: string): string {
  if (source === 'full') return 'open'
  if (source === 'cancelled' || source === 'closed') return 'draft'
  return source
}

function defaultDraftDay(): DraftDay {
  const today = new Date(Date.now() + DAY_SHIFT_MS)
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return { day_date: `${yyyy}-${mm}-${dd}`, start_time: '09:00', end_time: '15:00', label: '' }
}

function shiftDateString(dateStr: string, ms: number): string {
  const [y, m, d] = dateStr.split('-').map((s) => parseInt(s, 10))
  if (!y || !m || !d) return dateStr
  const dt = new Date(Date.UTC(y, m - 1, d) + ms)
  const yy = dt.getUTCFullYear()
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(dt.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function trimSecondsForInput(time: string | null | undefined): string {
  if (!time) return ''
  const parts = time.split(':')
  return parts.length >= 2 ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}` : time
}

function localInputFromIso(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function NewTrainingSessionPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromSessionId = searchParams.get('from')
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    course_id: '',
    title: '',
    description: '',
    timezone: DEFAULT_TRAINING_TIMEZONE,
    location: '',
    capacity: 12,
    status: 'open',
    waitlist_enabled: true,
    registration_closes_at: '',
  })
  const [days, setDays] = useState<DraftDay[]>(() => [defaultDraftDay()])

  useEffect(() => {
    fetchWithAdminAuth('/api/courses')
      .then((r) => r.json())
      .then((d) => setCourses(Array.isArray(d) ? d.map((c: { id: string; title: string }) => ({ id: c.id, title: c.title })) : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!fromSessionId) return
    let cancelled = false
    fetchWithAdminAuth(`/api/admin/training/sessions/${fromSessionId}`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Failed')
        if (cancelled) return

        setForm({
          course_id: (data.course_id as string | null) ? String(data.course_id) : '',
          title: (data.title as string | null) ?? '',
          description: (data.description as string | null) ?? '',
          timezone: (data.timezone as string) || DEFAULT_TRAINING_TIMEZONE,
          location: (data.location as string) ?? '',
          capacity: Math.max(1, Number(data.capacity) || 12),
          status: duplicateStatus(String(data.status)),
          waitlist_enabled: Boolean(data.waitlist_enabled),
          registration_closes_at: data.registration_closes_at
            ? localInputFromIso(
                new Date(new Date(data.registration_closes_at as string).getTime() + DAY_SHIFT_MS).toISOString()
              )
            : '',
        })

        const incoming = Array.isArray(data.days) ? data.days : []
        const shifted: DraftDay[] = incoming.length
          ? incoming.map((d: { day_date: string; start_time: string; end_time: string; label?: string | null }) => ({
              day_date: shiftDateString(d.day_date, DAY_SHIFT_MS),
              start_time: trimSecondsForInput(d.start_time),
              end_time: trimSecondsForInput(d.end_time),
              label: d.label ?? '',
            }))
          : [defaultDraftDay()]
        setDays(shifted)
        toast.success('Duplicated — dates moved forward one week. Review and create.')
      })
      .catch(() => toast.error('Could not load class to duplicate'))
    return () => {
      cancelled = true
    }
  }, [fromSessionId])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (days.length === 0) {
      toast.error('Add at least one class day.')
      return
    }
    setSaving(true)
    try {
      const closes = form.registration_closes_at.trim()
        ? new Date(form.registration_closes_at).toISOString()
        : null
      const res = await fetchWithAdminAuth('/api/admin/training/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: form.course_id || null,
          title: form.title || null,
          description: form.description || null,
          timezone: form.timezone,
          location: form.location,
          capacity: Number(form.capacity),
          status: form.status,
          waitlist_enabled: form.waitlist_enabled,
          registration_closes_at: closes,
          days: days.map((d) => ({
            day_date: d.day_date,
            start_time: d.start_time,
            end_time: d.end_time,
            label: d.label?.trim() || null,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Class created')
      router.push('/admin/training/sessions')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6 pb-20 md:pb-0">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href="/admin/training/sessions">
          <ArrowLeft className="h-4 w-4" />
          Sessions
        </Link>
      </Button>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        New scheduled class
        {fromSessionId && (
          <span className="block text-sm font-normal text-zinc-500 mt-1">Copying from another class — dates shifted by one week</span>
        )}
      </h1>
      <form onSubmit={submit} className="space-y-5 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-6 bg-white dark:bg-[#141414]">
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Course (optional)</label>
          <select
            className="mt-1 w-full h-10 rounded-lg border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#141414] px-3 text-sm"
            value={form.course_id}
            onChange={(e) => setForm((f) => ({ ...f, course_id: e.target.value }))}
          >
            <option value="">— None —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Title override (optional)</label>
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
          <textarea
            className="mt-1 w-full min-h-[100px] rounded-lg border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#141414] px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Timezone</label>
          <select
            className="mt-1 w-full h-10 rounded-lg border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#141414] px-3 text-sm"
            value={form.timezone}
            onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
          >
            {trainingTimezoneSelectOptions(form.timezone).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            All class times below are interpreted in this timezone.
          </p>
        </div>

        <TrainingSessionDaysEditor days={days} timezone={form.timezone} onChange={setDays} />

        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Location</label>
          <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Capacity</label>
            <Input
              type="number"
              min={1}
              required
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</label>
            <select
              className="mt-1 w-full h-10 rounded-lg border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#141414] px-3 text-sm"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="draft">draft</option>
              <option value="open">open</option>
              <option value="full">full</option>
              <option value="closed">closed</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Signup closes (browser local, optional)</label>
          <Input
            type="datetime-local"
            value={form.registration_closes_at}
            onChange={(e) => setForm((f) => ({ ...f, registration_closes_at: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.waitlist_enabled}
              onChange={(e) => setForm((f) => ({ ...f, waitlist_enabled: e.target.checked }))}
            />
            Waitlist enabled
          </label>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            The waitlist allows signup when the class is Open or Full. It has no effect when the class is Closed or
            Cancelled.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/training/sessions">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NewTrainingSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl space-y-6 pb-20 md:pb-0">
          <p className="text-sm text-zinc-500">Loading…</p>
        </div>
      }
    >
      <NewTrainingSessionPageInner />
    </Suspense>
  )
}

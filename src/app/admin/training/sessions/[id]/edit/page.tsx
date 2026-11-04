'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fetchWithAdminAuth } from '@/lib/admin-fetch'
import { ArrowLeft, Loader2, Trash2, Download, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import {
  DEFAULT_TRAINING_TIMEZONE,
  trainingTimezoneSelectOptions,
} from '@/lib/training-timezones'
import {
  TrainingSessionDaysEditor,
  type DraftDay,
} from '@/components/admin/training-session-days-editor'
import {
  RosterAccountDetails,
  RosterAttendeeDetails,
  RosterStatusBadge,
} from '@/components/admin/training-roster-cells'
import { compareAttendeeToAccount, hasSignupDetails, rosterStatusInfo } from '@/lib/training-roster-attendee'

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function trimSecondsForInput(time: string | null | undefined): string {
  if (!time) return ''
  const parts = time.split(':')
  return parts.length >= 2 ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}` : time
}

type AttendanceStatus = 'scheduled' | 'confirmed'

interface RegRow {
  id: string
  user_id: string
  status: string
  waitlist_position: number | null
  attendance_status?: string | null
  created_at: string
  certificate_company_name?: string | null
  work_title?: string | null
  first_name?: string | null
  last_name?: string | null
  company_address?: string | null
  city?: string | null
  state_province?: string | null
  postal_code?: string | null
  country?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  food_restrictions?: string | null
  user: { email: string; name: string | null }
}

function rosterAttendance(r: RegRow): AttendanceStatus {
  return r.attendance_status === 'confirmed' ? 'confirmed' : 'scheduled'
}

interface UserSearchRow {
  id: string
  email: string
  name?: string | null
  first_name?: string | null
  last_name?: string | null
}

export default function EditTrainingSessionPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === 'string' ? params.id : ''
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regs, setRegs] = useState<RegRow[]>([])
  const [regsLoading, setRegsLoading] = useState(true)
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
  const [days, setDays] = useState<DraftDay[]>([])
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState<UserSearchRow[]>([])
  const [userSearchLoading, setUserSearchLoading] = useState(false)
  const [addingUserId, setAddingUserId] = useState<string | null>(null)
  const [attendanceSavingId, setAttendanceSavingId] = useState<string | null>(null)

  const rosterUserIds = useMemo(() => new Set(regs.map((r) => r.user_id)), [regs])

  const loadRegs = useCallback(async () => {
    if (!id) return
    setRegsLoading(true)
    try {
      const res = await fetchWithAdminAuth(`/api/admin/training/sessions/${id}/registrations`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (res.ok) {
        setRegs(data.items ?? [])
      } else {
        toast.error(typeof data.error === 'string' ? data.error : 'Failed to load roster')
      }
    } catch {
      toast.error('Failed to load roster')
    } finally {
      setRegsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchWithAdminAuth('/api/courses')
      .then((r) => r.json())
      .then((d) => setCourses(Array.isArray(d) ? d.map((c: { id: string; title: string }) => ({ id: c.id, title: c.title })) : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetchWithAdminAuth(`/api/admin/training/sessions/${id}`)
        const row = await res.json()
        if (!res.ok) throw new Error(row.error || 'Not found')
        if (cancelled) return
        setForm({
          course_id: (row.course_id as string) || '',
          title: (row.title as string) || '',
          description: (row.description as string) || '',
          timezone: (row.timezone as string) || DEFAULT_TRAINING_TIMEZONE,
          location: (row.location as string) || '',
          capacity: row.capacity as number,
          status: row.status as string,
          waitlist_enabled: !!row.waitlist_enabled,
          registration_closes_at: toLocalInput(row.registration_closes_at as string),
        })
        const incomingDays = Array.isArray(row.days) ? row.days : []
        setDays(
          incomingDays.map(
            (d: { day_date: string; start_time: string; end_time: string; label?: string | null }) => ({
              day_date: d.day_date,
              start_time: trimSecondsForInput(d.start_time),
              end_time: trimSecondsForInput(d.end_time),
              label: d.label ?? '',
            })
          )
        )
      } catch {
        if (!cancelled) toast.error('Failed to load session')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    loadRegs()
  }, [loadRegs])

  useEffect(() => {
    const q = userQuery.trim()
    if (q.length < 2) {
      setUserResults([])
      return
    }
    const t = setTimeout(() => {
      void (async () => {
        setUserSearchLoading(true)
        try {
          const res = await fetchWithAdminAuth(`/api/users?q=${encodeURIComponent(q)}&limit=12`)
          const data = await res.json()
          setUserResults(res.ok && Array.isArray(data.users) ? data.users : [])
        } catch {
          setUserResults([])
        } finally {
          setUserSearchLoading(false)
        }
      })()
    }, 300)
    return () => clearTimeout(t)
  }, [userQuery])

  const displayUserLabel = (u: UserSearchRow) => {
    const n =
      (u.name && String(u.name).trim()) ||
      [u.first_name, u.last_name].filter(Boolean).join(' ').trim() ||
      null
    return n ? `${n} · ${u.email}` : u.email
  }

  const addUserToSession = async (userId: string) => {
    if (!id) return
    setAddingUserId(userId)
    try {
      const res = await fetchWithAdminAuth(`/api/admin/training/sessions/${id}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add')
      toast.success(data.status === 'waitlisted' ? 'Added to waitlist' : 'Added to roster')
      setUserQuery('')
      setUserResults([])
      await loadRegs()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setAddingUserId(null)
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    if (days.length === 0) {
      toast.error('Add at least one class day.')
      return
    }
    setSaving(true)
    try {
      const closes = form.registration_closes_at.trim()
        ? new Date(form.registration_closes_at).toISOString()
        : null
      const res = await fetchWithAdminAuth(`/api/admin/training/sessions/${id}`, {
        method: 'PATCH',
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
      toast.success('Saved')
      loadRegs()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const removeReg = async (regId: string) => {
    if (!id || !confirm('Remove this person from the class or waitlist?')) return
    try {
      const res = await fetchWithAdminAuth(`/api/admin/training/sessions/${id}/registrations/${regId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Removed')
      loadRegs()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  const setAttendance = async (regId: string, attendance_status: AttendanceStatus) => {
    if (!id) return
    setAttendanceSavingId(regId)
    try {
      const res = await fetchWithAdminAuth(`/api/admin/training/sessions/${id}/registrations/${regId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setRegs((prev) =>
        prev.map((r) => (r.id === regId ? { ...r, attendance_status: data.attendance_status ?? attendance_status } : r))
      )
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed')
      loadRegs()
    } finally {
      setAttendanceSavingId(null)
    }
  }

  const exportCsv = () => {
    const esc = (s: string | null | undefined) => `"${(s ?? '').replace(/"/g, '""')}"`
    const lines = [
      [
        'status',
        'attendance',
        'account_email',
        'account_name',
        'waitlist_position',
        'certificate_company',
        'work_title',
        'attendee_first_name',
        'attendee_last_name',
        'company_address',
        'city',
        'state_province',
        'postal_code',
        'country',
        'attendee_email',
        'attendee_phone',
        'food_restrictions',
        'attendee_differs_from_account',
        'created_at',
      ].join(','),
      ...regs.map((r) =>
        [
          rosterStatusInfo(r.status, r.waitlist_position).label,
          rosterAttendance(r),
          esc(r.user.email),
          esc(r.user.name),
          r.waitlist_position ?? '',
          esc(r.certificate_company_name),
          esc(r.work_title),
          esc(r.first_name),
          esc(r.last_name),
          esc(r.company_address),
          esc(r.city),
          esc(r.state_province),
          esc(r.postal_code),
          esc(r.country),
          esc(r.contact_email),
          esc(r.contact_phone),
          esc(r.food_restrictions),
          hasSignupDetails(r) ? (compareAttendeeToAccount(r, r.user).differs ? 'yes' : 'no') : '',
          r.created_at,
        ].join(',')
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `training-roster-${id.slice(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-zinc-500 py-12">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-8 pb-20 md:pb-0">
      <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2">
        <Link href="/admin/training/sessions">
          <ArrowLeft className="h-4 w-4" />
          Sessions
        </Link>
      </Button>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Edit class</h1>

      <form onSubmit={save} className="space-y-4 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-6 bg-white dark:bg-[#141414]">
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Course</label>
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
          <label className="text-sm font-medium">Title override</label>
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea
            className="mt-1 w-full min-h-[100px] rounded-lg border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#141414] px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Timezone</label>
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
          <label className="text-sm font-medium">Location</label>
          <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Capacity</label>
            <Input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
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
          <label className="text-sm font-medium">Signup closes</label>
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
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
          </Button>
        </div>
      </form>

      <div className="border border-zinc-200 dark:border-white/[0.08] rounded-xl p-6 bg-white dark:bg-[#141414]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Roster</h2>
          <Button type="button" variant="outline" size="sm" onClick={exportCsv} disabled={regs.length === 0} className="gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>

        <div className="mb-6 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/80 dark:bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">
            <UserPlus className="h-4 w-4" />
            Add portal member
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
            Search existing accounts (they must already appear under Admin → Users). They are added like a portal signup and receive the same confirmation email. Attendance (scheduled vs confirmed) tracks commitment and is separate from roster vs waitlist.
          </p>
          <div className="relative max-w-lg">
            <Input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Type name or email (min 2 characters)…"
              className="h-10"
            />
            {userSearchLoading && (
              <p className="text-xs text-zinc-500 mt-1">Searching…</p>
            )}
            {userResults.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#1c1c1c] py-1 shadow-lg text-sm">
                {userResults.map((u) => {
                  const onRoster = rosterUserIds.has(u.id)
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        disabled={!!onRoster || addingUserId === u.id}
                        onClick={() => addUserToSession(u.id)}
                        className="flex w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-white/[0.06] disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <span className="truncate">{displayUserLabel(u)}</span>
                        {onRoster && <span className="ml-2 shrink-0 text-xs text-zinc-500">Already on roster</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {regsLoading ? (
          <p className="text-sm text-zinc-500">Loading roster…</p>
        ) : regs.length === 0 ? (
          <p className="text-sm text-zinc-500">No one on the roster yet.</p>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {regs.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-white/[0.03] p-4 space-y-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <RosterStatusBadge status={r.status} waitlistPosition={r.waitlist_position} />
                  </div>
                  <RosterAttendeeDetails registration={r} account={r.user} />
                  <RosterAccountDetails account={r.user} />
                  <div>
                    <label htmlFor={`attendance-${r.id}`} className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Attendance
                    </label>
                    <select
                      id={`attendance-${r.id}`}
                      className="mt-1 w-full max-w-xs h-9 rounded-lg border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#141414] px-2 text-sm"
                      value={rosterAttendance(r)}
                      disabled={attendanceSavingId === r.id}
                      onChange={(e) =>
                        setAttendance(r.id, e.target.value === 'confirmed' ? 'confirmed' : 'scheduled')
                      }
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="confirmed">Confirmed</option>
                    </select>
                  </div>
                  <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-white/[0.06]">
                    <Button type="button" variant="ghost" size="icon" className="text-rose-600" onClick={() => removeReg(r.id)} title="Remove">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/[0.06] text-left text-zinc-600 dark:text-zinc-400">
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-3 whitespace-nowrap">Attendance</th>
                  <th className="py-2 pr-3">Attendee</th>
                  <th className="py-2 pr-2">Account</th>
                  <th className="py-2 w-20" />
                </tr>
              </thead>
              <tbody>
                {regs.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100 dark:border-white/[0.04]">
                    <td className="py-2 pr-2 align-top">
                      <RosterStatusBadge status={r.status} waitlistPosition={r.waitlist_position} />
                    </td>
                    <td className="py-2 pr-3 align-top">
                      <select
                        className="h-8 max-w-[10.5rem] rounded-lg border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#141414] px-2 text-xs"
                        value={rosterAttendance(r)}
                        disabled={attendanceSavingId === r.id}
                        aria-label={`Attendance for ${r.user.email}`}
                        onChange={(e) =>
                          setAttendance(r.id, e.target.value === 'confirmed' ? 'confirmed' : 'scheduled')
                        }
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="confirmed">Confirmed</option>
                      </select>
                    </td>
                    <td className="py-2 pr-3 align-top">
                      <RosterAttendeeDetails registration={r} account={r.user} showLabel={false} />
                    </td>
                    <td className="py-2 pr-2 align-top">
                      <RosterAccountDetails account={r.user} showLabel={false} />
                    </td>
                    <td className="py-2 text-right align-middle">
                      <Button type="button" variant="ghost" size="icon" className="text-rose-600" onClick={() => removeReg(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <div className="border-t border-zinc-200 dark:border-white/[0.08] pt-6">
        <Button
          type="button"
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/30"
          onClick={async () => {
            if (!confirm('Delete this session permanently?')) return
            const res = await fetchWithAdminAuth(`/api/admin/training/sessions/${id}`, { method: 'DELETE' })
            if (res.ok) {
              toast.success('Deleted')
              router.push('/admin/training/sessions')
            } else toast.error('Failed to delete')
          }}
        >
          Delete session
        </Button>
      </div>
    </div>
  )
}

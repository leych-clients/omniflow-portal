'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminAddModalLayout } from '@/components/admin/admin-add-modal-layout'
import { RichTextEditor } from '@/components/admin/rich-text-editor'
import { fetchWithAdminAuth } from '@/lib/admin-fetch'
import { Loader2, XCircle, Pencil } from 'lucide-react'
import type { JobOpening } from '@/app/admin/_components/admin-types'

interface EditJobModalProps {
  open: boolean
  jobId: string | null
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return ''
  return value.length >= 10 ? value.slice(0, 10) : value
}

export function EditJobModal({ open, jobId, onOpenChange, onSuccess }: EditJobModalProps) {
  const [form, setForm] = useState<JobOpening | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !jobId) {
      setForm(null)
      setLoadError('')
      setError('')
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError('')
    ;(async () => {
      try {
        const res = await fetchWithAdminAuth(`/api/jobs/${jobId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load job')
        if (!cancelled) {
          setForm({
            ...data,
            posted_at: toDateInput(data.posted_at),
          })
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, jobId])

  const handleClose = () => {
    if (!saving) onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (!form || !form.title.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetchWithAdminAuth(`/api/jobs/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          slug: form.slug,
          department: form.department,
          location: form.location,
          employment_type: form.employment_type,
          summary: form.summary,
          description: form.description,
          apply_email: form.apply_email,
          status: form.status,
          posted_at: form.posted_at || null,
          sort_order: form.sort_order,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update job')
      toast.success('Job updated')
      onSuccess?.()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!open || !jobId) return null

  return (
    <AdminAddModalLayout maxWidth="lg" onBackdropClick={handleClose}>
      <AnimatePresence mode="wait">
        <motion.div
          key={jobId}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="w-full min-w-0 p-6 sm:p-8"
        >
          <div className="border-b border-zinc-200 pb-5 dark:border-white/[0.08]">
            <h2 className="flex items-center gap-3 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-md shadow-blue-500/25">
                <Pencil className="h-5 w-5 text-white" />
              </span>
              Edit job opening
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Update listing details and publish status
            </p>
          </div>

          <div className="max-h-[min(85vh,880px)] w-full min-w-0 space-y-4 overflow-y-auto pt-6 pr-1">
            {loading && (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <Loader2 className="h-9 w-9 animate-spin text-blue-500" />
                <p className="text-sm text-zinc-500">Loading…</p>
              </div>
            )}

            {!loading && loadError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {loadError}
                </div>
                <Button variant="outline" className="mt-3" onClick={handleClose}>
                  Close
                </Button>
              </div>
            )}

            {!loading && form && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium">Title *</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="h-11"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Slug</label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="h-11"
                    disabled={saving}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Department</label>
                    <Input
                      value={form.department ?? ''}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      className="h-11"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Location</label>
                    <Input
                      value={form.location ?? ''}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      className="h-11"
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Employment type</label>
                    <select
                      className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-white/[0.12] dark:bg-white/[0.04]"
                      value={form.employment_type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          employment_type: e.target.value as JobOpening['employment_type'],
                        })
                      }
                      disabled={saving}
                    >
                      <option value="full_time">Full-time</option>
                      <option value="part_time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Status</label>
                    <select
                      className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-white/[0.12] dark:bg-white/[0.04]"
                      value={form.status}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          status: e.target.value as JobOpening['status'],
                        })
                      }
                      disabled={saving}
                    >
                      <option value="open">Open</option>
                      <option value="draft">Draft</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Summary</label>
                  <textarea
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/[0.12] dark:bg-white/[0.04]"
                    rows={2}
                    value={form.summary ?? ''}
                    onChange={(e) => setForm({ ...form, summary: e.target.value })}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Description</label>
                  <RichTextEditor
                    key={`edit-job-${form.id}-description`}
                    initialContent={form.description ?? ''}
                    onChange={(html) =>
                      setForm((f) => (f ? { ...f, description: html } : f))
                    }
                    disabled={saving}
                    placeholder="Role overview, responsibilities, requirements…"
                    aria-label="Description"
                    minHeight="200px"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Apply email override</label>
                    <Input
                      type="email"
                      value={form.apply_email ?? ''}
                      onChange={(e) => setForm({ ...form, apply_email: e.target.value })}
                      className="h-11"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Posted date</label>
                    <Input
                      type="date"
                      value={form.posted_at ?? ''}
                      onChange={(e) => setForm({ ...form, posted_at: e.target.value })}
                      className="h-11"
                      disabled={saving}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Sort order</label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })
                    }
                    className="h-11 w-32"
                    disabled={saving}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <XCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-white/[0.08]">
                  <Button variant="outline" onClick={handleClose} disabled={saving}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                      </>
                    ) : (
                      'Save changes'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </AdminAddModalLayout>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminAddModalLayout } from '@/components/admin/admin-add-modal-layout'
import { RichTextEditor } from '@/components/admin/rich-text-editor'
import { fetchWithAdminAuth } from '@/lib/admin-fetch'
import { Plus, Loader2, XCircle } from 'lucide-react'

interface AddJobModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const emptyForm = {
  title: '',
  slug: '',
  department: '',
  location: '',
  employment_type: 'full_time',
  summary: '',
  description: '',
  apply_email: '',
  status: 'open',
  posted_at: new Date().toISOString().slice(0, 10),
  sort_order: '0',
}

export function AddJobModal({ open, onOpenChange, onSuccess }: AddJobModalProps) {
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false)
      setForm(emptyForm)
      setError('')
    }
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetchWithAdminAuth('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          slug: form.slug.trim() || undefined,
          department: form.department.trim() || null,
          location: form.location.trim() || null,
          employment_type: form.employment_type,
          summary: form.summary.trim() || null,
          description: form.description.trim() || null,
          apply_email: form.apply_email.trim() || null,
          status: form.status,
          posted_at: form.posted_at || null,
          sort_order: parseInt(form.sort_order, 10) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create job')
      onSuccess?.()
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <AdminAddModalLayout maxWidth="lg" onBackdropClick={handleClose}>
      <div className="p-6">
        <div className="border-b border-zinc-200 dark:border-white/[0.08] pb-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Plus className="h-5 w-5 text-white" />
            </div>
            Add Job Opening
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
            Published openings appear on omniflow.com/careers
          </p>
        </div>

        <div className="max-h-[min(75vh,720px)] space-y-4 overflow-y-auto pt-6 pr-1">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Title *
            </label>
            <Input
              placeholder="e.g. Firmware Engineer"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="h-11"
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Slug
            </label>
            <Input
              placeholder="auto from title if empty"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              className="h-11"
              disabled={loading}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Department
              </label>
              <Input
                placeholder="Engineering"
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className="h-11"
                disabled={loading}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Location
              </label>
              <Input
                placeholder="Sugar Land, TX"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="h-11"
                disabled={loading}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Employment type
              </label>
              <select
                className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-white/[0.12] dark:bg-white/[0.04]"
                value={form.employment_type}
                onChange={(e) => setForm((f) => ({ ...f, employment_type: e.target.value }))}
                disabled={loading}
              >
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Status
              </label>
              <select
                className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-white/[0.12] dark:bg-white/[0.04]"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                disabled={loading}
              >
                <option value="open">Open</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Summary
            </label>
            <textarea
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/[0.12] dark:bg-white/[0.04]"
              rows={2}
              placeholder="Short card blurb"
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Description
            </label>
            <RichTextEditor
              key="create-job-description"
              initialContent={form.description}
              onChange={(html) => setForm((f) => ({ ...f, description: html }))}
              disabled={loading}
              placeholder="Role overview, responsibilities, requirements…"
              aria-label="Description"
              minHeight="200px"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Apply email override
              </label>
              <Input
                type="email"
                placeholder="Leave blank for careers@omniflow.com"
                value={form.apply_email}
                onChange={(e) => setForm((f) => ({ ...f, apply_email: e.target.value }))}
                className="h-11"
                disabled={loading}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Posted date
              </label>
              <Input
                type="date"
                value={form.posted_at}
                onChange={(e) => setForm((f) => ({ ...f, posted_at: e.target.value }))}
                className="h-11"
                disabled={loading}
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Sort order
            </label>
            <Input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
              className="h-11 w-32"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-white/[0.08]">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                'Create'
              )}
            </Button>
          </div>
        </div>
      </div>
    </AdminAddModalLayout>
  )
}

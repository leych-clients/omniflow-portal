'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TagMultiSelect } from '@/components/ui/tag-multi-select'
import { AdminAddModalLayout } from '@/components/admin/admin-add-modal-layout'
import { fetchWithAdminAuth } from '@/lib/admin-fetch'
import { uploadFileViaPresign } from '@/lib/upload-file-direct'
import { Upload, Loader2, XCircle } from 'lucide-react'

interface AddManualModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddManualModal({ open, onOpenChange, onSuccess }: AddManualModalProps) {
  const [form, setForm] = useState({ title: '', tags: [] as string[], description: '' })
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadPercent, setUploadPercent] = useState<number | null>(null)
  const [error, setError] = useState('')

  const fetchAvailableTags = async () => {
    try {
      const res = await fetch('/api/tags', { credentials: 'include' })
      const tags = res.ok ? await res.json() : []
      setAvailableTags(
        (Array.isArray(tags) ? tags : [])
          .map((t: { id: string; name: string }) => t.name)
          .sort((a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase()))
      )
    } catch {
      setAvailableTags([])
    }
  }

  useEffect(() => {
    if (open) fetchAvailableTags()
  }, [open])

  const handleDeleteTagFromPool = async (tag: string) => {
    const res = await fetchWithAdminAuth('/api/manuals/tags/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag }),
    })
    if (!res.ok) throw new Error('Failed to delete tag')
    await fetchAvailableTags()
  }

  const handleClose = () => {
    if (!loading) onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }
    if (!file) {
      setError('PDF file is required')
      return
    }
    setLoading(true)
    setUploadPercent(50)
    setError('')
    try {
      const folder = form.tags[0] ? form.tags[0].replace(/[^a-zA-Z0-9_-]/g, '_') : 'uncategorized'
      const { path, filename, size } = await uploadFileViaPresign(
        '/api/manuals/upload-url',
        async () => ({}),
        { filename: file.name, folder, fileSize: file.size },
        file
      )
      setUploadPercent(90)
      const res = await fetchWithAdminAuth('/api/manuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          tags: form.tags,
          description: form.description || null,
          filename,
          storage_path: path,
          size,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to upload document')
      toast.success('Document uploaded')
      onSuccess?.()
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setLoading(false)
      setUploadPercent(null)
    }
  }

  if (!open) return null

  return (
    <AdminAddModalLayout maxWidth="xl" onBackdropClick={handleClose}>
      <div className="p-6">
        <div className="border-b border-zinc-200 dark:border-white/[0.08] pb-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Upload className="h-5 w-5 text-white" />
            </div>
            Add Document
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">Upload a PDF document (max 1 GB)</p>
        </div>

        <div className="space-y-6 pt-6">
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">Title</label>
            <Input placeholder="User Manual Volume 1" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="h-11" disabled={loading} />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">Tags</label>
            <TagMultiSelect
              value={form.tags}
              onChange={(tags) => setForm((f) => ({ ...f, tags }))}
              availableTags={availableTags}
              placeholder="e.g. OMNI-3000-6000, Installation, User Guide"
              disabled={loading}
              onDeleteFromPool={handleDeleteTagFromPool}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">Description</label>
            <textarea className="w-full px-3 py-2 border border-zinc-200 dark:border-white/[0.12] rounded-lg bg-white dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" rows={2} placeholder="Brief description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} disabled={loading} />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">PDF File</label>
            <div className="border-2 border-dashed border-zinc-200 dark:border-white/[0.12] rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
              <input type="file" accept=".pdf,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" id="manual-file" />
              <label htmlFor="manual-file" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-zinc-400 dark:text-zinc-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{file ? file.name : 'Click to select PDF'}</span>
              </label>
            </div>
          </div>
          {loading && uploadPercent != null && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                <span>{uploadPercent >= 90 ? 'Saving...' : 'Uploading...'}</span>
                <span>{uploadPercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-white/[0.08] overflow-hidden">
                <div className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300" style={{ width: `${uploadPercent}%` }} />
              </div>
            </div>
          )}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-white/[0.08]">
            <Button variant="outline" onClick={handleClose} disabled={loading} className="border-zinc-200 dark:border-white/[0.12] hover:bg-zinc-100 dark:hover:bg-white/[0.06]">Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : 'Upload'}
            </Button>
          </div>
        </div>
      </div>
    </AdminAddModalLayout>
  )
}

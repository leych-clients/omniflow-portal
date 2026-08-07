'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdminAddModalLayout } from '@/components/admin/admin-add-modal-layout'
import { FileDropzone } from '@/app/admin/software/add/_components/file-dropzone'
import { ImageUploadCard } from '@/app/admin/software/add/_components/image-upload-card'
import { fetchWithAdminAuth } from '@/lib/admin-fetch'
import { supabase } from '@/lib/supabase'
import { uploadFileViaPresign } from '@/lib/upload-file-direct'
import { Upload, Loader2, XCircle } from 'lucide-react'

const MAX_ZIP_BYTES = 1024 * 1024 * 1024

interface AddSoftwareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

async function parseJsonResponse(res: Response): Promise<{ error?: string } & Record<string, unknown>> {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as { error?: string } & Record<string, unknown>
  } catch {
    throw new Error(
      res.ok
        ? 'Server returned an unexpected response'
        : `Upload failed (${res.status}). The file may be too large for the server path — please try again.`
    )
  }
}

export function AddSoftwareModal({ open, onOpenChange, onSuccess }: AddSoftwareModalProps) {
  const [form, setForm] = useState({ title: '', description: '', imageUrl: '' })
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => {
    if (!loading) onOpenChange(false)
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }
    if (!zipFile) {
      setError('ZIP file is required')
      return
    }

    setLoading(true)
    try {
      const getHeaders = async (): Promise<Record<string, string>> => {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : ({} as Record<string, string>)
      }

      // Direct-to-storage upload (avoids Vercel/Next body size limits on multipart)
      const { path, filename, size } = await uploadFileViaPresign(
        '/api/software/upload-url',
        getHeaders,
        { filename: zipFile.name, fileSize: zipFile.size },
        zipFile
      )

      const res = await fetchWithAdminAuth('/api/software', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          image_url: form.imageUrl.trim() || null,
          filename,
          storage_path: path,
          size,
        }),
      })

      const data = await parseJsonResponse(res)
      if (!res.ok) throw new Error(data.error || 'Failed to save software')

      toast.success('Software added')
      setForm({ title: '', description: '', imageUrl: '' })
      setZipFile(null)
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
    <AdminAddModalLayout maxWidth="xl" onBackdropClick={handleClose}>
      <div className="p-6">
        <div className="border-b border-zinc-200 dark:border-white/[0.08] pb-4">
          <h2 className="flex items-center gap-3 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            <div className="p-2.5 bg-blue-600 rounded-xl">
              <Upload className="h-6 w-6 text-white" />
            </div>
            Add Software
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">Upload a ZIP file and add a preview image. Max 1 GB per file.</p>
        </div>

        <div className="pt-6 space-y-6">
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">Title *</label>
            <Input placeholder="e.g. OMNI-3000 Software v2.1" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} disabled={loading} className="h-11" />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">Description</label>
            <textarea className="w-full px-3 py-2.5 border border-zinc-200 dark:border-white/[0.12] rounded-lg bg-white dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none" rows={3} placeholder="Brief description of the software..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} disabled={loading} />
          </div>
          <ImageUploadCard value={form.imageUrl} onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))} disabled={loading} />
          <FileDropzone accept=".zip,application/zip,application/x-zip-compressed" maxSizeBytes={MAX_ZIP_BYTES} label="ZIP File *" hint="Software package. Max 1 GB." value={zipFile} onChange={setZipFile} disabled={loading} />
          {loading && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Uploading and saving...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-white/[0.08]">
            <Button variant="outline" onClick={handleClose} disabled={loading} className="border-zinc-200 dark:border-white/[0.12] hover:bg-zinc-100 dark:hover:bg-white/[0.06]">Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading || !form.title.trim() || !zipFile} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : 'Add Software'}
            </Button>
          </div>
        </div>
      </div>
    </AdminAddModalLayout>
  )
}

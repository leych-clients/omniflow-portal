'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { CardSkeleton } from '@/components/ui/card-skeleton'
import { DashboardSkeleton } from '@/components/ui/dashboard-skeleton'
import { SearchBarSkeleton } from '@/components/ui/search-bar-skeleton'
import { fetchWithAdminAuth } from '@/lib/admin-fetch'
import { AdminCardGrid, AdminCard } from '@/components/admin/admin-card-grid'
import { AdminPageDashboard } from '@/components/admin/admin-page-dashboard'
import { AddJobModal } from '@/components/admin/add-job-modal'
import { EditJobModal } from '@/components/admin/edit-job-modal'
import { JobCardActions } from '@/components/admin/job-card-actions'
import { Plus, Search, Briefcase, XCircle, ExternalLink } from 'lucide-react'
import {
  type JobOpening,
  employmentTypeLabel,
  formatDate,
  getStatusColor,
} from '../_components/admin-types'

function AdminCareersPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [jobs, setJobs] = useState<JobOpening[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<JobOpening | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editJobId, setEditJobId] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchWithAdminAuth('/api/jobs')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load jobs')
      setJobs(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  useEffect(() => {
    const fromQuery = searchParams.get('edit')
    if (fromQuery) {
      setEditJobId(fromQuery)
      router.replace('/admin/careers', { scroll: false })
    }
  }, [searchParams, router])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetchWithAdminAuth(`/api/jobs/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete')
      await fetchJobs()
      toast.success('Job deleted')
      setDeleteTarget(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setDeleteLoading(false)
    }
  }

  const filtered = jobs.filter((j) => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (
      j.title.toLowerCase().includes(q) ||
      (j.department || '').toLowerCase().includes(q) ||
      (j.location || '').toLowerCase().includes(q) ||
      (j.summary || '').toLowerCase().includes(q)
    )
  })

  const openCount = jobs.filter((j) => j.status === 'open').length
  const draftCount = jobs.filter((j) => j.status === 'draft').length
  const dashboardStats = [
    {
      label: 'Openings',
      value: searchTerm ? `${filtered.length} of ${jobs.length}` : jobs.length,
    },
    { label: 'Open', value: openCount },
    { label: 'Draft', value: draftCount },
  ]

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {loading ? (
        <DashboardSkeleton statCount={3} />
      ) : !error ? (
        <AdminPageDashboard
          title="Careers"
          description="Job openings published on omniflow.com"
          icon={<Briefcase className="h-6 w-6" />}
          stats={dashboardStats}
          accent="careers"
        />
      ) : null}

      {loading ? (
        <SearchBarSkeleton />
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <Button
            onClick={() => setAddModalOpen(true)}
            className="gap-2 shrink-0 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Job
          </Button>
        </div>
      )}

      {loading ? (
        <CardSkeleton count={4} />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-3 text-red-700">
            <XCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-16 text-center shadow-sm dark:border-white/[0.08] dark:bg-[#141414]">
          <Briefcase className="mx-auto mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-500" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {jobs.length === 0
              ? 'No job openings yet. Add one to get started.'
              : 'No matches.'}
          </p>
        </div>
      ) : (
        <AdminCardGrid>
          {filtered.map((job) => (
            <AdminCard key={job.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-slate-900 dark:text-zinc-100">
                      {job.title}
                    </h3>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${getStatusColor(job.status)}`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                    {[job.department, job.location, employmentTypeLabel(job.employment_type)]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {job.summary ? (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-zinc-400">
                      {job.summary}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {job.posted_at ? <span>Posted {formatDate(job.posted_at)}</span> : null}
                    <span className="font-mono text-slate-400">/{job.slug}</span>
                    {job.status === 'open' ? (
                      <a
                        href={`https://www.omniflow.com/careers/${job.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                      >
                        View live <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
                <JobCardActions
                  itemTitle={job.title}
                  onEdit={() => setEditJobId(job.id)}
                  onDelete={() => setDeleteTarget(job)}
                />
              </div>
            </AdminCard>
          ))}
        </AdminCardGrid>
      )}

      <AddJobModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={() => {
          fetchJobs()
          toast.success('Job created')
        }}
      />
      <EditJobModal
        open={!!editJobId}
        jobId={editJobId}
        onOpenChange={(open) => {
          if (!open) setEditJobId(null)
        }}
        onSuccess={fetchJobs}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={deleteTarget?.title ?? ''}
        description="The job opening will be removed permanently. This cannot be undone."
        onConfirm={handleDelete}
        isLoading={deleteLoading}
      />
    </div>
  )
}

export default function AdminCareersPage() {
  return (
    <Suspense fallback={<DashboardSkeleton statCount={3} />}>
      <AdminCareersPageInner />
    </Suspense>
  )
}

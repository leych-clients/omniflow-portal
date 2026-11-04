'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { DashboardSkeleton } from '@/components/ui/dashboard-skeleton'
import { DocumentsSearchBar } from '@/components/portal/documents-search-bar'
import { DataTable } from '@/components/admin/data-table'
import { fetchWithAdminAuth } from '@/lib/admin-fetch'
import { AdminPageDashboard } from '@/components/admin/admin-page-dashboard'
import { getTrainingCoursesColumns } from './_components/training-courses-columns'
import { Plus, GraduationCap, XCircle, CalendarRange, ShieldCheck } from 'lucide-react'
import { type Course } from '../_components/admin-types'
import { stripHtml } from '@/lib/strip-html'

const SEARCH_DEBOUNCE_MS = 300

function AdminTrainingPageInner() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [coursesError, setCoursesError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchCourses = useCallback(async () => {
    setIsFetching(true)
    setCoursesError('')
    try {
      const res = await fetchWithAdminAuth('/api/courses')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load courses')
      setCourses(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
      setCoursesError(e instanceof Error ? e.message : 'Failed to load courses')
    } finally {
      setIsFetching(false)
      setCoursesLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchCourses()
  }, [fetchCourses])

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm(searchInput)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput])

  const handleDeleteCourse = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetchWithAdminAuth(`/api/courses/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete')
      await fetchCourses()
      toast.success('Course deleted')
      setDeleteTarget(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setDeleteLoading(false)
    }
  }

  const filteredCourses = useMemo(
    () =>
      courses.filter((c) => {
        if (!searchTerm) return true
        const q = searchTerm.toLowerCase()
        return (
          c.title.toLowerCase().includes(q) ||
          stripHtml(c.description).toLowerCase().includes(q) ||
          stripHtml(c.topics).toLowerCase().includes(q) ||
          (c.duration || '').toLowerCase().includes(q) ||
          (c.format || '').toLowerCase().includes(q)
        )
      }),
    [courses, searchTerm]
  )

  const featuredCourses = courses.filter((c) => c.featured).length
  const dashboardStats = [
    {
      label: 'Courses',
      value: searchTerm ? `${filteredCourses.length} of ${courses.length}` : courses.length,
    },
    { label: 'Featured', value: featuredCourses },
  ]

  const columns = useMemo(
    () =>
      getTrainingCoursesColumns({
        setDeleteTarget,
      }),
    []
  )

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {coursesLoading ? (
        <DashboardSkeleton statCount={2} />
      ) : !coursesError ? (
        <AdminPageDashboard
          title="Training"
          description="Courses and learning materials"
          icon={<GraduationCap className="h-7 w-7" />}
          stats={dashboardStats}
          accent="training"
        />
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row">
        <DocumentsSearchBar
          value={searchInput}
          onChange={setSearchInput}
          isLoading={isFetching}
          disabled={coursesLoading}
          placeholder="Search courses..."
        />
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="outline" className="h-11 gap-2 rounded-xl">
            <Link href="/admin/training/sessions">
              <CalendarRange className="h-4 w-4" />
              Scheduled classes
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 gap-2 rounded-xl">
            <Link href="/admin/training/certificates">
              <ShieldCheck className="h-4 w-4" />
              Certificates
            </Link>
          </Button>
          <Button
            asChild
            disabled={coursesLoading}
            className="h-11 gap-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25 hover:bg-blue-700"
          >
            <Link href="/admin/training/add">
              <Plus className="h-4 w-4" />
              Add Course
            </Link>
          </Button>
        </div>
      </div>

      {coursesLoading ? (
        <TableSkeleton rowCount={6} colCount={4} />
      ) : coursesError ? (
        <div className="flex items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-6 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/30">
          <div className="rounded-xl bg-rose-100 p-2.5 dark:bg-rose-500/20">
            <XCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
          <span className="text-sm font-medium text-rose-800 dark:text-rose-400">{coursesError}</span>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-16 text-center shadow-sm dark:border-white/[0.08] dark:bg-[#141414]">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/20">
            <GraduationCap className="h-8 w-8 text-blue-500 dark:text-blue-400" />
          </div>
          <p className="mb-2 text-base font-semibold text-slate-700 dark:text-zinc-200">
            {courses.length === 0 ? 'No courses yet' : 'No matches found'}
          </p>
          <p className="mx-auto mb-6 max-w-sm text-sm text-slate-500 dark:text-zinc-400">
            {courses.length === 0
              ? 'Add a course to build your training catalog.'
              : 'Try a different search term.'}
          </p>
          {courses.length === 0 && (
            <Button asChild size="sm" className="rounded-xl bg-blue-600 shadow-md shadow-blue-500/25 hover:bg-blue-700">
              <Link href="/admin/training/add">
                <Plus className="mr-2 h-4 w-4" />
                Add your first course
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <DataTable columns={columns} data={filteredCourses} headerVariant="indigo" />
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget?.title ?? ''}
        description="The course will be removed permanently."
        onConfirm={handleDeleteCourse}
        isLoading={deleteLoading}
      />
    </div>
  )
}

function AdminTrainingFallback() {
  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <DashboardSkeleton statCount={2} />
      <TableSkeleton rowCount={6} colCount={4} />
    </div>
  )
}

export default function AdminTrainingPage() {
  return (
    <Suspense fallback={<AdminTrainingFallback />}>
      <AdminTrainingPageInner />
    </Suspense>
  )
}
